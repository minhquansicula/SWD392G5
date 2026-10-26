# Frontend regression and exception checks

Run from `front-end` using Node.js 24:

```sh
npm ci
npm test
npm run typecheck
npm run build
npm run lint
```

`test:unit` runs the existing Node service/utility tests plus calendar validation tests.
`test:ui` runs actual React components/hooks with Vitest, Testing Library and jsdom.
The login landing page's old AST/handler-name tests were migrated to rendered-form tests;
raw email/password forwarding assertions are retained.

## Verification on 2026-10-26

| Check | Result |
| --- | --- |
| Node unit/service tests | 47 passed |
| React component/hook tests | 89 passed across 12 files |
| TypeScript (application and tests) | Passed |
| Production build | Passed; main JS chunk exceeds the 500kB warning threshold |
| Oxlint | 0 errors, 117 warnings (17 in `src_backup`) |
| Scheduling/calendar tests with `TZ=America/New_York` | 18 passed |

These are test-case results, not a claim of 100% statement/branch coverage.

## Automated exception matrix

| Area | Checked cases |
| --- | --- |
| Authentication | Empty/whitespace email, empty password, raw Unicode email/password preservation, duplicate submit, credentials/network failure, generic password-reset response |
| Password links | Expired/used link vs outage, retry, password mismatch/length/UTF-8 byte bound, duplicate submit, null rejection, successful sign-in requirement |
| Session/cache | Authoritative `/me`, stale roles, 401 vs network/5xx, logout, late responses/401s across account changes, anonymous password endpoints |
| Navigation | Pending identity, restricted URLs for student/lecturer, admin default route, unauthorized event, logout, token URL encoding, unavailable browser storage |
| Admin | Account/course list failures; simultaneous account/course creation; existing raw-email, XLSX/batch row errors and password-mail tests |
| Scheduling | Opening/closing instant, missing/invalid time, calendar overflow and leap days, timezone conversion, question-setting locks, duplicate enrollment/invalid identifiers, exam range boundaries |
| Student flow | Schedule load failure, device check before mutation, successful start, entering an active room without restarting, result schedule identity |
| Device checks | Permission denied, missing Web Audio, delayed permission after dismissal, mandatory mic/output confirmation, unknown start outcome blocks resubmission |
| Voice room | Duplicate start, unmount during mic permission, mute/unmute, reconnection, socket close/error, malformed JSON, playback failure, zero limits, countdown validation, connection/grading timeouts, one finish transport, HTTP 503, abort/ignore late HTTP results |
| Results | Missing data without fabricated scores/feedback, zero score, AI outage preserving schedule score, student class-tab guard, unavailable schedule link, partial session payload, mismatched schedule ID and late responses |
| Materials | AI-course fallback, both sources down, document load failure, stale course responses, file type/20MB limit, confirmed deletion failure |
| Questions | List/course-source errors, search debounce/cancellation, late responses, AI generation failure never saves questions |
| Dialogs | Busy cancellation, focus return, nested/idempotent scroll locks, duplicate confirmations, uncertain network outcome vs definite validation failure |
| Audit fixes | Explicit fresh schedule/exam reads bypass stale caches; student refresh requests fresh data; clearing question topic/answer preserves empty strings in JSON; AI HTTP requests attach the current Bearer token; voice-room authentication precedes audio, tokens stay out of URLs, and missing sessions do not acquire a microphone |

Server-side AI authorization regressions live in `demo/viva-ai-v2/tests/test_auth.py`.
They exercise HTTP/WebSocket routes with fake Spring Boot, database and AI services,
including anonymous access, another student's schedule, lecturer read-vs-write access,
course scoping, unavailable identity authority, and WebSocket authentication/origin checks.

## Boundaries: not an exhaustive end-to-end certification

- API, WebSocket, microphone, playback and AI calls are mocked. No real exam, account,
  email or grading request is sent by these tests.
- jsdom cannot verify native dialog focus trapping/top-layer behavior, fullscreen,
  actual microphone permissions/devices, audio quality, responsive rendering or contrast.
- Real Spring Boot/Python/PostgreSQL integration, JWT enforcement on the server,
  reconnect/resume persistence, SMTP and AI-provider behavior require a separate
  integration/E2E environment and test accounts.
- A successfully sent WebSocket finish command is **not** automatically repeated
  over HTTP after a timeout: its server outcome may be unknown. The UI asks the user
  to check the schedule before another action.
- Build/type checks do not prove every runtime exception is covered. Lint warnings
  in legacy screens and `src_backup` are reported separately, not silently suppressed.
