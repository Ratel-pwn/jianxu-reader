# Community development API

Run `npm run server:dev` with Node 22.16 or newer. The server binds only to 127.0.0.1:4318 and persists data in ignored `server/data/community.sqlite`. No preloaded accounts, posts, secrets, or remote service. Android emulator development endpoint: `http://10.0.2.2:4318`; release clients accept HTTPS only.

All bodies and responses are JSON. Authenticated requests use `Authorization: Bearer <session token>`. Tokens are random, stored hashed in server SQLite, expire in seven days, and are held in device SecureStore. Passwords preserve whitespace and use versioned scrypt N=32768/r=8/p=3 with per-user salt. Legacy hashes upgrade at successful login. At most two password hashes run concurrently. Do not expose this development server directly to the internet.

| Method | Path | Body / response |
| --- | --- | --- |
| GET | /health | `{status, version}` |
| POST | /auth/register | `{name, password}` → `{token, user}` |
| POST | /auth/login | `{name, password}` → `{token, user}` |
| POST | /auth/logout | invalidates current session |
| GET | /me | `{id, name}` |
| DELETE | /account | removes user, sessions, posts, replies, blocks; reporter identity becomes null |
| GET | /posts | latest 50 visible root posts |
| POST | /posts | `{body, bookTitle?, parentId?}` → created post |
| GET | /posts/:id | `{post, replies}` (first 100 replies) |
| DELETE | /posts/:id | author-only, cascading replies |
| POST | /reports | `{postId, reason}` → `{ok, status: pending}` |
| GET | /blocks | blocked `{id, name}[]` |
| POST | /blocks/:id | bilateral content visibility exclusion |
| DELETE | /blocks/:id | removes block |

Post: `{id, authorId, author, parentId, body, bookTitle, createdAt}`. Server receives no book files, reading locators, companion boundary or private notes. A typed book title and content are published only by the user's explicit action.

Local operator review: `node server/moderate.mjs list`; then `node server/moderate.mjs resolve REPORT_ID keep` or `remove`. `node server/moderate.mjs history` shows the latest 100 decisions. Decisions survive content deletion and retain only numeric report/post IDs, decision and time. Re-reporting dismissed content reopens its report. These commands operate on this project's development database and are not run automatically. Blocking a thread author also prevents direct access to its third-party replies.

Production remaining work: hosting and TLS; deployment and backup/restore; operational moderation, ban/appeal workflow and terms; recovery/verified identity; spam controls beyond current limits; pagination for large threads; observability without logging credentials or book contents. Public deployment and developer accounts are outside the current authorization.
