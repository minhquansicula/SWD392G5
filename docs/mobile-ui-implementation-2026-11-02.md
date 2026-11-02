# Mobile UI implementation — 2026-11-02

Implemented the approved UI/UX Pro Max plan for the existing student Flutter app.
Kept the dark teal identity and the Home / Schedule / Account navigation.

## Changes

- Solid shared card surfaces and native buttons with at least 48dp touch targets,
  wrapping labels, disabled states and loading feedback. Removed card blur and
  button glow. Standardized readable text, gutters and semantic colors.
- Shared responsive content and message components; the app viewport is limited
  to 720dp on larger screens. Body content uses 16dp phone / 24dp tablet gutters.
- Bundled Be Vietnam Pro and JetBrains Mono with their SIL Open Font License
  texts and license registry entries. UI fonts no longer require network access.
- Voice decorations respect OS reduced motion and inactive tab ticker state.
- Home prioritizes an active/upcoming exam and the latest completed exam, including
  completed exams whose scores have not been published. Schedule cards and filters
  share consistent state labels and one primary action per card.
- Preparation separates exam information, identity/network/microphone checks,
  a real microphone test and explicit agreement to exam rules. Its API client can
  be injected for tests; normal usage still uses the existing singleton.
- Exam room emphasizes the actual question, question number, timer and conversation.
  Microphone, submit-answer and finish-exam are distinct actions; finish retains
  its confirmation. Removed technical provider/tool terminology from visible UI.
- Results keep missing marks unassessed, label AI feedback as advisory, wrap long
  rubric labels and expand question/answer details. Removed unsupported PDF and
  non-functional playback affordances.
- Login provides field errors, autofill, password visibility labels and preserved
  inputs after failures. Password recovery retains its request, link verification
  and password-setting APIs in scrollable forms. Account information no longer
  presents unsupported reminders as an interactive switch. Removed the no-op bell.
- Preserved the existing local finish fixes: the recovery action stays accessible
  on timeout/disconnect, unsent finish commands preserve the question clock, and
  a server finishing acknowledgement cannot disable the result timeout.

No backend, database or API wire-format changes. No commit or push performed.

## Verification

| Check | Result |
| --- | --- |
| `dart analyze mobile/lib` | No issues |
| `flutter test --no-pub --reporter expanded` | 345 passed, zero failures |
| Existing regression tests | 153 passed, including finish recovery |
| Responsive layout cases | 180 passed: 10 screen/state variants × 6 sizes × 3 text scales |
| UI behavior/accessibility cases | 12 passed |
| `git diff --check` | Passed |

Layout sizes: 360×800, 375×812, 390×844, 430×932, 768×1024 and 640×360.
Text scales: 1.0, 1.3 and 2.0. Cases exercise initial and scrolled content with
Vietnamese text and long rubric labels. Behavior checks cover keyboard insets,
raw credential preservation after login errors, inline validation, exam-entry
gates, unpublished results, expanded reports, reduced motion, semantic labels,
Android button target guidelines and text/control color contrast.

Rendered previews with bundled Vietnamese fonts and real Material icon glyphs
are in `mobile/build/ui-review/`: login, password, home, schedule, profile,
report, pending, checklist, room and navigation. They use synthetic test data,
not a real student's records. These are widget renders rather than device captures.
The full test output is in `mobile/mobile-ui-final-tests.log`.

## Verification limits

- `flutter devices` found Windows and browsers, with no Android device/emulator.
  Actual microphone/speaker behavior, TalkBack/VoiceOver and native permission
  prompts still require device checks. Widget semantics tests are not a substitute
  for screen-reader verification on a phone.
- `flutter build bundle --debug --no-pub` could not complete: the environment has
  no Android SDK and reports a missing SDK `dart_plugin_registrant.dart` path.
  No APK/release build or installation is claimed. Details are in
  `mobile/ui-bundle-build.log`.
- HTTP, audio and socket dependencies in automated checks use fakes. No live
  Gemini exam, grading request or SMTP delivery was sent.
- The repository's existing ignore rules keep mobile tests and build artifacts
  local. The new behavior/layout tests follow that existing policy; source files,
  bundled fonts/licenses and this report are available for a later commit.
