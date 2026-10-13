ALTER TABLE public.users
    ALTER COLUMN email TYPE text,
    ADD COLUMN email_normalized text COLLATE "C",
    ADD CONSTRAINT users_email_length_check
        CHECK (email IS NULL OR char_length(email) <= 255),
    ADD CONSTRAINT users_email_normalized_length_check
        CHECK (
            email_normalized IS NULL
            OR char_length(email_normalized) BETWEEN 1 AND 255
        ),
    ADD CONSTRAINT users_email_normalized_key
        UNIQUE (email_normalized) NOT DEFERRABLE;
