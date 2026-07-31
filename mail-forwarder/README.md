# mail-forwarder

The Cloudflare Worker behind the river.berlin contact form. Deploys as `emailer`,
replacing the worker at https://emailer.theadityashankar.workers.dev (same URL the
site already POSTs to).

Uses Cloudflare's Email Routing `send_email` binding - no third-party email service.

## API

`POST /` with JSON:

```json
{ "name": "visitor", "email": "visitor@example.com", "body": "hello!", "honeypot": "" }
```

- `email` is the *visitor's* address, used as Reply-To so you can reply directly.
- The destination address is never read from the request - it comes from the
  `DESTINATION_EMAIL` secret.
- A non-empty `honeypot` silently pretends success (bot trap).

## Setup

```bash
npm install
npx wrangler secret put SENDER_EMAIL       # me@river.berlin (must be an address on the Email Routing domain)
npx wrangler secret put DESTINATION_EMAIL  # me@river.berlin
npm run deploy
```

Requirements: Email Routing must be enabled for the domain in the Cloudflare
dashboard, and `SENDER_EMAIL`'s domain must be that domain. `DESTINATION_EMAIL`
must be a verified destination address in Email Routing.
