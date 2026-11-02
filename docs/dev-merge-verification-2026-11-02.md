# Dev merge verification — 2026-11-02

Branch: `dev-minhquan`. Incoming branch: `origin/dev` at
`df56d218728accaaeb97905cb63a6bd4dcba7d59`, confirmed by a successful fetch.
The workspace initially contained an unfinished merge with all conflict entries
already staged. Reviewed the merged mobile exam/session/report flows and Python
voice protocol, and verified no unresolved index entries or conflict markers in
application sources. Preserved the staged incoming database, mobile, frontend
script and AI changes together with the local lifecycle/authorization fixes.

Removed unused Python imports and normalized import ordering (nine Ruff findings).

## Checks

| Component | Command | Result |
| --- | --- | --- |
| Frontend | `npm test` | 55 Node tests and 120 UI tests passed |
| Frontend | `npm run typecheck` / `npm run typecheck:test` | Both passed |
| Frontend | `npm run build` | Passed; main JS bundle warning above 500 kB |
| Frontend | `npm run lint` | Exit 0; existing warnings remain |
| Mobile | `dart analyze lib` | No issues |
| Mobile | `flutter test --no-pub --reporter compact` | 149 passed |
| Backend, JDK 21 | `mvn test -B` | 215 total: 146 passed, 69 skipped, no failures/errors |
| Python | `.venv/Scripts/python.exe -m pytest -q -p no:cacheprovider` | 73 passed, 36 skipped; five dependency/event-loop deprecation warnings |
| Python | `.venv/Scripts/python.exe -m ruff check app scripts --fix` | Nine import findings fixed, zero remaining |
| Audio JS | `node qa/audio_test.cjs` | Resampling, PCM values, playback order, interruption and invalid-frame checks passed |
| Git | `git diff --check` / `git diff --cached --check` | Passed |

Flutter and Python tests and the completed Maven run required execution outside
the restricted sandbox for SDK/cache and test-process access.

## Limits

Dedicated database/external-service tests remain skipped according to their test
configuration; Docker daemon was unavailable. No live database migration, Gemini
exam, SMTP delivery or physical phone microphone/speaker test was performed.
Mobile currently defaults to `localhost`; a phone needs ADB reverse for ports
8080 and 8000 or a separately configured reachable host.

Tests and some test configuration files are local-only under the repository's
existing `.gitignore`; the results above describe this workspace. No push or
deployment was performed.
