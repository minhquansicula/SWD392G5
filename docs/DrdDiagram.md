erDiagram
    USERS {
        uuid id PK
        string username
        string password_hash
        string full_name
        string role "ADMIN, LECTURER, STUDENT"
    }

    COURSES {
        uuid id PK
        string course_code
        string course_name
    }

    QUESTIONS {
        uuid id PK
        uuid course_id FK
        text content
        string difficulty_level
    }

    EXAMS {
        uuid id PK
        uuid course_id FK
        string title
        timestamp start_date
        timestamp end_date
        int max_main_questions
        int max_followup_questions
        uuid created_by FK
    }

    EXAM_SCHEDULES {
        uuid id PK
        uuid exam_id FK
        uuid student_id FK
        timestamp scheduled_start_time
        timestamp scheduled_end_time
        string status "PENDING, IN_PROGRESS, COMPLETED"
        decimal final_score
    }

    TRANSCRIPTS {
        uuid id PK
        uuid exam_schedule_id FK
        uuid question_id FK "Null nếu là câu hỏi xoáy"
        uuid parent_transcript_id FK
        string role "AI, STUDENT"
        text text_content
        string audio_url
        timestamp created_at
    }

    QUESTION_RESULTS {
        uuid id PK
        uuid exam_schedule_id FK
        uuid question_id FK
        decimal ai_score
        text ai_feedback
    }

    USERS ||--o{ EXAMS : "manages"
    USERS ||--o{ EXAM_SCHEDULES : "takes"
    COURSES ||--o{ EXAMS : "has"
    COURSES ||--o{ QUESTIONS : "contains"
    EXAMS ||--o{ EXAM_SCHEDULES : "has"
    EXAM_SCHEDULES ||--o{ TRANSCRIPTS : "logs"
    EXAM_SCHEDULES ||--o{ QUESTION_RESULTS : "reports"
    QUESTIONS ||--o{ TRANSCRIPTS : "asked in"
    QUESTIONS ||--o{ QUESTION_RESULTS : "evaluated in"