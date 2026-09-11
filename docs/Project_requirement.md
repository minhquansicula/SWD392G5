Project Requirements: AI-powered Viva Exam System (AIVES)

Problem Statement & Objectives: Oral/viva examinations require extensive faculty effort, lack cross-room standardization, cannot easily scale to large cohorts, and lack objective audit trails. AIVES automates the interview flow using AI to deliver questions, conduct adaptive follow-up probing, log transcripts, and generate performance analytics.

Target Users: Administrator, Lecturer (Examiner/Creator), and Student (Candidate).

Technical Stack:

Backend: Java Spring Boot (handling business workflows, RESTful APIs, asynchronous event processing, and WebSocket connections for real-time speech streaming).

Frontend: React.js (handling responsive web UI, client-side audio recording via MediaRecorder/Web Audio API, exam state synchronization, and visualization dashboards).

Database: PostgreSQL (managing transactional records, session schedules, transcripts, and evaluation logs).

Non-Functional Requirements:

Low Latency: Fast turnaround between the end of a student's speech and the AI's follow-up question to preserve natural conversational pacing.

Domain-Specific Speech Accuracy: Accurate Speech-to-Text (STT) processing for specialized terminology in Vietnamese.

Data Privacy & Security: Encrypted audio streaming and secure storage of student voice recordings and transcripts.

Human-in-the-Loop Governance: AI acts strictly as an evaluator and assistant; the lecturer retains final authority over all scores.

Selected Functional Modules

Module 2: Exam & Schedule Management

Create viva examination sessions linked to specific courses, student rosters, and individual timeslots via Spring Boot REST APIs.

Implement randomized or adaptive question selection for consecutive candidates to prevent duplicate questions and exam leaks.

Configure constraints for each exam session, including the maximum number of primary questions and maximum follow-up/probing questions per candidate.

Module 3: AI Interview Core (Mandatory)

Act as a virtual examiner using Text-to-Speech (TTS) to deliver oral questions to the React interface.

Capture candidate spoken responses in the browser and stream them to the Spring Boot backend via WebSocket for near real-time Speech-to-Text (STT) processing.

Generate adaptive follow-up questions dynamically using LLM services when candidate responses are vague, incomplete, or inconsistent.

Enforce session constraints, including response time limits and maximum follow-up attempts per topic.

Module 6: Feedback & Reporting

Provide students with post-exam review access on React displaying per-question scores and AI-generated qualitative feedback.

Provide lecturers with an interactive analytics dashboard tracking class score distribution, question difficulty rankings, and answer success rates.

Export institutional-standard grade reports and audit logs for official academic evaluation.