-- Email is the login address; the UUID remains the stable account identity.
-- Older non-student rows may use an empty string for "no student code".
DROP TRIGGER IF EXISTS trg_sync_user_email_username ON public.users;
DROP FUNCTION IF EXISTS public.sync_user_email_username();

UPDATE public.users SET student_code = NULL
WHERE role <> 'STUDENT' AND student_code IS NOT NULL AND btrim(student_code) = '';

-- Correct other legacy rows before applying this migration if any check below fails.
ALTER TABLE public.users
    ALTER COLUMN email SET NOT NULL,
    ALTER COLUMN email_normalized SET NOT NULL,
    ADD COLUMN is_system_admin boolean NOT NULL DEFAULT false,
    ADD CONSTRAINT users_student_code_role_check CHECK (
        (role = 'STUDENT' AND student_code IS NOT NULL AND btrim(student_code) <> '')
        OR (role <> 'STUDENT' AND student_code IS NULL)
    );

UPDATE public.users SET is_system_admin = true WHERE username = 'admin' AND role = 'ADMIN';

ALTER TABLE public.users DROP COLUMN username;
