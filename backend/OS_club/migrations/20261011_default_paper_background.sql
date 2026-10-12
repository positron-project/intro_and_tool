-- New installations should open in the paper background by default.
-- Existing rows are intentionally unchanged because they are saved choices.
ALTER TABLE site_settings
  MODIFY COLUMN school_background_enabled BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE user_preferences
  MODIFY COLUMN background_preference VARCHAR(16) NOT NULL DEFAULT 'paper';

ALTER TABLE user_preferences
  MODIFY COLUMN school_background_enabled BOOLEAN NOT NULL DEFAULT FALSE;
