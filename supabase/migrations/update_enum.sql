-- Add new statuses to the enum
ALTER TYPE user_status ADD VALUE IF NOT EXISTS 'onboarding';
ALTER TYPE user_status ADD VALUE IF NOT EXISTS 'review';

-- Verify
SELECT enum_range(NULL::user_status);
