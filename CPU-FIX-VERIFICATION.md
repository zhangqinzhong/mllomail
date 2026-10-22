# CPU repair verification — 2026-10-22

Production: https://zclaude.com / Pages project mllomail.
Deployment: `7b09ca61-08fb-4d22-b17d-9f162ebbb422`, completed 17:36:51 UTC.
The free plan is unchanged. No paid service or plan upgrade was enabled.

## Changes

Normal page requests now serve 70 prerendered locale/page shells instead of initializing the Next.js server renderer. Private shells retain server-side session checks, and admin shells check the current database role. User data is loaded through authenticated APIs, not embedded into shared static assets. Legacy shared-message and admin-user links redirect to equivalent static shells with query parameters; shared data still requires the original valid share token.

All 31 existing API route modules are bundled into a native Worker dispatcher that reuses their handlers and middleware. Auth.js cryptography, session cookies and rotation, CSRF, credentials and OAuth callbacks remain in use. Read-only auth paths skip unrelated provider normalization. Internal auth memoization is scoped to one request; user identity, roles and database bindings are not cached across requests. The compatibility layer uses internals of the pinned Auth.js and Drizzle versions; rerun its integration tests when upgrading those dependencies.

Immutable Drizzle schema metadata is prepared once. Hot session/mailbox/admin queries use parameterized D1 statements and batched reads. KV configuration and user overrides use bulk reads, split at the 100-key service limit. Admin responses exclude passwords and provider credentials. Earlier inbox summary reads and hidden-tab polling reduction are retained.

## Verification

- 26 regression/integration tests passed (`npm run test:cpu`), including concurrent identity isolation, role checks, forged-header rejection, CSRF rejection, credentials login, session cookie rotation, share revocation, mailbox pagination and admin KV batching beyond 100 keys.
- Complete `npm run build:pages` passed; `git diff --check` passed. Existing React-hook lint warnings remain.
- Canonical Pages production deployment was confirmed through the Cloudflare API.
- Browser verification: authenticated mailbox list and admin overview loaded correctly. No production accounts or mailboxes were created or removed for this test.
- Public login, session, provider, CSRF and public login-config GETs returned 200. Anonymous private page returned 307; anonymous mailbox API returned 401, as intended.
- Final deployment trace: 30 invocations, all `ok`, no `exceededResources` or other execution failure.
- Six first-invocation-per-isolate markers measured **8, 4, 1, 10, 3 and 10 ms** CPU. These identify actual new isolates, not merely cache-busting requests.
- The trace also contains two non-first-isolate invocations above 10 ms: session 14 ms and config 12 ms; both completed successfully. Admin overview API measured 10 ms. We do not claim that every request is below 10 ms.
- Cloudflare aggregate analytics, which lag the trace, reported 14 requests and zero errors for the window starting 17:36:52 UTC when queried.

The earlier hundreds-of-milliseconds framework cold starts were not reproduced in the final deployment tests. This is a short production observation window, not proof of zero failures over the next 24 hours or every unexercised write/OAuth path. No background monitoring has been scheduled.

Sanitized HTTP checks, CPU trace and analytics are saved in the task workspace:
`/Users/zhangqinzhong/Documents/Codex/2026-09-29/ma-c/work/cloudflare-cpu-audit/7b09ca61-*.json`.
Intermediate deployment results are kept separately and are not included in the final sample.

Original pre-repair rollback deployment: `eee6f577-077f-4e6f-abf5-2c263ac3bbdf`.
Previous public-page/inbox-only repair deployment: `d6f2ea4c-2b4d-4abf-8f93-edd2c1b0a866`.
