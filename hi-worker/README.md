# hi-cards worker

KV storage behind the business-card QR codes (https://river.berlin/hi/<id>).

- `GET /card/<id>` - public, returns the stored JSON (at minimum `{"name": "..."}`)
- `PUT /card/<id>` - saves JSON for an id; requires the `X-Admin-Password` header.
  The body must be JSON with at least a `name` string; extra fields are stored
  as-is so the schema can grow later.

## Setup

```bash
npm install
npx wrangler kv namespace create CARDS   # paste the printed id into wrangler.toml
npx wrangler secret put ADMIN_PASSWORD
npm run deploy
```

## Try it

```bash
curl -X PUT https://hi-cards.theadityashankar.workers.dev/card/test123 \
  -H 'X-Admin-Password: <password>' \
  -H 'Content-Type: application/json' \
  -d '{"name": "Ada"}'

curl https://hi-cards.theadityashankar.workers.dev/card/test123
```
