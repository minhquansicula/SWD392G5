# AIVES Main Flows — PlantUML Activity Diagrams

Copy one complete `@startuml` ... `@enduml` block into a PlantUML-capable editor. For Visual Paradigm's native AI Diagram Generation text field, use the English prompts in [Main_Flows_Visual_Paradigm.md](Main_Flows_Visual_Paradigm.md).

These diagrams describe the target business design; they are not evidence of completed implementation. Gemini AI Service is the supporting service; the application's Viva integration and RAG retrieval are included in AIVES.

## Flow 01 — Prepare the Question Bank and Rubrics

[Standalone source](diagrams/main-flows/01-question-bank-and-rubrics.puml)

```plantuml
@startuml
title AIVES - Prepare the Question Bank and Rubrics
skinparam shadowing false
skinparam defaultFontName Arial

|Lecturer|
start
:Select course and topic;
|AIVES|
:Verify lecturer permissions;
if (Authorized for this course?) then (Yes)
else (No)
  :Reject request;
  stop
endif
|Lecturer|
:Create or select a rubric;
:Choose manual creation, import,\nor AI generation;
|AIVES|
:Validate rubric criteria and score ranges;
if (Rubric valid?) then (Yes)
else (No)
  :Show validation errors;
  stop
endif

if (Generate questions using AI?) then (Yes)
  |Lecturer|
  :Select or upload course materials;
  |AIVES|
  :Extract and index materials if needed;
  if (Materials ready for retrieval?) then (Yes)
    :Retrieve relevant course content (RAG);
    :Prepare source context, topic,\nBloom targets, and rubric;
    |Gemini AI Service|
    :Generate draft questions\nwith source references;
    |AIVES|
    if (Generation failed?) then (Yes)
      :Report generation failure;\nDo not approve any question;
      stop
    endif
  else (No)
    :Report material-processing errors;
    stop
  endif
else (Manual or import)
  |Lecturer|
  :Enter questions or import a question file;
endif

|AIVES|
:Validate basic draft data and save\nas PENDING_REVIEW;

repeat
  |Lecturer|
  :Review or edit questions and expected answers;
  :Assign Bloom levels and rubrics;
  |AIVES|
  :Validate required question data;
repeat while (Corrections required?) is (Yes) not (No)

|Lecturer|
if (Approve reviewed questions?) then (Yes)
  |AIVES|
  :Mark approved questions APPROVED;
  :Record reviewer, timestamp, and audit event;
  :Make approved questions eligible for exams;
else (Reject)
  |AIVES|
  :Mark rejected questions REJECTED;
  :Keep them out of examination selection;
  :Record review audit event;
endif
stop
@enduml
```

## Flow 02 — Prepare Exams and Schedules

[Standalone source](diagrams/main-flows/02-exam-and-schedule-management.puml)

```plantuml
@startuml
title AIVES - Prepare Exams and Schedules
skinparam shadowing false
skinparam defaultFontName Arial

|Lecturer|
start
:Select an assigned course;
|AIVES|
:Verify lecturer permissions;
if (Authorized?) then (Yes)
else (No)
  :Reject request;
  stop
endif

repeat
  |Lecturer|
  :Enter exam title, exam period,\nquestion limits, and answer time limits;
  |AIVES|
  :Validate exam configuration;
repeat while (Configuration invalid?) is (Yes) not (No)
:Save exam;

repeat
  |Lecturer|
  :Select students and individual time slots;
  |AIVES|
  :Validate student roles and uniqueness;
  :Check slots within the exam period\nand student schedule conflicts;
repeat while (Schedule batch invalid?) is (Yes) not (No)
:Save the entire schedule batch atomically\nwith status PENDING;

|Lecturer|
if (Assign questions now?) then (Yes)
  |AIVES|
  :Load approved questions from the course;
  :Apply selection and consecutive-candidate\nrepetition policy;
  if (Enough eligible questions?) then (Yes)
    :Assign question sets once;
    :Save question, expected-answer,\nand rubric snapshots atomically;
  else (No)
    :Report insufficient question pool;
    :Keep schedules PENDING;\nDo not save partial assignments;
  endif
else (Assign at start)
  |AIVES|
  :Defer assignment until the attempt starts;
endif

|Student|
:Open personal examination schedules;
|AIVES|
:Return only this student's schedules;
|Student|
:View course, exam, time slot,\nand examination rules;
stop
@enduml
```

## Flow 03 — Conduct a Voice Viva with Adaptive Follow-Ups

[Standalone source](diagrams/main-flows/03-voice-viva-and-adaptive-follow-ups.puml)

```plantuml
@startuml
title AIVES - Conduct a Voice Viva with Adaptive Follow-Ups
skinparam shadowing false
skinparam defaultFontName Arial

|Student|
start
:Select personal exam schedule;
:Check microphone and request start;
|AIVES|
:Verify identity, ownership,\nPENDING status, and time window;
if (Start permitted?) then (Yes)
else (No)
  :Reject start and explain the reason;
  stop
endif

if (Question set already assigned?) then (Yes)
else (No)
  :Select approved course questions\nunder the repetition policy;
  if (Enough eligible questions?) then (Yes)
    :Save question, answer, and rubric snapshots;
  else (No)
    :Report insufficient questions;\nKeep schedule PENDING;
    stop
  endif
endif

:Start attempt atomically;\nSet IN_PROGRESS and actual start time;
:Initialize evidence capture and persisted progress;
:Initialize main-question and total follow-up counters;
note right
Evidence capture is detailed in Flow 5.
Gemini processes audio through the Viva integration.
AI suggestions are not official grades.
end note

while (Main questions and session time remain\nand finish has not been requested?) is (Yes)
  :Load next MAIN question and grading context;
  :Reset follow-up count for this main question;
  :Set current question to MAIN;\nSet askCurrentQuestion = true;

  while (askCurrentQuestion and session time remain\nand finish has not been requested?) is (Yes)
    :Persist current question and delivery state;
    |Gemini AI Service|
    :Deliver the spoken question;
    |AIVES|
    :Open the answer window and enforce its deadline\nusing the question limit and remaining session time;
    |Student|
    :Listen and answer by voice;
    |Gemini AI Service|
    :Process incoming audio and return transcripts;
    |AIVES|
    if (Connection or AI error?) then (Yes)
      :Persist available transcript and progress;
      :Pause audio and finalize the current evidence segment;
      :Record interruption and notify the student;
      :Use the recovery policy to resume later\nor require authorized intervention;
      note right
This path ends the interrupted execution,
not a successfully completed attempt.
Never fabricate missing speech or answers.
end note
      stop
    else (No)
      :Close the answer at turn completion\nor at the enforced deadline;
      :Save available transcript and timing evidence;
      :Mark the answer ANSWERED or TIMED_OUT;
    endif

    if (Session time remains and no finish request?) then (Yes)
      |Gemini AI Service|
      :Analyze the answer in question,\nexpected-answer, and rubric context;
      |AIVES|
      if (Clarification needed AND time remains\nAND per-main allowance remains\nAND total follow-up allowance remains?) then (Yes)
        |Gemini AI Service|
        :Generate a targeted follow-up question;
        |AIVES|
        :Link follow-up to the current MAIN;
        :Increment per-main and total follow-up counts;
        :Set current question to FOLLOW_UP;
      else (No)
        :Set askCurrentQuestion = false;
      endif
    else (No)
      :Set askCurrentQuestion = false;
    endif
  endwhile (No)

  :Close the main-question cycle;
  :Advance the main-question counter;
endwhile (No)

:Stop voice interaction and finalize transcript;
:Finalize evidence capture;
:Save COMPLETED and actual end time;
:Set grading status PENDING_REVIEW;
:Request AI grading suggestions (Flow 4);
|Student|
:Receive attempt-completion confirmation;\nAwait lecturer review and publication;
stop
@enduml
```

## Flow 04 — Generate AI Suggestions and Finalize Grades

[Standalone source](diagrams/main-flows/04-ai-grading-and-lecturer-finalization.puml)

```plantuml
@startuml
title AIVES - Generate AI Suggestions and Finalize Grades
skinparam shadowing false
skinparam defaultFontName Arial

|AIVES|
start
:Receive completed-attempt event;
:Load a completed attempt, transcript,\nand expected-answer/rubric snapshots;
:Set AI grading status PROCESSING;

while (Ungraded MAIN questions remain?) is (Yes)
  :Collect main and follow-up answers,\nrubric snapshot, and relevant source context (RAG);
  |Gemini AI Service|
  :Suggest criterion/question scores\nand evidence-based feedback;
  |AIVES|
  :Validate score ranges, criterion IDs,\nand referenced transcript evidence;
  if (AI result valid?) then (Yes)
    :Save AI scores and feedback as suggestions;
  else (No)
    :Record grading failure or insufficient evidence;
    :Mark the question for lecturer attention;\nNever generate a default sample score;
  endif
endwhile (No)

:Set AI grading status SUCCEEDED or FAILED\naccording to the collected results;
:Keep grading status PENDING_REVIEW;
|Lecturer|
:Select an attempt for grading;
|AIVES|
:Check lecturer permissions for this exam;
if (Authorized?) then (Yes)
else (No)
  :Reject access;
  stop
endif

:Display full transcript, available recordings,\nrubric, and AI suggestions/failure notices;
repeat
  |Lecturer|
  :Review the evidence and rubric;
  :Accept or adjust scores and feedback;\nGrade manually where AI suggestions are unavailable;
  :Confirm finalization;
  |AIVES|
  :Validate required lecturer scores and ranges;
  :Calculate overall grade using the agreed rubric formula;
repeat while (Corrections required?) is (Yes) not (No)

:Save lecturer scores, official overall grade,\ngrader, timestamp, and audit log atomically;
:Set grading status FINALIZED;
|Lecturer|
if (Publish results now?) then (Yes)
  |AIVES|
  :Set grading status PUBLISHED;
  :Record publication time and audit event;
  :Make personal reports available to their owners;
else (Later)
  |AIVES|
  :Keep FINALIZED results unavailable to students;
endif
stop
@enduml
```

## Flow 05 — Capture, Monitor, and Retrieve Evidence

[Standalone source](diagrams/main-flows/05-evidence-capture-and-review.puml)

```plantuml
@startuml
title AIVES - Capture, Monitor, and Retrieve Evidence
skinparam shadowing false
skinparam defaultFontName Arial

|Student|
start
:Start the scheduled voice examination;
|AIVES|
:Receive authorized attempt-start event;
:Initialize audio recording and evidence metadata;
if (Video recording required?) then (Yes)
  :Initialize video recording;
else (No)
endif
:Show recording status;
note right
This flow accompanies the voice examination.
Recording failures follow the institution's policy.
end note

fork
  |AIVES|
  while (Examination ongoing?) is (Yes)
    :Capture and store audio/video segments;
    if (Recording or connection failure?) then (Yes)
      :Record failed interval and notify the user;
      :Apply the agreed recording/recovery policy;
    else (No)
      :Update recording coverage metadata;
    endif
  endwhile (No)
fork again
  |AIVES|
  while (Examination ongoing?) is (Yes)
    :Persist questions, ordered transcripts,\ntimestamps, and examination events;
  endwhile (No)
fork again
  |Lecturer|
  if (Monitoring requested?) then (Yes)
    |AIVES|
    :Verify lecturer monitoring permissions;
    if (Authorized?) then (Yes)
      :Provide examination and connection status;
    else (No)
      :Reject monitoring access;
    endif
  else (No)
  endif
end fork

|AIVES|
:Finalize files, checksums, and time intervals;
:Mark recording coverage COMPLETE,\nPARTIAL, or FAILED;
:Retain evidence according to the access\nand retention policy;
:Append grading audit events when scores\nare reviewed, adjusted, finalized, or published;
|Lecturer|
:Request examination evidence for later review;
|AIVES|
:Check permission for the selected attempt;
if (Authorized?) then (Yes)
  :Retrieve recordings, transcripts,\nquestions, and grading history;
  :Clearly identify any missing recording segments;
  :Record evidence-access audit event;
  |Lecturer|
  :Review evidence for verification or an appeal;
else (No)
  :Reject evidence access;
endif
stop
@enduml
```

## Flow 06 — Provide Feedback, Analytics, and Grade Exports

[Standalone source](diagrams/main-flows/06-feedback-analytics-and-grade-export.puml)

```plantuml
@startuml
title AIVES - Provide Feedback, Analytics, and Grade Exports
skinparam shadowing false
skinparam defaultFontName Arial

|Requester (Student or Lecturer)|
start
:Open reporting and choose request type;
if (Personal student report?) then (Yes)
  |Student|
  :Select own examination result\nand request personal report;
  |AIVES|
  :Authenticate request and check\nownership/PUBLISHED status;
  if (Not owned or not published?) then (Yes)
    :Reject access or show result unavailable;
    stop
  endif
  :Load official overall and per-question scores;
  :Load AI and lecturer feedback;\nlabel AI scores as suggestions;
  |Student|
  :View personal examination report;
  stop
endif

|Lecturer|
:Select exam or supported roster and filters;\nRequest analytics;
|AIVES|
:Authenticate request and check\nlecturer permissions;
if (Not authorized?) then (Yes)
  :Reject access;
  stop
endif
:Load finalized official grades and valid results;
:List unfinalized attempts separately;
:Calculate score distribution, question difficulty,\nand answer success rates;
|Lecturer|
:Review analytics;
if (Export grade report?) then (No)
  stop
endif
:Select institutional template and format;
|AIVES|
:Validate student codes, names, course/exam,\nfinalized grades, and template requirements;
if (Invalid export data?) then (Yes)
  :Report missing or invalid export data;
  stop
endif
:Generate report using official grades only;
|Lecturer|
:Download grade report;
stop
@enduml
```

## Flow 07 — Administer Accounts, Courses, Permissions, and Languages

[Standalone source](diagrams/main-flows/07-account-permission-and-language-administration.puml)

```plantuml
@startuml
title AIVES - Administer Accounts, Courses, Permissions, and Languages
skinparam shadowing false
skinparam defaultFontName Arial

|Administrator|
start
:Choose one administration operation;
|AIVES|
:Verify administrator permissions;
if (Unauthorized?) then (Yes)
  :Reject request;
  stop
endif

|Administrator|
if (Manage accounts?) then (Yes)
  :Create, import, or update accounts and roles;
  |AIVES|
  :Check email, student code, role,\nand uniqueness rules;
  if (Invalid account data?) then (Yes)
    :Return validation errors;
    stop
  endif
  :Save account changes;
  :Send password-setup links when needed;
  :Record delivery status and audit event;
  |Administrator|
  :View account operation result;
  stop
endif

|Administrator|
if (Manage courses?) then (Yes)
  :Choose course view, create, update, or delete;
  |AIVES|
  :Check course data, uniqueness,\nand deletion constraints;
  if (Operation blocked or invalid?) then (Yes)
    :Explain why the course operation failed;
    stop
  endif
  :Return course details or apply allowed change;
  :Record audit event for changes;
  |Administrator|
  :View course operation result;
  stop
endif

|Administrator|
if (Assign or remove lecturers?) then (Yes)
  :Select course and lecturer changes;
  |AIVES|
  :Check course, Lecturer role,\nand assignment rules;
  if (Invalid assignment?) then (Yes)
    :Return assignment errors;
    stop
  endif
  :Save assignments and record audit event;
  |Administrator|
  :View assignment result;
  stop
endif

|Administrator|
:Select Vietnamese or English voice setting;
|AIVES|
:Check language and AI integration support;
if (Unsupported language?) then (Yes)
  :Reject configuration request;
  stop
endif
:Save effective language setting;
:Record administrator, timestamp, and audit event;
note right
Each new attempt captures its effective language.
Existing attempts keep their captured setting.
end note
|Administrator|
:View language configuration result;
stop
@enduml
```

