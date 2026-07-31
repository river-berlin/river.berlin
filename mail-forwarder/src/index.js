import { EmailMessage } from 'cloudflare:email';

const ALLOWED_ORIGINS = ['https://river.berlin'];

function isAllowedOrigin(origin) {
  return ALLOWED_ORIGINS.includes(origin) || /^http:\/\/localhost:\d+$/.test(origin);
}

function corsHeaders(origin) {
  const allowed = isAllowedOrigin(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };
}

function createMimeMessage({ from, to, replyTo, subject, text }) {
  const messageId = `<${Date.now()}.${crypto.randomUUID()}@${from.split('@')[1]}>`;

  const headers = [
    `From: ${from}`,
    `To: ${to}`,
    `Reply-To: ${replyTo}`,
    `Subject: ${subject}`,
    `Message-ID: ${messageId}`,
    `Date: ${new Date().toUTCString()}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/plain; charset=utf-8`,
    `Content-Transfer-Encoding: 7bit`,
  ].join('\r\n');

  return new EmailMessage(from, to, [headers, '', text].join('\r\n'));
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const headers = corsHeaders(origin);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers });
    }

    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
    }

    let payload;
    try {
      payload = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Request body must be valid JSON' }), { status: 400, headers });
    }

    // `email` is the visitor's address (used as Reply-To). The destination is
    // NEVER taken from the payload - it comes from the DESTINATION_EMAIL secret.
    const { name, email, body, honeypot } = payload;

    if (honeypot) {
      // bot filled the hidden field - pretend success
      return new Response(JSON.stringify({ success: true }), { status: 200, headers });
    }

    if (!body || !name) {
      return new Response(JSON.stringify({ error: 'Missing required fields: name, body' }), { status: 400, headers });
    }

    if (!env.SENDER_EMAIL || !env.DESTINATION_EMAIL) {
      return new Response(JSON.stringify({ error: 'Email configuration missing' }), { status: 500, headers });
    }

    try {
      const message = createMimeMessage({
        from: env.SENDER_EMAIL,
        to: env.DESTINATION_EMAIL,
        replyTo: email || env.SENDER_EMAIL,
        subject: `Contact form: message from ${String(name).slice(0, 100)}`,
        text: `Name: ${name}\nEmail: ${email || 'not provided'}\n\n${String(body).slice(0, 10000)}`,
      });

      await env.EMAIL.send(message);
      return new Response(JSON.stringify({ success: true }), { status: 200, headers });
    } catch (error) {
      console.error('Failed to send email:', error);
      return new Response(JSON.stringify({ error: 'Failed to send email' }), { status: 500, headers });
    }
  },
};
