// Minimal Calendly-alternative worker.
//
// Public:
//   GET  /slots?date=YYYY-MM-DD -> free slots (with epoch starts, so pages can
//                                  render them in the visitor's timezone)
//   POST /book                  -> { name, email, date, time, reminderMinutes, note?, tz? }
//   GET  /appt?token=...        -> appointment details (token = auth)
//   POST /cancel                -> { token }
//   POST /reschedule            -> { token, date, time }
// Admin (X-Admin-Password header):
//   GET  /day?date=...          -> every slot with status free/booked/blocked
//   POST /block                 -> { date, time, blocked: true|false }
// Cron (every 15 min): due reminders, 24h + custom minutes before, to guest & me.
//
// KV layout: appt:<date>T<time> -> appointment or {blocked:true}
//            tok:<token>        -> the appt key it manages

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Password',
  'Content-Type': 'application/json',
};

const MANAGE_BASE = 'https://river.berlin/meet/manage';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: CORS });
}

function safeEqual(a, b) {
  const enc = new TextEncoder();
  const ab = enc.encode(a);
  const bb = enc.encode(b);
  if (ab.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < ab.length; i++) diff |= ab[i] ^ bb[i];
  return diff === 0;
}

function isAuthed(request, env) {
  const password = request.headers.get('X-Admin-Password') || '';
  return Boolean(env.ADMIN_PASSWORD) && safeEqual(password, env.ADMIN_PASSWORD);
}

// ---- timezone helpers (DST-safe, uses the runtime's Intl data) ----

function tzOffsetMs(timeZone, date) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  });
  const p = Object.fromEntries(dtf.formatToParts(date).map((x) => [x.type, x.value]));
  const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
  return asUTC - date.getTime();
}

function zonedToUTC(dateStr, timeStr, timeZone) {
  const naive = Date.parse(`${dateStr}T${timeStr}:00Z`);
  let guess = new Date(naive);
  for (let i = 0; i < 2; i++) {
    guess = new Date(naive - tzOffsetMs(timeZone, guess));
  }
  return guess;
}

function validTz(tz) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

function formatInTz(date, timeZone) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
  }).format(date);
}

// when in guest's tz, and in Berlin if that differs
function formatBoth(startMs, guestTz, env) {
  const d = new Date(startMs);
  const guest = formatInTz(d, guestTz || env.TIMEZONE);
  if (!guestTz || guestTz === env.TIMEZONE) return guest;
  return `${guest} (${formatInTz(d, env.TIMEZONE)})`;
}

// ---- availability ----

function daySlots(env, dateStr) {
  const day = new Date(`${dateStr}T12:00:00Z`).getUTCDay();
  if (day === 0 || day === 6) return [];
  const slots = [];
  const step = parseInt(env.SLOT_MINUTES);
  for (let h = parseInt(env.START_HOUR); h < parseInt(env.END_HOUR); h++) {
    for (let m = 0; m < 60; m += step) {
      slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  return slots;
}

function validDate(env, dateStr) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const d = new Date(`${dateStr}T12:00:00Z`);
  if (isNaN(d)) return false;
  const ahead = (d - new Date()) / 86400000;
  return ahead > -1 && ahead <= parseInt(env.MAX_DAYS_AHEAD);
}

async function dayEntries(env, dateStr) {
  const prefix = `appt:${dateStr}T`;
  const list = await env.MEETINGS.list({ prefix });
  const entries = {};
  for (const { name: key } of list.keys) {
    const raw = await env.MEETINGS.get(key);
    if (!raw) continue;
    try {
      entries[key.slice(prefix.length, prefix.length + 5)] = JSON.parse(raw);
    } catch {}
  }
  return entries;
}

// ---- email via Resend ----

async function sendEmail(env, to, subject, text, replyTo) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.FROM_EMAIL,
      to: [to],
      subject,
      text,
      reply_to: [replyTo || env.MY_EMAIL],
    }),
  });
  if (!res.ok) {
    console.error(`Resend failed (${res.status}): ${await res.text()}`);
    return false;
  }
  return true;
}

function manageFooter(token) {
  return `\n\nNeed to cancel or reschedule? ${MANAGE_BASE}?token=${token}\n\nRiver\nhttps://river.berlin`;
}

function randomToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// ---- appointment plumbing shared by book & reschedule ----

async function findByToken(env, token) {
  if (!/^[a-f0-9]{48}$/.test(token || '')) return null;
  const key = await env.MEETINGS.get(`tok:${token}`);
  if (!key) return null;
  const raw = await env.MEETINGS.get(key);
  if (!raw) return null;
  try {
    return { key, appt: JSON.parse(raw) };
  } catch {
    return null;
  }
}

async function validateSlot(env, date, time) {
  if (!validDate(env, date)) return 'Invalid or out-of-range date';
  if (!daySlots(env, date).includes(time)) return 'Not an available time';
  const start = zonedToUTC(date, time, env.TIMEZONE);
  if (start.getTime() <= Date.now()) return 'That time is in the past';
  if (await env.MEETINGS.get(`appt:${date}T${time}`)) return 'That slot was just taken, pick another';
  return null;
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    const url = new URL(request.url);

    if (url.pathname === '/slots' && request.method === 'GET') {
      const date = url.searchParams.get('date') || '';
      if (!validDate(env, date)) return json({ error: 'Invalid or out-of-range date' }, 400);
      const entries = await dayEntries(env, date);
      const now = Date.now();
      const slots = daySlots(env, date)
        .filter((t) => !entries[t])
        .map((t) => ({ time: t, start: zonedToUTC(date, t, env.TIMEZONE).getTime() }))
        .filter((s) => s.start > now);
      return json({ date, timezone: env.TIMEZONE, slots });
    }

    if (url.pathname === '/book' && request.method === 'POST') {
      let body;
      try {
        body = await request.json();
      } catch {
        return json({ error: 'Body must be valid JSON' }, 400);
      }
      const { name, email, date, time, note, tz } = body;
      let reminderMinutes = parseInt(body.reminderMinutes);

      if (!name?.trim() || !email?.includes('@')) return json({ error: 'Name and a valid email are required' }, 400);
      const slotProblem = await validateSlot(env, date, time);
      if (slotProblem) return json({ error: slotProblem }, slotProblem.includes('taken') ? 409 : 400);
      if (isNaN(reminderMinutes)) reminderMinutes = 60;
      reminderMinutes = Math.min(Math.max(reminderMinutes, 5), 1440);

      const start = zonedToUTC(date, time, env.TIMEZONE);
      const token = randomToken();
      const key = `appt:${date}T${time}`;
      const appt = {
        name: String(name).trim().slice(0, 100),
        email: String(email).trim().slice(0, 200),
        note: String(note || '').trim().slice(0, 1000),
        tz: validTz(tz) ? tz : env.TIMEZONE,
        date, time,
        start: start.getTime(),
        reminderMinutes,
        token,
        createdAt: new Date().toISOString(),
        reminded24: false,
        remindedCustom: false,
      };
      await env.MEETINGS.put(key, JSON.stringify(appt));
      await env.MEETINGS.put(`tok:${token}`, key);

      const whenGuest = formatBoth(appt.start, appt.tz, env);
      const whenMine = formatInTz(start, env.TIMEZONE);
      await Promise.all([
        sendEmail(env, appt.email, `Appointment confirmed - ${whenGuest}`,
          `Hi ${appt.name},\n\nyour appointment with River is confirmed for ${whenGuest}.\n\n` +
          `You'll get a reminder 24 hours before, and another ${reminderMinutes} minutes before.\n` +
          (appt.note ? `\nYour note: ${appt.note}\n` : '') + manageFooter(token)),
        sendEmail(env, env.MY_EMAIL, `New appointment: ${appt.name} - ${whenMine}`,
          `${appt.name} (${appt.email}) booked ${whenMine}.\n\n` +
          (appt.note ? `Note: ${appt.note}\n` : '') + `Custom reminder: ${reminderMinutes} min before.`,
          appt.email),
      ]);

      return json({ success: true, date, time, when: whenGuest, token });
    }

    if (url.pathname === '/appt' && request.method === 'GET') {
      const found = await findByToken(env, url.searchParams.get('token'));
      if (!found) return json({ error: 'Unknown or expired link' }, 404);
      const { appt } = found;
      return json({
        name: appt.name, date: appt.date, time: appt.time, start: appt.start,
        note: appt.note, reminderMinutes: appt.reminderMinutes,
        when: formatBoth(appt.start, appt.tz, env),
      });
    }

    if (url.pathname === '/cancel' && request.method === 'POST') {
      let body;
      try {
        body = await request.json();
      } catch {
        return json({ error: 'Body must be valid JSON' }, 400);
      }
      const found = await findByToken(env, body.token);
      if (!found) return json({ error: 'Unknown or expired link' }, 404);
      const { key, appt } = found;
      await env.MEETINGS.delete(key);
      await env.MEETINGS.delete(`tok:${appt.token}`);

      const whenGuest = formatBoth(appt.start, appt.tz, env);
      await Promise.all([
        sendEmail(env, appt.email, `Appointment cancelled - ${whenGuest}`,
          `Hi ${appt.name},\n\nyour appointment on ${whenGuest} has been cancelled.\n\n` +
          `Feel free to book a new one any time: https://river.berlin/meet\n\nRiver`),
        sendEmail(env, env.MY_EMAIL, `Cancelled: ${appt.name} - ${formatInTz(new Date(appt.start), env.TIMEZONE)}`,
          `${appt.name} (${appt.email}) cancelled their appointment.`, appt.email),
      ]);
      return json({ success: true });
    }

    if (url.pathname === '/reschedule' && request.method === 'POST') {
      let body;
      try {
        body = await request.json();
      } catch {
        return json({ error: 'Body must be valid JSON' }, 400);
      }
      const found = await findByToken(env, body.token);
      if (!found) return json({ error: 'Unknown or expired link' }, 404);
      const { key, appt } = found;
      const { date, time } = body;
      const slotProblem = await validateSlot(env, date, time);
      if (slotProblem) return json({ error: slotProblem }, slotProblem.includes('taken') ? 409 : 400);

      const oldWhen = formatBoth(appt.start, appt.tz, env);
      const start = zonedToUTC(date, time, env.TIMEZONE);
      const newKey = `appt:${date}T${time}`;

      appt.date = date;
      appt.time = time;
      appt.start = start.getTime();
      appt.reminded24 = false;
      appt.remindedCustom = false;

      await env.MEETINGS.put(newKey, JSON.stringify(appt));
      if (newKey !== key) await env.MEETINGS.delete(key);
      await env.MEETINGS.put(`tok:${appt.token}`, newKey);

      const whenGuest = formatBoth(appt.start, appt.tz, env);
      await Promise.all([
        sendEmail(env, appt.email, `Appointment moved - now ${whenGuest}`,
          `Hi ${appt.name},\n\nyour appointment with River moved from ${oldWhen} to ${whenGuest}.\n` +
          `Reminders will arrive for the new time.` + manageFooter(appt.token)),
        sendEmail(env, env.MY_EMAIL, `Rescheduled: ${appt.name} - now ${formatInTz(start, env.TIMEZONE)}`,
          `${appt.name} (${appt.email}) moved their appointment from ${oldWhen} to ${whenGuest}.`, appt.email),
      ]);
      return json({ success: true, when: whenGuest });
    }

    // ---- admin ----

    if (url.pathname === '/day' && request.method === 'GET') {
      if (!isAuthed(request, env)) return json({ error: 'Wrong password' }, 401);
      const date = url.searchParams.get('date') || '';
      if (!validDate(env, date)) return json({ error: 'Invalid or out-of-range date' }, 400);
      const entries = await dayEntries(env, date);
      const slots = daySlots(env, date).map((t) => {
        const e = entries[t];
        return {
          time: t,
          status: !e ? 'free' : e.blocked ? 'blocked' : 'booked',
          name: e && !e.blocked ? e.name : undefined,
        };
      });
      return json({ date, slots });
    }

    if (url.pathname === '/block' && request.method === 'POST') {
      if (!isAuthed(request, env)) return json({ error: 'Wrong password' }, 401);
      let body;
      try {
        body = await request.json();
      } catch {
        return json({ error: 'Body must be valid JSON' }, 400);
      }
      const { date, time, blocked } = body;
      if (!validDate(env, date) || !daySlots(env, date).includes(time)) {
        return json({ error: 'Invalid date or time' }, 400);
      }
      const key = `appt:${date}T${time}`;
      const raw = await env.MEETINGS.get(key);
      if (blocked) {
        if (raw) {
          let existing;
          try { existing = JSON.parse(raw); } catch {}
          if (existing && !existing.blocked) return json({ error: 'That slot has a real booking - cancel it via its manage link instead' }, 409);
          return json({ success: true }); // already blocked
        }
        await env.MEETINGS.put(key, JSON.stringify({ blocked: true, createdAt: new Date().toISOString() }));
        return json({ success: true });
      } else {
        if (raw) {
          let existing;
          try { existing = JSON.parse(raw); } catch {}
          if (existing && !existing.blocked) return json({ error: 'That slot has a real booking, not a block' }, 409);
          await env.MEETINGS.delete(key);
        }
        return json({ success: true });
      }
    }

    return json({ error: 'Not found' }, 404);
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(Promise.all([sendDueReminders(env), seedScarcity(env)]));
  },
};

// When a day enters the booking window, randomly pre-block 40-70% of its
// slots (once - a seeded: marker keeps manual unblocks from being re-blocked).
async function seedScarcity(env) {
  const maxAhead = parseInt(env.MAX_DAYS_AHEAD);
  for (let ahead = 1; ahead <= maxAhead; ahead++) {
    const d = new Date(Date.now() + ahead * 86400000);
    const dateStr = d.toISOString().slice(0, 10);
    const slots = daySlots(env, dateStr);
    if (slots.length === 0) continue; // weekend

    const marker = `seeded:${dateStr}`;
    if (await env.MEETINGS.get(marker)) continue;

    const fraction = 0.4 + Math.random() * 0.3;
    const shuffled = [...slots].sort(() => Math.random() - 0.5);
    const toBlock = shuffled.slice(0, Math.round(slots.length * fraction));

    for (const time of toBlock) {
      const key = `appt:${dateStr}T${time}`;
      if (await env.MEETINGS.get(key)) continue; // never overwrite a real booking
      await env.MEETINGS.put(key, JSON.stringify({ blocked: true, seeded: true, createdAt: new Date().toISOString() }));
    }
    // marker expires once the day is well in the past, keeping KV tidy
    await env.MEETINGS.put(marker, '1', { expirationTtl: (maxAhead + 2) * 86400 });
  }
}

async function sendDueReminders(env) {
  const now = Date.now();
  const list = await env.MEETINGS.list({ prefix: 'appt:', limit: 1000 });

  for (const { name: key } of list.keys) {
    const raw = await env.MEETINGS.get(key);
    if (!raw) continue;
    let appt;
    try {
      appt = JSON.parse(raw);
    } catch {
      continue;
    }
    if (appt.blocked || appt.start <= now) continue;

    const whenGuest = formatBoth(appt.start, appt.tz, env);
    const whenMine = formatInTz(new Date(appt.start), env.TIMEZONE);
    let changed = false;

    if (!appt.reminded24 && now >= appt.start - 24 * 60 * 60000) {
      await Promise.all([
        sendEmail(env, appt.email, `Reminder: appointment tomorrow - ${whenGuest}`,
          `Hi ${appt.name},\n\nfriendly reminder: you have an appointment with River on ${whenGuest}.` + manageFooter(appt.token)),
        sendEmail(env, env.MY_EMAIL, `Reminder: ${appt.name} tomorrow - ${whenMine}`,
          `Appointment with ${appt.name} (${appt.email}) on ${whenMine}.` + (appt.note ? `\nNote: ${appt.note}` : ''), appt.email),
      ]);
      appt.reminded24 = true;
      changed = true;
    }

    if (!appt.remindedCustom && now >= appt.start - appt.reminderMinutes * 60000) {
      await Promise.all([
        sendEmail(env, appt.email, `Starting soon: appointment - ${whenGuest}`,
          `Hi ${appt.name},\n\nyour appointment with River starts in about ${appt.reminderMinutes} minutes (${whenGuest}).\n\nSee you in a bit!\nRiver`),
        sendEmail(env, env.MY_EMAIL, `Starting soon: ${appt.name} - ${whenMine}`,
          `Appointment with ${appt.name} (${appt.email}) in ~${appt.reminderMinutes} minutes.` + (appt.note ? `\nNote: ${appt.note}` : ''), appt.email),
      ]);
      appt.remindedCustom = true;
      changed = true;
    }

    if (changed) await env.MEETINGS.put(key, JSON.stringify(appt));
  }
}
