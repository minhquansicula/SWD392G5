CREATE TABLE public.users (
    id uuid CONSTRAINT users_pkey PRIMARY KEY DEFAULT gen_random_uuid(),
    username varchar(255) NOT NULL
        CONSTRAINT users_username_key UNIQUE,
    password_hash varchar(255) NOT NULL,
    full_name varchar(255) NOT NULL,
    role varchar(50) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    student_code varchar(50)
        CONSTRAINT users_student_code_key UNIQUE,
    email varchar(255),
    CONSTRAINT users_role_check
        CHECK (role IN ('ADMIN', 'LECTURER', 'STUDENT'))
);
