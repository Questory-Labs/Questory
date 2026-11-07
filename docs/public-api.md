# Public API

Read-only HTTP access to your own Questory account, authenticated with a user-created API key. Intended for dashboards, widgets, scripts, and home-automation tooling. Nothing here can change account data.

Base path: `<API origin>/public/v1`. The live OpenAPI document is at `GET /public/v1/openapi.json` (no auth).

## Keys

Create keys in **Settings → Profile → Public API keys**. Each key has a label and a set of scopes; you can hold several keys at once and revoke any of them independently. The plaintext token is shown once at creation. Keys can also be managed with the session-authenticated endpoints `GET/POST /v1/api-keys/public` and `DELETE /v1/api-keys/:id`.

Send the token as a bearer header:

```
Authorization: Bearer <token>
```

Music ingest and watch webhook keys are not accepted here, and public keys are not accepted by those endpoints.

## Scopes

| Scope | Grants |
| :--- | :--- |
| `profile:read` | `/me` |
| `library:read` | `/library`, `/library/backlog`, `/library/{id}` |
| `wishlist:read` | `/wishlist`, `/wishlist/deals` |
| `sessions:read` | `/now-playing`, play sessions in `/recent` |
| `rewind:read` | `/rewind/{domain}/{period}` |
| `music:read` | `/music/listens`, listens in `/recent`, music in `/now-playing` |
| `watch:read` | `/watch/history`, watch events in `/recent` |
| `read:read` | `/read/history`, reading events in `/recent` |

A request without the required scope returns `403`. `/recent` never fails on scope; it only includes the parts the key is allowed to see.

Purchase cost data (`pricePaid`, `purchasedAt`, `valueAmount`, `costPerHour`) is stripped from every public response.

## Rate limit

60 requests per 60 seconds per key. Over the limit the API returns `429` with a `Retry-After` header (seconds).

## Errors

| Status | Meaning |
| :--- | :--- |
| `400` | Bad query or path parameter |
| `401` | Missing, invalid, revoked, or wrong-type key |
| `403` | Key lacks the scope, or the module (music/watch/read) is disabled on this instance |
| `404` | Entry not found |
| `429` | Rate limit exceeded |

## CORS

`GET` and `OPTIONS` on `/public/v1/*` answer with `Access-Control-Allow-Origin: *`, so browser widgets can call the API directly with the bearer header. Cookies are never used on these routes.

## Endpoints

All endpoints are `GET`. Paged endpoints accept `page` (default 1) and `pageSize` (1–100).

| Path | Scope | Notes |
| :--- | :--- | :--- |
| `/me` | `profile:read` | Persona name, avatar, country, Steam id, key scopes |
| `/library` | `library:read` | Same filters as the app: `q`, `genre`, `tag`, `store`, `minPlaytime`, `maxPlaytime`, `unplayed`, `multiplayer`, `singleplayer`, `coop`, `pvp`, `deck`, `controller`, `publisher`, `developer`, `sort`, `status` |
| `/library/backlog` | `library:read` | Status counts, HowLongToBeat hours, weekly pace, next up. Optional `tz` |
| `/library/{id}` | `library:read` | Game id or numeric Steam appId |
| `/now-playing` | `sessions:read` | Latest play session or most recently played library entry, plus music now-playing when the key also has `music:read` |
| `/recent?limit=20` | per part | Unified `{kind, name, at, imageUrl}` items across sessions, listens, watch and read events, newest first (`limit` 1–50) |
| `/wishlist` | `wishlist:read` | Optional `store` filter |
| `/wishlist/deals` | `wishlist:read` | Wishlist items currently discounted |
| `/rewind/{domain}/{period}` | `rewind:read` | `domain` is `games`, `music`, `watch`, `read` or `all`; `period` is `YYYY` or `YYYY-MM`; optional `tz` |
| `/music/listens` | `music:read` | Paged listens (music module must be enabled) |
| `/watch/history` | `watch:read` | Paged watch events (watch module must be enabled) |
| `/read/history` | `read:read` | Paged reading events (read module must be enabled) |

## Examples

```bash
API=https://api.example.com
KEY=...

curl -s -H "Authorization: Bearer $KEY" "$API/public/v1/me"

curl -s -H "Authorization: Bearer $KEY" \
  "$API/public/v1/library?status=backlog&sort=lastPlayed&pageSize=5"

curl -s -H "Authorization: Bearer $KEY" "$API/public/v1/now-playing"

curl -s -H "Authorization: Bearer $KEY" "$API/public/v1/recent?limit=10"

curl -s -H "Authorization: Bearer $KEY" \
  "$API/public/v1/rewind/all/2026-03?tz=Asia/Kolkata"

curl -s "$API/public/v1/openapi.json"
```

Browser widget:

```js
const res = await fetch(`${API}/public/v1/now-playing`, {
  headers: { Authorization: `Bearer ${KEY}` },
});
const { game, music } = await res.json();
```

Treat the key like a password. A key embedded in a public web page can be read by anyone who views the source; scope such keys to the minimum they need and revoke them when the page is retired.
