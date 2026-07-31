// Key-value store for business-card ids -> person JSON ({name, ...}).
// Reads are public (the /hi/<id> page uses them), writes need ADMIN_PASSWORD.

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Password',
  'Content-Type': 'application/json',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: CORS });
}

// constant-time-ish comparison to avoid trivially timing the password
function safeEqual(a, b) {
  const enc = new TextEncoder();
  const ab = enc.encode(a);
  const bb = enc.encode(b);
  if (ab.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < ab.length; i++) diff |= ab[i] ^ bb[i];
  return diff === 0;
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    const url = new URL(request.url);

    // lets the admin PWA check the password without writing anything
    if (url.pathname === '/auth' && request.method === 'GET') {
      const password = request.headers.get('X-Admin-Password') || '';
      if (!env.ADMIN_PASSWORD || !safeEqual(password, env.ADMIN_PASSWORD)) {
        return json({ error: 'Wrong password' }, 401);
      }
      return json({ success: true });
    }

    const match = url.pathname.match(/^\/card\/([A-Za-z0-9_-]{1,64})$/);
    if (!match) {
      return json({ error: 'Not found. Use /card/<id>' }, 404);
    }
    const id = match[1];

    if (request.method === 'GET') {
      const value = await env.CARDS.get(id);
      if (value === null) return json({ error: 'No such id' }, 404);
      return new Response(value, { status: 200, headers: CORS });
    }

    if (request.method === 'PUT') {
      const password = request.headers.get('X-Admin-Password') || '';
      if (!env.ADMIN_PASSWORD || !safeEqual(password, env.ADMIN_PASSWORD)) {
        return json({ error: 'Wrong password' }, 401);
      }

      let data;
      try {
        data = await request.json();
      } catch {
        return json({ error: 'Body must be valid JSON' }, 400);
      }
      if (typeof data !== 'object' || data === null || typeof data.name !== 'string' || !data.name.trim()) {
        return json({ error: 'JSON body must at least contain a non-empty "name" string' }, 400);
      }

      await env.CARDS.put(id, JSON.stringify(data));
      return json({ success: true, id, saved: data });
    }

    return json({ error: 'Method not allowed' }, 405);
  },
};
