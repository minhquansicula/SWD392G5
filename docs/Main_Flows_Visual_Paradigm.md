# AIVES Main Flows — Visual Paradigm Paste-Ready Prompts

All prompts and diagram labels are in English. These describe the target business workflows from Sections 5–8, including proposed functionality; they do not claim that all features are implemented.

## How to use

- **Visual Paradigm Desktop with AI Diagram Generation:** choose **Tools > AI Diagram Generation > Activity Diagram**, then paste one prompt block below and generate one diagram at a time.
- **Visual Paradigm AI Chatbot:** paste one prompt and request an editable UML activity diagram.
- **PlantUML-capable editor / VPasCode:** use the matching `.puml` file or copy its block from [Main_Flows_PlantUML.md](Main_Flows_PlantUML.md). A normal drawing canvas is not a PlantUML code-input field.
- Feature availability depends on the Visual Paradigm product/version/license. These sources have not been imported into your installed Visual Paradigm application.

## Modeling conventions

- Swimlanes show responsibility, not an extra set of use-case actors. AIVES includes the application's Viva integration; Gemini AI Service supplies AI capabilities.
- RAG is an AIVES retrieval process that supplies course context to Gemini. Do not draw RAG, STT, and TTS as three independent actors for this Gemini Live design.
- AI scores remain suggestions. Only an authorized lecturer finalizes official grades; students see only their own published results.
- A question's follow-up limit is separate from the total follow-up limit and the session deadline.
- Evidence capture accompanies the voice examination. Audio streamed to Gemini is not automatically a stored examination recording.
- Use decisions, merges, loops, forks/joins, initial nodes, and final nodes. `include` and `extend` belong to use case diagrams, not these activity diagrams.

## Flow index

| Flow | Activity diagram | PlantUML source |
|---|---|---|
| 01 | Prepare the Question Bank and Rubrics | [01-question-bank-and-rubrics.puml](diagrams/main-flows/01-question-bank-and-rubrics.puml) |
| 02 | Prepare Exams and Schedules | [02-exam-and-schedule-management.puml](diagrams/main-flows/02-exam-and-schedule-management.puml) |
| 03 | Conduct a Voice Viva with Adaptive Follow-Ups | [03-voice-viva-and-adaptive-follow-ups.puml](diagrams/main-flows/03-voice-viva-and-adaptive-follow-ups.puml) |
| 04 | Generate AI Suggestions and Finalize Grades | [04-ai-grading-and-lecturer-finalization.puml](diagrams/main-flows/04-ai-grading-and-lecturer-finalization.puml) |
| 05 | Capture, Monitor, and Retrieve Evidence | [05-evidence-capture-and-review.puml](diagrams/main-flows/05-evidence-capture-and-review.puml) |
| 06 | Provide Feedback, Analytics, and Grade Exports | [06-feedback-analytics-and-grade-export.puml](diagrams/main-flows/06-feedback-analytics-and-grade-export.puml) |
| 07 | Administer Accounts, Courses, Permissions, and Languages | [07-account-permission-and-language-administration.puml](diagrams/main-flows/07-account-permission-and-language-administration.puml) |

## Flow 01 — Prepare the Question Bank and Rubrics

Copy the entire prompt below:

```text
Create a UML activity diagram titled "AIVES - Prepare the Question Bank and Rubrics".
Use swimlanes: Lecturer, AIVES, Gemini AI Service.
Precondition: the lecturer is authenticated and authorized for the course.

Start with the lecturer selecting a course/topic and creating or selecting a valid rubric. AIVES checks permissions, rubric criteria, and score ranges. Reject unauthorized or invalid requests.

Branch by question-creation method:
- Manual/import: the lecturer enters questions or imports a question file.
- AI generation: the lecturer selects/uploads course materials; AIVES extracts and indexes them if needed, retrieves relevant content using RAG, and sends the source context, topic, target Bloom levels, and rubric to Gemini AI Service. Gemini generates draft questions with source references. Processing or AI errors end with an error, not automatic approval.

Merge the branches, then AIVES validates basic draft data and saves editable questions as PENDING_REVIEW. The lecturer reviews or edits each question, expected answer, Bloom level, and rubric. Loop back for corrections until required data is valid. Then branch on lecturer approval: approved questions become APPROVED and eligible for exams; rejected questions become REJECTED and remain ineligible. Record reviewer, timestamp, and audit events.

Use initial/final nodes, labeled decision guards, and an explicit correction loop. Generate one editable activity diagram. Do not use use-case include/extend relationships.
```

## Flow 02 — Prepare Exams and Schedules

Copy the entire prompt below:

```text
Create a UML activity diagram titled "AIVES - Prepare Exams and Schedules".
Use swimlanes: Lecturer, AIVES, Student.
Precondition: the lecturer is authenticated and assigned to the course.

The lecturer selects a course. AIVES verifies permissions. The lecturer enters an exam title, examination period, maximum main questions, total follow-up limit, follow-up limit per main question, and answer time limits. AIVES validates the configuration; invalid data loops back for correction. Save the valid exam.

The lecturer selects students and individual time slots. AIVES checks student roles, duplicate students, one schedule per student per exam, slots within the exam period, and conflicting student schedules. Invalid batches loop back for correction. Save the entire valid batch atomically with PENDING status.

Branch on "Assign questions now?":
- Yes: AIVES loads approved course questions, applies the question-selection and consecutive-candidate repetition policy, and checks pool sufficiency. If sufficient, save question sets and question/answer/rubric snapshots atomically. If insufficient, show the error, keep schedules PENDING, and save no partial assignment.
- No: defer question assignment until the attempt starts.

Merge the branches. The student opens personal schedules; AIVES returns only that student's schedules. The student views course, exam, time slot, and rules. End.

Use clear decisions and correction loops. Generate an activity diagram, not a use case diagram.
```

## Flow 03 — Conduct a Voice Viva with Adaptive Follow-Ups

Copy the entire prompt below:

```text
Create a UML activity diagram titled "AIVES - Conduct a Voice Viva with Adaptive Follow-Ups".
Use swimlanes: Student, AIVES, Gemini AI Service.
AIVES includes the client/backend/Viva integration. Gemini is the supporting AI service. Do not create separate STT or TTS participants.

The student selects a personal schedule, checks the microphone, and requests start. AIVES verifies identity, ownership, PENDING status, and the scheduled time window. Reject an invalid start. If no question set exists, select approved course questions under the repetition policy and save question/answer/rubric snapshots. Insufficient questions leave the schedule PENDING.

AIVES starts the attempt atomically, records IN_PROGRESS and actual start time, initializes evidence capture and persistent progress, and initializes counters.

Outer loop: while main questions and session time remain and the student has not requested finish:
1. Load the next MAIN question and reset its per-main follow-up counter.
2. Inner loop: while the current question should be asked, time remains, and no finish has been requested:
   a. Persist question/delivery state; Gemini delivers the spoken question.
   b. AIVES opens an answer window with a deadline capped by the remaining session time.
   c. The student answers by voice; Gemini processes the audio and returns transcripts.
   d. AIVES closes the answer at turn completion/deadline, saves available transcript/timing evidence, and records ANSWERED or TIMED_OUT.
   e. If time remains, Gemini analyzes the answer using its question, expected answer, and rubric.
   f. Only if clarification is needed AND time remains AND the per-main follow-up allowance remains AND the total follow-up allowance remains: Gemini generates a targeted follow-up; AIVES links it to the MAIN, increments both follow-up counters, and repeats the inner loop with that follow-up. Otherwise exit the inner loop.
3. Advance to the next MAIN question. Exhausting one question's follow-up allowance must not end the whole exam.

On connection/AI error, persist available progress, pause audio, finalize the current evidence segment, and mark an interruption for recovery or authorized intervention. This branch must not mark the attempt successfully completed or invent an answer.

At normal completion, timeout, or student finish: stop voice interaction, finalize transcript and evidence, record COMPLETED and actual end time, leave grading PENDING_REVIEW, and request AI suggestions. Notify the student that official results await lecturer review/publication.

Show nested loops and labeled guards. AI suggestions must not become official grades.
```

## Flow 04 — Generate AI Suggestions and Finalize Grades

Copy the entire prompt below:

```text
Create a UML activity diagram titled "AIVES - Generate AI Suggestions and Finalize Grades".
Use swimlanes: AIVES, Gemini AI Service, Lecturer.
Precondition: an attempt has ended and its transcript plus expected-answer/rubric snapshots are available.
Start in the AIVES swimlane when the system receives the completed-attempt event. AI suggestion generation is automatic; the lecturer joins later to review and finalize.

AIVES loads the attempt and sets AI grading status PROCESSING. For each MAIN question, collect its main/follow-up answers, rubric snapshot, and relevant course content retrieved with RAG. Gemini suggests criterion/question scores and feedback with transcript evidence. AIVES validates score ranges, criterion IDs, and evidence references. Save valid outputs only as AI suggestions. On failure/insufficient evidence, mark the question for lecturer attention; never substitute a default sample score. Continue through the remaining MAIN questions.

AIVES records AI grading success/failure and keeps grading status PENDING_REVIEW. The lecturer selects the attempt; AIVES verifies grading permissions and rejects unauthorized access. Display the full transcript, available recordings, rubric, AI suggestions, and failure notices.

The lecturer reviews evidence and accepts or adjusts scores/feedback, grading manually where needed. On confirmation, AIVES validates all required lecturer scores and calculates the overall grade using the agreed rubric formula. Invalid scores loop back for correction.

Save question scores, official overall grade, grader, timestamp, and audit history atomically. Set FINALIZED. Branch on the lecturer's decision to publish: publish sets PUBLISHED and records its timestamp/audit event; deferral keeps the finalized result unavailable to students.

Keep examination completion, AI grading status, and official grading/publication status distinct. End with either FINALIZED or PUBLISHED.
```

## Flow 05 — Capture, Monitor, and Retrieve Evidence

Copy the entire prompt below:

```text
Create a UML activity diagram titled "AIVES - Capture, Monitor, and Retrieve Evidence".
Use swimlanes: Student, AIVES, Lecturer.
This evidence flow accompanies the student's voice examination; the student is the recorded participant, not the operator of evidence storage.

Start in the Student swimlane when the student starts a scheduled voice examination. AIVES then receives the authorized attempt-start event from the examination flow. Initialize audio recording and evidence metadata. Initialize video recording only when the online-exam policy requires it. Display recording status.

Use a fork for concurrent responsibilities:
1. During the examination, capture and store audio/video segments. On failure, record missing intervals, notify the user, and apply the agreed recovery policy. Otherwise update coverage metadata.
2. During the examination, persist actual questions, ordered/timestamped transcripts, connection status, and examination events.
3. If the lecturer requests monitoring, verify monitoring permissions and provide status or deny access. Monitoring must not be required for recording to proceed.

Join after the examination ends. Finalize files/checksums/time intervals, and mark coverage COMPLETE, PARTIAL, or FAILED. Preserve evidence according to the access/retention policy. Append audit events when scores are reviewed, adjusted, finalized, or published.

Later, the lecturer requests evidence for an attempt. AIVES checks authorization; unauthorized access is rejected. Authorized retrieval returns recordings, transcripts, questions, and grading history, clearly identifying missing recording segments, and records an evidence-access audit event. The lecturer reviews the evidence for verification or an appeal.

Use an explicit fork/join. Streaming to Gemini alone must not be shown as proof that recordings were stored. Do not add automated cheating detection.
```

## Flow 06 — Provide Feedback, Analytics, and Grade Exports

Copy the entire prompt below:

```text
Create a UML activity diagram titled "AIVES - Provide Feedback, Analytics, and Grade Exports".
Use swimlanes: Requester (Student or Lecturer), Student, AIVES, Lecturer.
Start in the Requester swimlane when a person opens reporting and chooses a request type. Use a decision to choose exactly one route: personal student report or lecturer analytics/export. Draw the routes independently, with no arrows between them and no shared merge or final node. AIVES receives and authenticates the request only after the user selects the result or exam and asks to view it.

Student branch:
The student selects a personal examination result. AIVES checks ownership and PUBLISHED status. If either check fails, show an access/unavailable message and end this route immediately. Otherwise load official overall/per-question scores, AI feedback, and lecturer feedback; label AI scores as suggestions; show the personal report; then end this route.

Lecturer branch:
The lecturer selects an exam or supported class roster and filters. AIVES checks permissions. If unauthorized, reject access and end this route immediately. Otherwise load finalized official grades and valid question results. Calculate score distributions, question difficulty by normalized scores, and answer success rates using an agreed threshold. Show unfinalized attempts separately; do not count them as zero. The lecturer reviews analytics.

If no export is requested, end the lecturer route after reviewing analytics. If export is requested, the lecturer chooses an institutional template and format. AIVES validates student codes, names, course/exam information, finalized grades, and template requirements. Invalid data produces an actionable error and ends the route. Valid data produces a downloadable report using official grades only, then ends the route.

Keep the diagram top-to-bottom: each error path ends beside its own check; do not route any connector back across the Student, AIVES, or Lecturer swimlanes. Do not require a student report to be viewed before lecturer analytics. Do not invent persistent class entities if only an exam roster is available.
```

## Flow 07 — Administer Accounts, Courses, Permissions, and Languages

Copy the entire prompt below:

```text
Create a UML activity diagram titled "AIVES - Administer Accounts, Courses, Permissions, and Languages".
Use swimlanes: Administrator, AIVES.
Start when an authenticated administrator chooses an operation. AIVES checks administrative permissions; reject unauthorized requests.

Use four mutually exclusive operation routes. Arrange them top-to-bottom as a simple decision chain. Each selected route ends at its own final node; the next decision is reached only when the previous operation was not selected:
1. Manage accounts: the administrator creates/imports/updates account data and roles. AIVES validates emails, student codes, uniqueness, and role rules. If valid, save the changes, send password-setup links where needed, record email delivery status, and write an audit event. Otherwise show validation errors.
2. Manage courses: the administrator views the course list, creates a course with its code/name, updates course details, or requests permitted deletion. AIVES validates required fields, course-code uniqueness, course existence, and deletion constraints. Return course details for view requests; save valid changes and write an audit event for modifications. Reject invalid changes or deletion that would violate retention/relationship constraints. Preserve examination evidence.
3. Assign lecturers to courses: the administrator assigns or removes lecturers from a selected course. AIVES validates the course and Lecturer role, saves valid assignment changes, and writes an audit event. Otherwise show assignment errors. This is independent of course creation or editing.
4. Configure voice language: the administrator selects Vietnamese or English. AIVES validates AI integration support. Supported settings are saved with administrator identity, timestamp, and an audit event. Unsupported settings are rejected.

Show the operation outcome and end inside each route. Add a note beside the language route: each new examination attempt captures its effective language, and existing attempts retain their captured configuration.

Keep only Administrator and AIVES swimlanes. Use short action labels and local error exits. Do not merge the four routes or draw connectors across other routes; do not make account creation a prerequisite for a language change.
```

## Official format references

- [Visual Paradigm: Generate an Activity Diagram with AI in VP Desktop](https://guides.visual-paradigm.com/ai-activity-diagram-generator-by-visual-paradigm/)
- [Visual Paradigm: PlantUML editor and VPasCode workflow](https://www.visual-paradigm.com/solution/ai-diagramming-chatbot/ai-plantuml-generator-editor/)
- [PlantUML activity diagram syntax](https://plantuml.com/activity-diagram-beta)

