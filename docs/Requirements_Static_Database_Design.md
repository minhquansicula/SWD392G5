# AIVES — Requirements Modeling, Main Flows, Static Modeling, and Database Design

**Requirements baseline:** The project description supplied by the team on October 17, 2026, covering seven functional groups. This description is the business requirements baseline for this document; older repository documents are used to compare implementation details.  
**Scope:** Question bank and rubric management; exam and schedule management; AI interview core; AI-assisted grading; monitoring and transparency; feedback and reporting; and system administration. Group 3 is mandatory, and the lecturer always decides the final grade. If implementation is limited by milestone, the selected functional groups must be stated explicitly. The sections below describe the complete product based on the latest information.  
**Conventions:** **[Existing]** identifies models or logic present in the referenced source code. **[Proposed]** identifies target requirements that are not yet fully integrated. An entity, interface, or standalone demo does not establish that a feature is complete. **Diagram drawing notes** provide textual specifications for the team to turn into figures. This documentation update does not change application code or the database.

## 5. Requirements Modeling

### 5.1. Actors

| Actor | Role and main interactions |
|---|---|
| **Administrator** | Manages accounts and courses (view, create, update, and permitted deletion), assigns lecturers to courses, and configures Vietnamese/English settings for voice functions. Access to exam records or grades must follow the authorization policy; administrative status does not automatically grant the lecturer's authority to finalize grades. |
| **Lecturer** | Creates, imports, generates, and reviews questions; manages Bloom levels and rubrics; organizes exams and schedules; reviews evidence; adjusts and finalizes grades; views analytics and exports grade reports. |
| **Student** | Views personal schedules, participates in voice-based viva examinations, and views personal reports after the lecturer finalizes and publishes the results. |

**The three business actors are Administrator, Lecturer, and Student.** The AI Examiner describes system behavior rather than a user role. STT, TTS, and LLM are technical capabilities rather than three business actors. If the diagram boundary covers only Spring Boot, a single supporting actor, **`Viva AI Service`** (Python), may be shown. If the boundary covers the complete AIVES solution, including Python, Viva is an internal component. The Gemini API and email service are external dependencies that may be included when the diagram needs to describe technical integration.

### 5.2. Overall Use Case Diagram — Drawing Notes

Draw one system boundary named **AIVES**, covering Spring Boot, client applications, and Viva AI when integrated. Place the three business actors, **Administrator, Lecturer, and Student**, outside the boundary and connect them to the following use cases.

| Group | Use cases within AIVES | Primary actor | Repository implementation status |
|---|---|---|---|
| Common functions | UC00 — Sign in; set up or recover a password | All three roles | Authentication and password-link APIs exist. |
| 1. Question bank and rubrics | UC01 — Manage questions (create/import/edit/remove); UC02 — Generate questions from course materials; UC03 — Review AI-generated questions; UC04 — Manage rubrics and assign rubrics/Bloom levels to questions | Lecturer | Java provides question CRUD and batch creation. File import, Bloom labels, AI review, and rubrics are incomplete. The Viva v2 demo has separate document, RAG, and rubric features. |
| 2. Exams and schedules | UC05 — Manage exams and limits; UC06 — Manage schedules and candidate lists; UC07 — Assign question sets; UC08 — View personal schedules | Lecturer (UC05–07), Student (UC08) | Scheduling and assignment logic exists; adaptive selection requires further work. |
| 3. AI interview core (mandatory) | UC09 — Participate in a voice viva; UC10 — Ask adaptive follow-up or clarification questions | Student | A start API exists. The Python bridge and Viva v2 demo provide a voice core; complete integration with exam business rules has not been established. |
| 4. AI-assisted grading | UC11 — Review transcripts and AI-suggested scores; UC12 — Adjust and finalize grades | Lecturer | AI/lecturer score fields exist; the review and finalization workflow requires completion. |
| 5. Monitoring and transparency | UC13 — Monitor examination status; UC14 — Retrieve evidence and grading history | Lecturer | Some connection and recording-URL fields exist; complete session recording and business audit trails are not implemented. |
| 6. Feedback and reporting | UC15 — View a personal report; UC16 — View class analytics; UC17 — Export a grade report using an institutional template | Student (UC15), Lecturer (UC16–17) | Related interfaces and models exist; a complete reporting backend is not available. |
| 7. Administration | UC18 — Manage accounts; UC19 — Assign lecturers to courses; UC20 — Configure Vietnamese/English voice settings; UC21 — Manage courses (view/create/update/permitted deletion) | Administrator | Account, course, and assignment APIs exist; complete language administration is not available. |

**Relationships to draw:** UC10, “Ask adaptive follow-up or clarification questions,” `<<extend>>` UC09, “Participate in a voice viva,” when an answer needs clarification and both time and follow-up allowance remain. If evidence capture is represented as a shared use case, UC09 `<<include>>` “Capture examination evidence.” Connect UC02 and UC03 directly to Lecturer. Review may occur after generation, so `include` should not be used merely to express their order. Authorization, time-window, and data checks are use case preconditions or branches; authentication may also be a precondition. An `include` relationship is not needed for every processing step.

**External-system notes:** If supporting actors are required, `AI Provider (Gemini)` and `Email Service` may be placed outside the complete AIVES boundary. If the boundary covers only the business backend, use `Viva AI Service` for the external Python service. In a single diagram, Viva must have one consistent position relative to the boundary. STT/TTS capabilities are required whether Gemini Live or a pipeline of separate services is selected.

### 5.3. Non-Functional Requirements

| ID | Quality requirement | Proposed acceptance or verification approach |
|---|---|---|
| NFR-01 | **Security and privacy** | Use JWT authentication and authorization based on roles and exam/session ownership; transmit data over HTTPS/WSS; restrict access to audio, transcripts, and grades; never store password-setup tokens in plaintext. |
| NFR-02 | **Data integrity** | Allow at most one schedule per student per exam; assign questions once per attempt and preserve `content_snapshot`; execute scheduling, assignment, and exam-start operations consistently within transactions. |
| NFR-03 | **Conversational latency** | Measure the time from the end of a student's speaking turn to the start of response audio. Agree on an acceptance threshold after choosing the Viva implementation. Provide processing indicators and timeout handling. |
| NFR-04 | **Vietnamese speech recognition quality** | Test transcripts against voice samples and terminology from each course. Gemini Live transcripts may be used if Viva v2 is selected. Lecturers must be able to compare transcripts with recordings. |
| NFR-05 | **Availability and recovery** | Persist session state in the database; after a disconnect or refresh, reload history and resume according to the agreed timing policy. |
| NFR-06 | **Scalability and maintainability** | Separate auth, exam, interview, and reporting modules; define a clear Spring Boot–Viva contract if Python is used; index schedule and result queries. |
| NFR-07 | **Auditability** | Preserve question-assignment times, start/end times, transcripts, AI scores, lecturer scores, and grader identity. Exports must use official grades. |
| NFR-08 | **Lecturer grading authority** | AI scores are advisory. Published grades require explicit lecturer review/finalization and an identified grader. |
| NFR-09 | **Question and grading consistency** | Preserve question, expected-answer, and rubric versions used during the examination. Later question-bank changes must not alter the grading basis of earlier attempts. |
| NFR-10 | **Evidence transparency** | Record recording errors or missing segments; retain questions, answers, AI suggestions, and every lecturer score adjustment/finalization. Agree on access and retention policies with the team/institution. |
| NFR-11 | **Language support and usability** | Support Vietnamese/English configuration for voice interaction; provide microphone checks, transcripts, processing states, and understandable error messages. |

Quantitative targets for latency, uptime, concurrent candidates, and Vietnamese transcript quality **are not consistently specified in the repository**. These targets must be agreed before performance acceptance testing.

### 5.4. Business Rules

- BR01: AI-generated questions remain drafts until a lecturer reviews, edits, approves, or rejects them. Questions used in examinations must have a course/topic, a Bloom label, and a valid rubric.
- BR02: The Bloom levels in scope are **remember, understand, apply, and analyze**. `difficulty_level` does not replace the Bloom label because difficulty and cognitive level are different attributes.
- BR03: Each student's question set must respect the main-question limit, total follow-up limit, and follow-up limit per main question. Define a policy to avoid repetition between consecutive candidates. If the pool is insufficient, ask the lecturer to adjust the configuration; random selection alone cannot guarantee zero repetition.
- BR04: Ask a follow-up only when an answer is vague, incomplete, or inconsistent and time/allowance remain. Reaching one main question's follow-up limit advances to the next main question if available; it does not by itself end the entire examination.
- BR05: Grade against the expected-answer/rubric snapshots for the attempt. Distinguish AI suggestions, lecturer scores per question, and the official overall grade. Missing evidence or AI errors must produce a status requiring attention rather than a fabricated score.
- BR06: The lecturer reviews the evidence and confirms the final grade. Students may view only their own reports after publication. A session marked `COMPLETED` does not imply that its grade has been finalized.
- BR07: Record audio throughout the examination and record video according to the agreed online-exam arrangement. Preserve questions, answers, and grading history for review or grade appeals. Transcripts do not replace audio/video evidence.
- BR08: Response time and fluency are optional supplementary signals. Include them in grading only when the rubric defines their use and suitable measurements exist. Fluency must not be inferred solely from a transcript.

## 6. Main Flows

Paste-ready diagram assets: [Visual Paradigm AI prompts](Main_Flows_Visual_Paradigm.md) and [PlantUML activity diagram sources](Main_Flows_PlantUML.md). Each file covers the seven flows below. The voice and grading diagrams use Gemini AI Service as the supporting AI service, with RAG retrieval handled by AIVES.

### Flow 1 — Prepare the Question Bank and Rubrics (Group 1)

**Actor:** Lecturer. **Precondition:** The lecturer is authenticated and authorized for the course.

1. The lecturer selects a course/topic and creates or imports course materials and a rubric containing criteria, achievement-level descriptions, and score ranges.
2. The lecturer creates/imports questions or asks AI to generate questions from the materials using RAG. AI-generated questions remain in draft/pending-review status, with source references when available.
3. The lecturer reviews and edits the questions, assigns Bloom levels (remember/understand/apply/analyze), expected answers, and rubrics, and approves or rejects AI-generated questions.
4. The system validates the data and makes only approved questions available for examination selection.

**Exception paths:** Invalid files, failed text extraction, missing rubric criteria/score ranges, or AI-generation errors produce an error and retain an editable status. AI-generated questions must not be approved automatically.

**Drawing notes:** Use lanes `Lecturer | AIVES`. Branch on “create/import/generate with AI.” After AI generation, add “lecturer approves?” leading to approval, revision, or rejection, followed by the official question bank.

**Implementation comparison:** Java supports question CRUD/batch creation. The Viva v2 demo supports document processing and rubric/RAG features. A complete integrated question-bank workflow with Bloom labels and lecturer approval is not available.

### Flow 2 — Prepare Exams and Schedules (Group 2)

**Precondition:** The lecturer is authenticated, assigned to the course, and has access to its question bank.  
**Main flow:** (1) The lecturer creates an exam with its course, time range, main-question limit, total/per-question follow-up limits, and answer time limits. (2) The system validates permissions and configuration, then saves the exam. (3) The lecturer selects students and their time slots. (4) The system validates student roles, ensures slots fall within the exam period, checks for conflicts, and saves `PENDING` schedules. (5) The lecturer assigns questions to schedules, or the system assigns them at the start. The system selects approved questions from the correct course, applies the repetition policy, and saves question/answer/rubric snapshots. (6) Students view their personal schedules.

**Exception paths:** Insufficient questions, duplicate students in a request, an existing schedule for the same exam, overlapping slots, slots outside the exam period, or repeated assignment produce an error. A batch must not be partially saved.

**Activity/swimlane drawing notes:** Use three lanes, `Lecturer | AIVES | Student`. Decision nodes: “valid configuration?”, “valid schedule?”, and “enough questions under the selection policy?”. End with a `PENDING` schedule and the student viewing it.

**Implementation comparison:** Java provides exam/schedule logic, one-time assignment, and question-content snapshots. The current algorithm prioritizes unused or least recently used questions. Approved-question filtering, rubric snapshots, and complete adaptive selection require further work.

### Flow 3 — Conduct a Voice Viva with Adaptive Follow-Ups (Group 3, Mandatory)

**Precondition:** The student has a `PENDING` schedule and the current time is within its examination window.  
**Target flow:** (1) The student selects the schedule, checks the microphone, and starts. (2) The system validates permissions, schedule, and time window, prepares the question set and grading basis, and records `IN_PROGRESS` and `actual_start_time`. (3) AI delivers a spoken question, and the student answers by voice. The system produces a near-real-time transcript and captures evidence. (4) AI analyzes the answer against the question, expected answer, and rubric. (5) If clarification is needed and time/allowance remain, AI asks a follow-up and receives another answer; otherwise, it advances to the next main question. (6) When questions or time run out, the system ends the attempt, finalizes the transcript, records the end time, and requests suggested grading. Official grading is handled in Flow 4.

**Viva v2 option:** The client streams audio bidirectionally through Python, which connects to Gemini Live and receives transcripts for both sides. Voice interaction does not require three separate STT/TTS/LLM APIs. The system must enforce question limits and deadlines; prompt instructions alone do not guarantee compliance. This remains an integration option: replacing the `python/` bridge with the Viva v2 demo has not been finalized.

**Exception paths:** Requests before/after the permitted window or for an already-started attempt are rejected. Disconnections use persisted state according to the integration recovery policy. Audio/Gemini Live errors or timeouts produce visible status and follow the agreed retry/time-limit policy. The Viva v2 demo does not recover lost audio perfectly.

**Activity/swimlane drawing notes:** Use two business lanes, `Student | AIVES`, and a loop: `deliver question → answer → save transcript → analyze → follow up/advance`. Decisions: “time and main questions remaining?” and “clarification needed AND allowance remaining AND time remaining?”. A technical diagram may instead use `Client | Spring Boot | Viva v2 | Gemini API`; technical lanes do not create additional business actors.

### Flow 4 — Generate AI Suggestions and Finalize Grades (Group 4)

**Precondition:** The attempt has ended, and its transcript and expected-answer/rubric snapshots are available.

1. The system submits evidence from each main question and its follow-ups to AI grading against the examination-time rubric and expected-answer snapshots.
2. It saves AI-suggested scores per question/criterion and feedback covering strengths, weaknesses, and missing points. Any AI overall score remains advisory.
3. The lecturer opens the attempt, reads the full transcript, plays authorized recordings, and reviews AI suggestions.
4. The lecturer accepts or adjusts scores/feedback and confirms the final grade. The system validates score ranges and records the grader, timestamp, and change history.
5. The result becomes finalized. Students can view the report only after publication. Finalization and publication may be combined into one interface action if the team chooses that policy.

**Implementation comparison:** The Python bridge currently sends `final_score` immediately after AI grading. During integration, this value must be treated as an **AI suggestion** rather than overwriting the official grade. Viva v2 grades by rubric criteria; criteria must be mapped to the questions asked to support per-question reports. Criterion scores cannot be arbitrarily treated as question scores.

**Exception paths:** AI errors or insufficient evidence mark the attempt as requiring attention; a lecturer may grade from the evidence. Out-of-range scores and unauthorized finalization are rejected. Grading-service errors must not produce a default sample score.

**Drawing notes:** Use lanes `AIVES | Lecturer`: `AI suggestion → lecturer reviews evidence → accept/adjust → confirm → save grades and audit log → publish`. Session status `COMPLETED` and grading/publication status are independent.

### Flow 5 — Capture, Monitor, and Retrieve Evidence (Group 5)

**Actor:** Lecturer; the student's examination is recorded. This flow runs alongside Flows 3–4 and supports later review.

1. At the start, the system initializes a full-session audio recording and video recording if required by the online-exam arrangement, and displays recording status.
2. Throughout the attempt, it saves actual questions, ordered/timestamped transcripts, connection status, and examination events. The lecturer monitors status within granted permissions.
3. At the end, it finalizes recordings and metadata, marking them complete, partial, or failed as appropriate.
4. When a lecturer grades, adjusts, or finalizes scores, the system preserves AI scores, lecturer scores, and change logs separately.
5. An authorized lecturer selects an attempt to review recordings, transcripts, questions, and grading history for verification or an appeal.

**Exception paths:** Recording failures or network loss record the missing interval and notify the user for handling under examination rules. Incomplete recordings must not be presented as complete. Unauthorized access is rejected.

**Drawing notes:** Use lanes `Student | AIVES | Lecturer`. Evidence capture runs in parallel with the conversation and ends with “finalize recording.” Add a separate post-exam retrieval branch leading to the evidence record. Automatic cheating detection is outside this flow unless separately specified.

**Implementation comparison:** Java has recording-URL fields. Viva v2 does not preserve original full-session audio. Streaming audio/camera data to a model does not establish that audio/video evidence has been stored.

### Flow 6 — Provide Feedback, Analytics, and Grade Exports (Group 6)

**Precondition:** Finalized results exist. A student may access only their own published results.

1. The student opens a personal report. The system checks ownership and publication status, then displays per-question scores, the overall grade, AI feedback, and lecturer feedback where available. Displayed AI scores must be labeled as suggestions.
2. The lecturer selects an exam/class roster and filters. The system aggregates official grades to show score distributions, the most difficult questions, and answer success rates.
3. The lecturer selects an institutional export template. The system validates student codes, names, course/exam information, and finalized grades, then creates a downloadable grade report.

**Proposed analytics rules:** Rank question difficulty by the lowest average normalized score, showing the number of valid observations. Use an agreed institutional/team threshold for answer success. Use official overall grades for score distributions. Show unfinalized attempts separately rather than treating them as zero. Question comparisons must use consistent content versions and score scales.

**Drawing notes:** Use lanes `Student | AIVES | Lecturer`. Separate personal-report access from analytics/export. Check “published and owned by this student?” before showing the personal report and “valid data and template?” before export.

**Meaning of “class-wide”:** The Java schema currently has student rosters per exam. Analytics for a course section across multiple exams require `Class`, `ClassStudent`, and exam–class relationships. An exam roster should not be presented as a persistent course section without those relationships. Export templates, analytics thresholds, and overall-score formulas must be agreed before implementation.

### Flow 7 — Administer Accounts, Courses, Permissions, and Languages (Group 7)

**Actor:** Administrator. **Precondition:** The administrator is authenticated with the appropriate management permissions.

The administrator chooses one of four operations:

1. **Manage accounts:** Create/import/update accounts, assign roles, and send password-setup links.
2. **Manage courses:** View the course list, create a course with its code/name, update course information, or request permitted deletion. The system checks required data, code uniqueness, and deletion constraints, then records changes in the audit log. Examination evidence must be preserved.
3. **Assign lecturers to courses:** Assign or remove lecturers from a course. The system validates Lecturer roles, course existence, and administrative permissions, then logs changes.
4. **Configure voice language:** Select Vietnamese or English. The system validates support in the AI integration and logs the change. Each new attempt captures its effective language; existing attempts retain their captured setting under the proposed policy.

**Exception paths:** Duplicate emails/student codes/course codes, missing course information, deletion that violates retention or relationship constraints, invalid roles, assignment of a non-lecturer, or unsupported languages are rejected with an explanation.

**Drawing notes:** Use lanes `Administrator | AIVES`. Account management, course management, lecturer assignment, and language configuration are four alternative branches. Each operation checks permissions and validates its own data. Write audit events for changes. Course management and lecturer assignment are separate use cases; neither must execute every time the other is used.

## 7. Static Modeling

**Database-baseline note:** This section distinguishes earlier Java models and target conceptual proposals. For the exact 11-table schema supplied on October 18, 2026, including normalized roles and question-specific rubric items, use Section 8.1 and [Data_Dictionary.md](Data_Dictionary.md).

### 7.1. Conceptual ERD — Drawing Notes

**Existing foundation:** The nine Java entities are **User, Course, CourseLecturer, Question, Exam, ExamSchedule, AssignedQuestion, Transcript, and QuestionResult**. These entities alone do not cover all seven functional groups. `CourseLecturer` represents the many-to-many relationship between courses and users with the Lecturer role. `AssignedQuestion` represents a **main question** assigned from the bank with a content snapshot. `Transcript` and `QuestionResult` hold interview and grading data. Exclude `flyway_schema_history` from the business ERD.

| Relationship | Multiplicity and meaning |
|---|---|
| Course — CourseLecturer — User | A course can have multiple lecturers; a lecturer can teach multiple courses. |
| Course — Question; Course — Exam | A course can contain multiple questions and exams. Each question/exam belongs to one course under the business rules. |
| User (creator) — Exam | A user can create multiple exams; an exam has at most one recorded creator. |
| Exam — ExamSchedule — User (student) | An exam can have multiple schedules. A student can have schedules in different exams, with at most one schedule per exam. |
| ExamSchedule — AssignedQuestion — Question | An attempt can contain multiple assigned main questions; a bank question can be used in multiple attempts. |
| ExamSchedule — Transcript; Transcript — Transcript | An attempt has multiple utterances. `parent_transcript_id` supports conversation threading. |
| ExamSchedule — QuestionResult; Question — QuestionResult | An attempt has per-question results; a bank question can have results from multiple attempts. |

**Proposed extension:** Add `ExamQuestion` to represent AI-generated follow-ups and associate grading with the actual question asked. Its attributes include `question_type`, `source_question_id?`, `parent_exam_question_id?`, `content_snapshot`, `question_order`, deadlines, and status. Link `Transcript` and `QuestionResult` to `ExamQuestion`. This option appears in `database/db_schema_updated.sql` and **is not the current JPA model**.

**Target conceptual ERD for all seven functional groups — draw these entities and relationships:**

| Entity or relationship | Purpose and multiplicity |
|---|---|
| `User — CourseLecturer — Course` | Lecturers and courses have a many-to-many assignment relationship. `User.role` distinguishes Administrator, Lecturer, and Student. |
| `Course 1 — 0..* CourseDocument` | Course materials provide the knowledge sources for RAG. |
| `Course 1 — 0..* Question` | Questions have topics, Bloom levels, expected answers, origins, and review statuses. `CourseDocument 0..1 — 0..* Question` means a question can have one primary source document, while a document can produce multiple questions. Additional citations may be stored in metadata. |
| `Course 1 — 0..* Rubric`; `Rubric 1 — 1..* RubricCriterion` | A rubric contains multiple criteria and achievement levels/score ranges. Used rubrics retain their versions. |
| `Rubric 0..1 — 0..* Question` | A rubric can apply to multiple questions; each question has at most one currently assigned rubric version. Drafts may lack a rubric; questions approved for use must have a valid rubric. |
| `Course 1 — 0..* Exam`; `Exam 1 — 0..* ExamSchedule` | An exam belongs to a course. A schedule represents a student's attempt in that exam. |
| `User (Student) 1 — 0..* ExamSchedule` | A student can have multiple attempts across exams. Every schedule must identify one student. |
| `ExamSchedule 1 — 0..* ExamQuestion`; `Question 0..1 — 0..* ExamQuestion` | Actual session questions preserve content, expected-answer, and rubric snapshots. Questions generated during the interview may have no bank source. |
| `ExamQuestion (MAIN) 1 — 0..* ExamQuestion (FOLLOW_UP)` | Every follow-up references one main question in the same attempt. A main question has no parent. |
| `ExamSchedule 1 — 0..* Transcript`; `ExamQuestion 0..1 — 0..* Transcript` | Each utterance belongs to an attempt and may reference its current question. Greetings or announcements may have no question reference. |
| `ExamQuestion (MAIN) 1 — 0..1 QuestionResult` | A result contains AI and lecturer scores/feedback plus criterion-level details. Under the proposed policy, follow-ups provide evidence for the main question. |
| `ExamSchedule 1 — 0..* Recording` | Recording metadata covers audio/video files or segments. Track whether these provide complete session coverage. |
| `User (Lecturer) 0..1 — 0..* ExamSchedule (gradedBy)` | The finalizing lecturer may be absent before grading but is required after finalization/publication. |
| `User 0..1 — 0..* AuditLog` | Logs administration, question review, grading, score changes, and finalization. Automated events may have no user actor. AuditLog identifies the affected record by object type and ID. |
| `SystemSetting` | Stores system-wide configuration, including language. The effective language setting is captured for each attempt. |

`DocumentChunk` is a RAG storage detail and may appear only in the logical database diagram. Reports and analytics aggregate result data and do not require a separate Report entity. Add persistent course-section entities only if the team selects cross-exam class management as described in Flow 6. The target ERD uses `ExamQuestion`; if this replacement is selected, do not duplicate its role with `AssignedQuestion` in the same target model.

### 7.2. Class Diagram — Drawing Notes

**Existing domain classes (Java names):**

| Class | Attributes or operations to show | Associations |
|---|---|---|
| `User` | `id`, `email`, `fullName`, `role`, `studentCode`, password status | Referenced by ID from Exam/ExamSchedule. Do not add Administrator/Lecturer/Student subclasses because the code uses the `Role` enum. |
| `Course` | `id`, `courseCode`, `courseName` | 1–n `Question`, 1–n `Exam`, 1–n `CourseLecturer`. |
| `CourseLecturer` | `CourseLecturerId`, `assignedAt`, `assignedById` | n–1 `Course`, n–1 `User` (lecturer). |
| `Question` | `id`, `content`, `difficultyLevel`, `topic`, `expectedAnswer` | n–1 `Course`; 1–n `AssignedQuestion`. |
| `Exam` | `id`, `title`, `startDate`, `endDate`, question/time limits, `createdById` | n–1 `Course`; 1–n `ExamSchedule`. |
| `ExamSchedule` | `id`, `studentId`, scheduled/actual times, `status`, `finalScore`, `gradedById` | n–1 `Exam`; 1–n `AssignedQuestion`. |
| `AssignedQuestion` | `id`, `questionOrder`, `contentSnapshot`, `assignedAt` | n–1 `ExamSchedule`, n–1 `Question`. |
| `Transcript` | `id`, `examScheduleId`, `questionId`, `role`, `textContent`, `audioUrl`, `createdAt`, `parentTranscript` | UUID references to the attempt/question; self-association to its parent transcript. |
| `QuestionResult` | `id`, `examScheduleId`, `questionId`, `aiScore`, `maxScore`, `lecturerScore`, feedback | UUID references to the attempt/question. |

**Service classes to place below the domain classes:** `ExamServiceImpl` manages exams; `ExamScheduleServiceImpl` validates, schedules, and starts attempts; `QuestionAssignmentService` selects questions and captures snapshots; `ExamAccessService` checks permissions; `AuthServiceImpl` authenticates users; and `AdminUserServiceImpl` manages accounts. Draw dependencies from services to their entities/repositories; services are not database tables. If Python is included, use actual classes such as `VivaLiveSession`, `GraderService`, and `BackendClient` from `python/`, or `VoiceRoom`, `InterviewService`, and `GeminiGateway` from the Viva v2 demo. The selected implementation remains undecided, so do not combine both alternatives into one implementation class diagram. Separate STT/TTS/LLM classes or actors are not required merely to match the older pipeline documentation.

**Additional classes for the target design:**

| Class | Proposed attributes or methods | Relationships and responsibilities |
|---|---|---|
| `CourseDocument` | `id`, `courseId`, `filename`, `status` | Source material; contains multiple `DocumentChunk` objects when RAG details are shown. |
| `Rubric`, `RubricCriterion` | `version`, `criteria`; `code`, `description`, `maxScore`, `scoreBands` | `Rubric` contains criteria. Define the overall-score formula explicitly rather than allowing the model to choose it. |
| `Question` (extended) | `bloomLevel`, `origin`, `reviewStatus`, `rubric`; `approve()`, `reject()`, `archive()` | Only approved questions with valid rubrics can be selected. Services must enforce authorization for these operations. |
| `ExamQuestion` | `questionType`, `parent`, `contentSnapshot`, `expectedAnswerSnapshot`, `rubricSnapshot`, `answerDeadline` | Represents actual questions asked, extending beyond bank-only assignments. |
| `ExamSchedule` (extended) | `aiGradingStatus`, `gradingStatus`, `gradedAt`, `publishedAt`, `languageCode` | Keeps examination state separate from grading/publication state. |
| `Recording`, `AuditLog`, `SystemSetting` | Recording/media type/status; actor/action/time; configuration key/value | Supports transparency, review, and administration. |
| `QuestionBankService` | `importQuestions()`, `generateDrafts()`, `reviewQuestion()` | Generates drafts from materials/rubrics and manages review. |
| `VivaIntegrationService` | `openSession()`, `resumeSession()`, `finishSession()` | Defines Spring–Viva integration and maps exam schedules to AI sessions. |
| `GradingService` | `requestAiSuggestion()`, `reviewScores()`, `finalizeGrade()`, `publishGrade()` | Separates AI suggestions from official grades, checks lecturer permissions, and records audit events. |
| `EvidenceService`, `ReportingService` | `storeRecording()`, `getEvidence()`; `getStudentReport()`, `aggregateExam()`, `exportGrades()` | Stores/retrieves authorized evidence; aggregates finalized grades and exports institutional reports. |

The methods above are proposed design operations rather than existing repository method names. A domain class diagram needs only entities and associations. Service dependencies may be placed in a separate figure for readability.

## 8. Database Design

### 8.1. Database Diagram Based on the Supplied SQL — Drawing Notes

The database baseline is the user-supplied `SWD392 - AI Interview.sql`, received on October 18, 2026, and preserved in [database/reference/SWD392_AI_Interview.sql](../database/reference/SWD392_AI_Interview.sql). It contains 11 tables and 85 columns. This section supersedes the earlier combined snapshot/migration interpretation. The SQL has been documented, not executed against a running database.

Use `PK` for primary keys, `FK` only for declared foreign keys, and `?` for nullable references. Draw the following relationships:

```text
roles.id             <- users.role_id
users.id             <- course_lecturers.lecturer_id, exams.created_by?, exam_schedules.student_id
courses.id           <- course_lecturers.course_id, exams.course_id, questions.course_id
exams.id             <- exam_schedules.exam_id
questions.id         <- rubrics.question_id, assigned_questions.question_id
exam_schedules.id    <- assigned_questions.exam_schedule_id, question_results.exam_schedule_id
assigned_questions.id <- transcripts.assigned_question_id
transcripts.id       <- transcripts.parent_transcript_id?
rubrics.id           <- question_results.rubric_id
```

- `course_lecturers` has composite PK `(course_id, lecturer_id)`.
- `roles.role_code`, `users.student_code`, `users.email`, `users.email_normalized`, `users.password_token_hash`, and `courses.course_code` have declared uniqueness.
- Composite unique indexes cover `rubrics(question_id, display_order)`, `exam_schedules(exam_id, student_id)`, `assigned_questions(exam_schedule_id, question_id)`, and `assigned_questions(exam_schedule_id, question_order)`.
- `course_lecturers.assigned_by` and `exam_schedules.graded_by` have no declared FK. Show any logical link to users as a documented design intention, not an enforced database relationship.
- `transcripts` refers only to `assigned_question_id` and its optional parent transcript; there are no direct transcript columns for exam schedule or bank question.
- `question_results` refers to `rubric_id` and `exam_schedule_id`, not `question_id` or `assigned_question_id`. Each rubric row belongs to one question, so results are interpreted at rubric-item level.
- FK deletion actions and exact constraint/index names are listed in the standalone dictionary.

### 8.2. Data Dictionary

**Complete column-by-column dictionary:** [Data_Dictionary.md](Data_Dictionary.md). It lists all 85 columns with exact data types, nullable flags, keys, defaults, descriptions, CHECK constraints, 15 FKs, and 13 explicit index declarations. It uses only the supplied SQL as the database source.

| Table | Column count | Purpose |
|---|---:|---|
| `roles` | 4 | Stores the three supported application roles. |
| `users` | 13 | Stores user identity, authentication data, role membership, and password-setup metadata. |
| `courses` | 3 | Stores the courses used to organize questions, lecturer assignments, and exams. |
| `course_lecturers` | 4 | Associates lecturers with courses. Each course/lecturer pair can occur only once. |
| `exams` | 11 | Stores examination configuration, course association, examination period, and question/answer limits. |
| `questions` | 6 | Stores bank questions, their course, content, classification, and expected answers. |
| `rubrics` | 6 | Stores rubric items/criteria attached directly to questions. Each row has its own description, maximum score, and display order; this schema has no separate rubric header/criterion tables. |
| `exam_schedules` | 12 | Stores one student's scheduled attempt in an exam, timing, connection/recording metadata, and the overall grade. |
| `assigned_questions` | 6 | Stores bank questions assigned to an attempt, their ordering, and immutable-by-policy content snapshots. SQL alone does not prevent snapshot updates. |
| `transcripts` | 11 | Stores spoken/text utterances for assigned questions. Attempt and bank-question identity are obtained through assigned_questions, not direct transcript columns. |
| `question_results` | 9 | Stores grading records for an attempt and a rubric item. Results refer to rubrics.id, not directly to a question assignment; per-question grouping follows rubrics.question_id. |

A DEFAULT does not imply NOT NULL, and intended UUID references are not FKs unless the SQL declares them. The complete dictionary distinguishes actual SQL enforcement from application requirements and proposed improvements.

### 8.3. Earlier Alternative Design — Not Included in the Supplied SQL

**This subsection preserves an earlier design alternative; it is not the data dictionary of the supplied SQL.** The supplied baseline uses `roles`, question-specific rubric items, and results keyed by `rubric_id`. The course-level/versioned rubric and `exam_questions` proposals below must be reconciled with that baseline before any migration is adopted. They must not be applied as automatic extensions to Section 8.2. The Viva v2 demo also has its own schema and cannot be copied unchanged into the Java schema. For the actual submitted columns and constraints, use [Data_Dictionary.md](Data_Dictionary.md).

**Target drawing notes:** Draw the base tables `users`, `courses`, `course_lecturers`, `questions`, `exams`, `exam_schedules`, `transcripts`, and `question_results`, then add these relationships:

```text
courses.id        <- course_documents.course_id, rubrics.course_id
course_documents.id <- document_chunks.document_id, questions.source_document_id?
rubrics.id        <- rubric_criteria.rubric_id, questions.rubric_id?
users.id          <- questions.reviewed_by?, audit_logs.actor_id?, system_settings.updated_by?
exam_schedules.id <- exam_questions.exam_schedule_id, recordings.exam_schedule_id
questions.id      <- exam_questions.source_question_id?
exam_questions.id <- exam_questions.parent_exam_question_id?, transcripts.exam_question_id?, question_results.exam_question_id
```

`audit_logs.entity_type/entity_id` is an application-validated reference to different object types, not a database FK to every table. Store `rubric_snapshot` and `expected_answer_snapshot` on the examination question to preserve its grading basis. New primary-key IDs use `uuid`; new timestamps use `timestamptz`.

**A. Course materials and rubrics**

| Table.column | Type | Constraints and purpose |
|---|---|---|
| `course_documents.id` | uuid | PK. |
| `course_documents.course_id` | uuid | NN, FK `courses.id`; identifies the owning course. |
| `course_documents.filename` | varchar(255) | NN, document filename. |
| `course_documents.storage_uri` | text | Nullable; original-file location if the implementation retains it. Viva v2 retains extracted text/metadata rather than original files. |
| `course_documents.content_hash` | varchar(64) | NN, content hash for duplicate detection. |
| `course_documents.embedding_model` | varchar(120) | RAG embedding model; required after successful indexing. |
| `course_documents.status` | varchar(20) | NN; `PENDING/READY/FAILED`. Only READY documents may be used for RAG. |
| `document_chunks.id` | uuid | PK. |
| `document_chunks.document_id` | uuid | NN, FK to the source document. |
| `document_chunks.position` | int | NN, nonnegative; UQ `(document_id, position)`. |
| `document_chunks.text_content` | text | NN, extracted chunk text. |
| `document_chunks.page_number` | int | Nullable; page number when supported by the source format. |
| `document_chunks.embedding` | vector(768) | Option inherited from Viva v2. Vector dimensions must match the selected embedding model; changing the model/dimensions requires replacing incompatible embeddings. |
| `rubrics.id` | uuid | PK identifying one rubric version. |
| `rubrics.course_id` | uuid | NN, course FK. |
| `rubrics.title` | varchar(255) | NN, rubric title. |
| `rubrics.version` | int | NN, positive; UQ `(course_id, title, version)` under this design's stable-title convention. |
| `rubric_criteria.id` | uuid | PK. |
| `rubric_criteria.rubric_id` | uuid | NN, rubric FK. |
| `rubric_criteria.code` | varchar(50) | NN, UQ `(rubric_id, code)`. |
| `rubric_criteria.description` | text | NN, criterion description. |
| `rubric_criteria.max_score` | numeric(5,2) | NN, > 0; maximum criterion score. |
| `rubric_criteria.score_bands` | jsonb | NN, achievement descriptions for score ranges; validated by the application. |

The table above proposes additive criterion scoring. If weighted scoring from Viva v2 is selected, store weights, validate their total, and preserve one consistent formula in the snapshot. Do not arbitrarily mix averaging and additive scoring across the two models.

**B. Question-bank extensions and actual examination questions**

| Table.column | Type | Constraints and purpose |
|---|---|---|
| `questions.bloom_level` | varchar(20) | `REMEMBER/UNDERSTAND/APPLY/ANALYZE`; required before approval. |
| `questions.origin` | varchar(20) | NN; `MANUAL/IMPORT/AI`. |
| `questions.review_status` | varchar(20) | NN; `DRAFT/PENDING_REVIEW/APPROVED/REJECTED/ARCHIVED`. |
| `questions.rubric_id` | uuid | Rubric FK; may be null for drafts, required for APPROVED questions. |
| `questions.source_document_id` | uuid | Nullable, FK to the primary source document. |
| `questions.reviewed_by` | uuid | Nullable, reviewer FK; the application checks Lecturer role and permissions. |
| `questions.reviewed_at` | timestamptz | Lecturer approval/rejection timestamp. |
| `exam_questions.id` | uuid | PK identifying an actual question in the attempt. |
| `exam_questions.exam_schedule_id` | uuid | NN, attempt FK. |
| `exam_questions.source_question_id` | uuid | Nullable, source-question FK; may be null for questions generated during the interview. |
| `exam_questions.parent_exam_question_id` | uuid | Null for MAIN; NN for FOLLOW_UP; references a MAIN question in the same attempt. |
| `exam_questions.question_type` | varchar(20) | NN; `MAIN/FOLLOW_UP`. |
| `exam_questions.question_order` | int | NN, > 0; UQ `(exam_schedule_id, question_order)`. |
| `exam_questions.content_snapshot` | text | NN, question content at examination time. |
| `exam_questions.expected_answer_snapshot` | text | Examination-time expected answer; required when the rubric uses one. |
| `exam_questions.rubric_snapshot` | jsonb | Grading basis: criteria, score ranges, version, and formula. NN for MAIN; follow-ups use their MAIN question's rubric. |
| `exam_questions.answer_time_limit_seconds` | int | NN, > 0; answer time limit. |
| `exam_questions.status` | varchar(20) | NN; `SELECTED/ASKED/ANSWERED/TIMED_OUT/SKIPPED`. |
| `exam_questions.selected_at` | timestamptz | NN, selection timestamp. |
| `exam_questions.asked_at` | timestamptz | Nullable, actual delivery timestamp. |
| `exam_questions.answer_deadline_at` | timestamptz | Nullable, deadline calculated against remaining time. |
| `exam_questions.answered_at` | timestamptz | Nullable, answer-completion timestamp. |
| `transcripts.exam_question_id` | uuid | Nullable, actual-question FK; null for utterances unrelated to a question. |
| `transcripts.turn_order` | int | NN, UQ `(exam_schedule_id, turn_order)`; preserves conversation order. |
| `transcripts.is_final` | boolean | NN; distinguishes an updating transcript from its finalized version. |
| `question_results.exam_question_id` | uuid | NN/UQ, FK to the actual MAIN question; replaces direct `question_id` references after migration. |
| `question_results.criterion_scores` | jsonb | AI and lecturer scores by snapshot criterion code, including maximum scores; validate codes and score ranges. |
| `question_results.evidence_refs` | jsonb | Transcript/utterance references supporting the assessment; validate attempt ownership and the referenced stored content. |

Keep the existing `ai_score`, `ai_feedback`, `lecturer_score`, and `lecturer_feedback` fields. The lecturer determines each final question score. AI scores may be null on grading failure while lecturers can grade manually from evidence. If `question_results.exam_schedule_id` is retained, validate that it matches the attempt identified by `exam_question_id`.

**C. Evidence, grading status, and configuration**

| Table.column | Type | Constraints and purpose |
|---|---|---|
| `exam_schedules.ai_session_id` | uuid | Nullable; maps to the Python session if Viva v2 is selected. Do not link the systems using student names. |
| `exam_schedules.ai_grading_status` | varchar(20) | NN; `PENDING/PROCESSING/SUCCEEDED/FAILED`. AI failure is independent of examination status. |
| `exam_schedules.grading_status` | varchar(20) | NN; `PENDING_REVIEW/FINALIZED/PUBLISHED`. |
| `exam_schedules.graded_at` | timestamptz | Nullable before lecturer finalization; required for FINALIZED/PUBLISHED. |
| `exam_schedules.published_at` | timestamptz | Nullable before publication; required for PUBLISHED. |
| `exam_schedules.language_code` | varchar(2) | NN; `vi/en`, the effective language for the attempt. |
| `recordings.id` | uuid | PK. |
| `recordings.exam_schedule_id` | uuid | NN, attempt FK. |
| `recordings.media_type` | varchar(10) | NN; `AUDIO/VIDEO`. |
| `recordings.storage_uri` | text | Private storage location; may be null during initialization or after recording failure. |
| `recordings.status` | varchar(20) | NN; `RECORDING/COMPLETE/PARTIAL/FAILED`. |
| `recordings.started_at` | timestamptz | NN, recording-interval start. |
| `recordings.ended_at` | timestamptz | Nullable while recording; actual recording-interval end. |
| `recordings.checksum` | varchar(64) | Nullable before file finalization; supports integrity verification when SHA-256 is used. |
| `audit_logs.id` | uuid | PK. |
| `audit_logs.actor_id` | uuid | Nullable, user FK; null for automated events. |
| `audit_logs.action` | varchar(50) | NN; examples include question review, score adjustment, finalization, publication, and configuration changes. |
| `audit_logs.entity_type` | varchar(50) | NN, affected object type. |
| `audit_logs.entity_id` | uuid | NN, affected record ID; application-validated reference. |
| `audit_logs.details` | jsonb | NN; before/after values and adjustment reasons where applicable. Must not contain authentication secrets. |
| `audit_logs.created_at` | timestamptz | NN, event timestamp. |
| `system_settings.setting_key` | varchar(100) | PK; for example, `voice.language`. |
| `system_settings.setting_value` | jsonb | NN; valid language values are `vi/en` for the corresponding setting. |
| `system_settings.updated_by` | uuid | Nullable, FK to the administrator making the change. |
| `system_settings.updated_at` | timestamptz | NN, last-change timestamp. |

If the Viva v2 JSONB rubric schema is selected instead of a separate criteria table, criteria may be stored in JSONB. The conceptual RubricCriterion entity still represents their business meaning. Validate the JSON structure and capture version snapshots during integration. These are alternative storage choices rather than a requirement to implement both simultaneously.

### 8.4. Constraints for the Earlier Alternative Design

The rules below describe the proposed ExamQuestion-based alternative. They are not constraints already enforced by the submitted rubric-item result model.

- Required FKs: questions/exams belong to courses; schedules belong to exams and students. Enforce `scheduled_end > scheduled_start`, slots within the exam period, and student schedule-conflict checks.
- APPROVED questions require valid Bloom labels/rubrics and reviewer information. Changes to previously used content require versioning or preservation of earlier attempt snapshots.
- Each MAIN question has at most one QuestionResult. Follow-ups reference a MAIN question in the same attempt. A composite FK can enforce attempt consistency; question-type checks require application or trigger validation.
- Deleting bank questions, courses, or accounts must not cascade into the loss of completed examination records. Use archival/deactivation, snapshots, and appropriate RESTRICT/SET NULL FKs. Review the current schema's CASCADE rules before claiming evidence-preservation compliance.
- Grade finalization is a transaction covering question/overall scores, grader identity, timestamp, status, and audit data. Only appropriately authorized Lecturers may perform it under the business rules. AI submits suggestions through a separate contract.
- Treat `final_score` as official only after finalization. PUBLISHED requires `graded_by`, `graded_at`, `published_at`, and a valid score in the range 0–10. Reopening grades requires change logs, withdrawal of publication according to team policy, and another review/publication cycle.
- Store audio/video files in file storage, with metadata/references and access control in the database. Segments require time intervals to identify missing coverage. A transcript and a URL alone do not prove full-session recording.

### 8.5. Reconciliation Notes for the Supplied Database Baseline

1. **Use the supplied SQL for the database submission.** Repository snapshots, JPA entities, Flyway migrations, and the standalone Viva demo are implementation comparisons, not additional columns to merge into the dictionary.
2. **Roles differ from the Java model.** The SQL has `roles` and `users.role_id`; the Java `User` model previously inspected stores a role enum directly. Align implementation mappings if the new schema is deployed.
3. **Rubrics and result granularity differ.** The new SQL adds question-specific `rubrics` and `question_results.rubric_id`. Earlier Java result mappings reference `question_id`; earlier proposals use per-assignment or per-ExamQuestion results. Select and implement one consistent mapping.
4. **Missing FKs must remain visible.** `assigned_by` and `graded_by` are not declared FKs. Result uniqueness, score-to-rubric range checks, role-specific student/lecturer constraints, and scheduling/counter constraints are not all enforced in this SQL.
5. **Lecturer finalization is still a business requirement.** The SQL does not have a full grading/publication status model. AI suggestions must remain separate from official grades, regardless of the legacy bridge field name `final_score`.
6. **Keep the earlier alternative separate.** Sections 8.3–8.4 retain proposal details for discussion. They are not part of the 11-table/85-column baseline and must not be presented as deployed schema.
7. **Retain evidence deliberately.** Review declared CASCADE/RESTRICT/SET NULL behavior against the requirement to preserve recordings, transcripts, and grading history. Recording URLs alone do not guarantee full-session recording.
8. **Detailed observations:** The standalone dictionary lists missing/unenforced rules and differences such as rubric maximum score default 1 versus result maximum score default 10.0. These are findings to confirm, not SQL modifications.

### Repository References and Requirements Source

- `database/reference/SWD392_AI_Interview.sql` — the authoritative supplied DDL for the data dictionary, received on October 18, 2026.
- `docs/Data_Dictionary.md` — complete English dictionary of the supplied 11 tables and 85 columns.
- The seven-group project description supplied by the team on October 17, 2026 — the primary business requirements baseline for this revision.
- `docs/Project_requirement.md`, `docs/flow.md`, and `docs/Swimlane.md` — earlier documents used for comparison; their scope and technical options differ.
- `demo/viva-ai-v2/README.md`, `demo/viva-ai-v2/docs/LIVE.md`, `demo/viva-ai-v2/app/models.py`, `python/viva_core.py`, `python/server.py`, `python/services/grader_service.py`, and `python/services/backend_client.py` — existing voice demo, schema, and Python bridge.
- `back-end/src/main/java/com/backend/module/` — existing controllers, services, and JPA entities.
- `back-end/src/main/resources/db/migration/V1__create_core_tables.sql` through `V7__use_email_and_student_code.sql` — migrations.
- `database/db_final.sql` — older schema snapshot; `database/db_schema_updated.sql` — proposed follow-up modeling extension.
