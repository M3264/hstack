# Benchmark 2 task: production-grade waitlist backend

Build a waitlist backend in TypeScript with **no runtime dependencies**. Use the built-in `node:sqlite` module (Node 22.5+) for storage and web-standard `Request`/`Response`. Strict TypeScript, and no `any`. Write thorough Vitest tests in `src/*.test.ts`.

Done when `npx tsc --noEmit` and `npx vitest run` both pass. A hidden acceptance suite imports `src/app.ts` and calls `app.fetch(new Request(...))`, so every name, status code, field and error code below must match exactly. Do not modify `package.json`, `tsconfig.json` or `vitest.config.ts`.

## 1. Public interface: `src/app.ts`

```ts
export type Email = { to: string; subject: string; text: string };
export type AppOptions = {
  adminToken: string;
  dbPath?: string;                                   // default ":memory:"
  now?: () => number;                                // epoch ms, default Date.now
  sendEmail?: (email: Email) => Promise<void>;       // default: no-op
  rateLimit?: { max: number; windowMs: number };     // default { max: 5, windowMs: 60_000 }
  baseUrl?: string;                                  // default "http://localhost:3000", no trailing slash
};
export function createApp(opts: AppOptions): { fetch(req: Request): Promise<Response>; close(): void };
```

Also provide `src/server.ts`, which starts a `node:http` server on `PORT` (default 3000) using `createApp`, with `ADMIN_TOKEN` and `DB_PATH` from the environment. It isn't tested by the hidden suite.

## 2. Conventions

- **Errors:** status code plus a JSON body `{"error":{"code":"<code>","message":"<non-empty text>"}}`. Every JSON response has `content-type: application/json` (charset suffix allowed).
- **Emails:** trim, then lowercase. Valid when matching `/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/` and at most 254 characters.
- **`name` (optional):** trimmed. If present it must be 1-100 characters after trimming; an empty string or whitespace only is invalid. If absent, it's `null`.
- **`referralCode`:** 8 characters from `[a-z0-9]`, unique per entry.
- **Time:** all time-based behavior (timestamps, token expiry, rate limiting) uses `opts.now()`, never the system clock directly. Timestamps are returned as ISO 8601 strings (`new Date(ms).toISOString()`).
- **Tokens:** URL-safe, matching `[A-Za-z0-9_-]`, at least 32 characters, cryptographically random.
- **Position:** only `confirmed` entries have one. Rank confirmed entries by `referrals` descending, then `confirmedAt` ascending, then `id` ascending. Position is the 1-based rank. Every other status has `position: null`.
- **`referrals`:** the number of entries that signed up with this entry's referral code and are currently `confirmed` or `invited`.

## 3. Endpoints

### `GET /healthz`
Returns `200 {"ok":true}`.

### `POST /api/waitlist`
Body: `{"email": string, "name"?: string, "referralCode"?: string}`.

Checks, in this order:
1. **Rate limit**, counted per client IP on every request to this endpoint, valid or not, before any other check. The IP is the first comma-separated value of `x-forwarded-for`, trimmed, or `"unknown"` without that header. Allow at most `max` requests per IP in any trailing `windowMs` window. Beyond that, return `429 rate_limited` with a `Retry-After` header: whole seconds, at least 1, until the oldest counted request leaves the window. Requests rejected with 429 aren't counted.
2. If `content-type` doesn't start with `application/json`, return `415 unsupported_media_type`.
3. If the body is larger than 10,240 bytes, return `413 payload_too_large`.
4. If the body isn't a JSON object, return `400 invalid_json`.
5. Invalid email: `400 invalid_email`. Invalid name: `400 invalid_name`.
6. If `referralCode` is present but matches no existing entry, return `400 invalid_referral_code`.

**New email:** create an entry with status `pending` and return **201**:
`{"id": string, "email": normalized, "status": "pending", "referralCode": string, "emailSent": boolean}`.

Send exactly one email to that address:
- subject: `Confirm your spot on the waitlist`
- text containing `<baseUrl>/api/waitlist/confirm?token=<confirmToken>` and `<baseUrl>/unsubscribe?token=<unsubscribeToken>`

The confirm token expires 24 hours (86,400,000 ms) after it's issued. The unsubscribe token never expires. If `sendEmail` throws or rejects, the entry is still created, and the response is still 201 with `"emailSent": false`. Otherwise `emailSent` is `true`.

**Existing email** (after normalization): return **200** with the same shape for the existing entry. Don't create a duplicate, and ignore `name` and `referralCode`.
- If the entry is `pending`, issue a new confirm token (the previous one stops working) and send the confirmation email again. `emailSent` reflects that send.
- If it's `confirmed` or `invited`, send nothing and return `"emailSent": false`.

### `GET /api/waitlist/confirm?token=<t>`
- Unknown or already-used token: `400 invalid_token`. Expired token: `410 token_expired`.
- Otherwise, the entry becomes `confirmed`, `confirmedAt` is now, and the token stops working. Return `200 {"status":"confirmed","position":<number>}` with the entry's position after confirming.

### `GET /api/waitlist/status?email=<e>`
- Email normalized the same way as signup. Unknown email: `404 not_found`.
- Otherwise `200 {"status": string, "position": number|null, "referrals": number, "referralCode": string}`.

### `DELETE /api/waitlist?token=<unsubscribeToken>`
- Unknown token: `404 not_found`.
- Otherwise, delete the entry permanently and return `204` with an empty body. A deleted entry no longer counts toward its referrer's `referrals`. Signing up again with the same email creates a new entry.

### Admin endpoints
All require `authorization: Bearer <adminToken>`. Compare it in constant time. A missing or wrong token returns `401 unauthorized`.

**`GET /api/admin/waitlist?status=&limit=&cursor=`** returns `200 {"items": Item[], "nextCursor": string|null}`.
- `Item` is `{"id","email","name","status","referrals","createdAt","confirmedAt"}`. `confirmedAt` is an ISO string or `null`.
- Items are ordered by `createdAt` ascending, then `id` ascending.
- `limit` defaults to 50 and must be an integer from 1 to 200, otherwise `400 invalid_limit`.
- `status` is optional and must be `pending`, `confirmed` or `invited`, otherwise `400 invalid_status`.
- `cursor` is opaque. A malformed one returns `400 invalid_cursor`. `nextCursor` is `null` when there are no more items.

**`POST /api/admin/waitlist/<id>/invite`**
- Unknown id: `404 not_found`.
- `pending`: `409 not_confirmed`. Already `invited`: `409 already_invited`.
- Otherwise the status becomes `invited`. Send one email to the entry with the subject `You're in!`, and return `200 {"id": string, "status": "invited"}`.

**`GET /api/admin/waitlist.csv`** returns `200` with `content-type: text/csv` (charset suffix allowed).
- The first line is exactly `id,email,name,status,referrals,createdAt,confirmedAt`, then one line per entry, ordered like the list.
- Lines are separated by `\n`, with no trailing newline.
- Empty values (a null name, a null `confirmedAt`) are empty fields.
- Quote a field with `"` only when it contains `,`, `"`, `\r` or `\n`, doubling inner quotes.
- **Formula-injection guard:** a field whose first character is `=`, `+`, `-` or `@` gets a leading `'` before any quoting.

### Routing
- An unknown path returns `404 not_found`.
- A known path with the wrong method returns `405 method_not_allowed` with an `Allow` header listing the allowed methods.

## 4. Persistence
With the same `dbPath` file, data survives `close()` followed by a new `createApp`.
