-- Disable email confirmation for signups
UPDATE auth.config 
SET config = jsonb_set(
  COALESCE(config, '{}'), 
  '{MAILER_AUTOCONFIRM}', 
  'true'
);

-- Also disable email change confirmation
UPDATE auth.config 
SET config = jsonb_set(
  COALESCE(config, '{}'), 
  '{MAILER_SECURE_EMAIL_CHANGE_ENABLED}', 
  'false'
);