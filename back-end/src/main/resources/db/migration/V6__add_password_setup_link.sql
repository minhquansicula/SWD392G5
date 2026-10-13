ALTER TABLE public.users
    ADD COLUMN password_set_at timestamptz,
    ADD COLUMN password_token_hash varchar(64),
    ADD COLUMN password_token_expires_at timestamptz,
    ADD COLUMN password_mail_status varchar(20),
    ADD CONSTRAINT users_password_token_hash_key
        UNIQUE (password_token_hash),
    ADD CONSTRAINT users_password_mail_status_check
        CHECK (password_mail_status IS NULL OR password_mail_status IN ('SENT', 'FAILED'));

-- Accounts created before the email link flow already have a usable password.
UPDATE public.users
SET password_set_at = COALESCE(created_at, CURRENT_TIMESTAMP);
