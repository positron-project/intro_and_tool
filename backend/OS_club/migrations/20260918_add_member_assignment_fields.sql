-- Adds the invite assignment fields used by the real member directory.
-- Safe to run once on an existing database; no existing rows are removed.
ALTER TABLE users
    ADD COLUMN direction VARCHAR(50) NULL AFTER cohort;

ALTER TABLE invite_codes
    ADD COLUMN cohort VARCHAR(20) NULL AFTER role,
    ADD COLUMN direction VARCHAR(50) NULL AFTER cohort;
