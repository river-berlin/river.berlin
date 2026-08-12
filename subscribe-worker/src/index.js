import { EmailMessage } from 'cloudflare:email';

const ALLOWED_ORIGINS = ['https://river.berlin'];

function isAllowedOrigin(origin) {
  return ALLOWED_ORIGINS.includes(origin) || /^http:\/\/localhost:\d+$/.test(origin);
}

function corsHeaders(origin) {
  const allowed = isAllowedOrigin(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Password',
    'Content-Type': 'application/json',
  };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function jsonResponse(body, status, headers) {
  return new Response(JSON.stringify(body), { status, headers });
}

function createMimeMessage({ from, to, subject, text }) {
  const messageId = `<${Date.now()}.${crypto.randomUUID()}@${from.split('@').pop().replace('>', '')}>`;

  const headers = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `Message-ID: ${messageId}`,
    `Date: ${new Date().toUTCString()}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/plain; charset=utf-8`,
    `Content-Transfer-Encoding: 7bit`,
  ].join('\r\n');

  return new EmailMessage(from, to, [headers, '', text].join('\r\n'));
}

async function notifyNewSubscriber(env, record) {
  if (!env.EMAIL || !env.FROM_EMAIL || !env.NOTIFY_EMAIL) return;

  const wants = [
    record.blogPosts && 'blog posts',
    record.events && 'events',
    record.misc && 'misc',
  ].filter(Boolean).join(', ');

  try {
    const message = createMimeMessage({
      from: env.FROM_EMAIL,
      to: env.NOTIFY_EMAIL,
      subject: `New subscriber: ${record.email}`,
      text: `${record.email} just subscribed to: ${wants}`,
    });
    await env.EMAIL.send(message);
  } catch (error) {
    // never let a notification failure break the subscribe response
    console.error('Failed to send subscriber notification:', error);
  }
}

async function sendSubscriptionConfirmation(env, record, isNew) {
  if (!env.RESEND_API_KEY || !env.BROADCAST_FROM_EMAIL) return;

  const wants = [
    record.blogPosts && 'blog posts',
    record.events && 'events',
    record.misc && 'misc',
  ].filter(Boolean).join(', ');

  const unsubscribeUrl = `https://river.berlin/unsubscribe?email=${encodeURIComponent(record.email)}`;
  const subject = isNew ? "You're subscribed!" : 'Your subscription was updated';
  const intro = isNew
    ? `You're now subscribed to: ${wants}.`
    : `Your subscription preferences were updated to: ${wants}.`;
  const text = `${intro}\n\nYou'll only hear from me when there's something new to share.\n\n---\nUnsubscribe: ${unsubscribeUrl}`;

  try {
    await sendViaResend(env, record.email, subject, text);
  } catch (error) {
    // never let a confirmation failure break the subscribe response
    console.error('Failed to send subscription confirmation:', error);
  }
}

async function handleSubscribe(request, env, headers) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: 'Request body must be valid JSON' }, 400, headers);
  }

  const { email, blogPosts, events, misc, honeypot } = payload;

  if (honeypot) {
    // bot filled the hidden field - pretend success
    return jsonResponse({ success: true }, 200, headers);
  }

  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!EMAIL_RE.test(normalizedEmail)) {
    return jsonResponse({ error: 'A valid email is required' }, 400, headers);
  }

  if (!blogPosts && !events && !misc) {
    return jsonResponse({ error: 'Pick at least one thing to subscribe to' }, 400, headers);
  }

  const existingRaw = await env.SUBSCRIBERS.get(normalizedEmail);
  const existing = existingRaw ? JSON.parse(existingRaw) : null;

  const record = {
    email: normalizedEmail,
    blogPosts: !!blogPosts,
    events: !!events,
    misc: !!misc,
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await env.SUBSCRIBERS.put(normalizedEmail, JSON.stringify(record));

  await sendSubscriptionConfirmation(env, record, !existing);
  if (!existing) {
    await notifyNewSubscriber(env, record);
  }

  return jsonResponse({ success: true }, 200, headers);
}

// ---- admin: list subscribers + manually send a broadcast (Resend) ----

function checkAdminAuth(request, env) {
  const supplied = request.headers.get('X-Admin-Password') || '';
  return !!env.ADMIN_PASSWORD && supplied === env.ADMIN_PASSWORD;
}

async function listAllSubscribers(env) {
  const subscribers = [];
  let cursor;
  do {
    const page = await env.SUBSCRIBERS.list({ cursor });
    for (const { name: key } of page.keys) {
      const raw = await env.SUBSCRIBERS.get(key);
      if (!raw) continue;
      try {
        subscribers.push(JSON.parse(raw));
      } catch {}
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  return subscribers;
}

async function sendViaResend(env, to, subject, text) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.BROADCAST_FROM_EMAIL,
      to: [to],
      subject,
      text,
      reply_to: [env.NOTIFY_EMAIL],
    }),
  });
  if (!res.ok) {
    console.error(`Resend failed for ${to} (${res.status}): ${await res.text()}`);
    return false;
  }
  return true;
}

async function handleAdminSubscribers(request, env, headers) {
  if (!checkAdminAuth(request, env)) {
    return jsonResponse({ error: 'Unauthorized' }, 401, headers);
  }
  const subscribers = await listAllSubscribers(env);
  return jsonResponse({ subscribers }, 200, headers);
}

async function handleAdminBroadcast(request, env, headers) {
  if (!checkAdminAuth(request, env)) {
    return jsonResponse({ error: 'Unauthorized' }, 401, headers);
  }

  if (!env.RESEND_API_KEY || !env.BROADCAST_FROM_EMAIL) {
    return jsonResponse({ error: 'Broadcast sending is not configured (missing RESEND_API_KEY or BROADCAST_FROM_EMAIL)' }, 500, headers);
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: 'Request body must be valid JSON' }, 400, headers);
  }

  const { subject, text, blogPosts, events, misc } = payload;

  if (!subject || !text) {
    return jsonResponse({ error: 'Subject and message body are required' }, 400, headers);
  }

  if (!blogPosts && !events && !misc) {
    return jsonResponse({ error: 'Pick at least one audience category' }, 400, headers);
  }

  const subscribers = await listAllSubscribers(env);
  const recipients = subscribers.filter(
    (s) => (blogPosts && s.blogPosts) || (events && s.events) || (misc && s.misc)
  );

  let sent = 0;
  let failed = 0;
  for (const recipient of recipients) {
    const unsubscribeUrl = `https://river.berlin/unsubscribe?email=${encodeURIComponent(recipient.email)}`;
    const fullText = `${text}\n\n---\nUnsubscribe: ${unsubscribeUrl}`;
    const ok = await sendViaResend(env, recipient.email, subject, fullText);
    if (ok) sent += 1;
    else failed += 1;
  }

  return jsonResponse({ success: true, sent, failed, total: recipients.length }, 200, headers);
}

async function handleUnsubscribe(request, env, headers) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: 'Request body must be valid JSON' }, 400, headers);
  }

  const { email, honeypot } = payload;

  if (honeypot) {
    return jsonResponse({ success: true }, 200, headers);
  }

  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!EMAIL_RE.test(normalizedEmail)) {
    return jsonResponse({ error: 'A valid email is required' }, 400, headers);
  }

  // Always report success, whether or not the email was actually subscribed -
  // this avoids leaking which addresses are in the list.
  await env.SUBSCRIBERS.delete(normalizedEmail);

  return jsonResponse({ success: true }, 200, headers);
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const headers = corsHeaders(origin);
    const { pathname } = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers });
    }

    if (pathname === '/admin/subscribers' && request.method === 'GET') {
      return handleAdminSubscribers(request, env, headers);
    }

    if (request.method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed' }, 405, headers);
    }

    if (pathname === '/subscribe') {
      return handleSubscribe(request, env, headers);
    }

    if (pathname === '/unsubscribe') {
      return handleUnsubscribe(request, env, headers);
    }

    if (pathname === '/admin/broadcast') {
      return handleAdminBroadcast(request, env, headers);
    }

    return jsonResponse({ error: 'Not found' }, 404, headers);
  },
};
