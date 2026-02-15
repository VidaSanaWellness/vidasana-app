-- Safely create the enum type if it doesn't exist
DO $$ BEGIN
    CREATE TYPE dispute_status AS ENUM ('open', 'under_review', 'resolved_refund', 'resolved_payout', 'dismissed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add a new temporary column with the enum type
ALTER TABLE disputes ADD COLUMN status_new dispute_status;

-- Migrate data from the old text column to the new enum column
-- Explicitly map ALL legacy values from the CHECK constraint to new Enum values
UPDATE disputes
SET status_new = CASE status
    -- Direct alignment
    WHEN 'open' THEN 'open'::dispute_status
    WHEN 'resolved_refund' THEN 'resolved_refund'::dispute_status
    WHEN 'resolved_payout' THEN 'resolved_payout'::dispute_status
    
    -- Legacy text values mapping
    WHEN 'provider_replied' THEN 'under_review'::dispute_status
    WHEN 'evidence_submitted' THEN 'under_review'::dispute_status
    WHEN 'closed' THEN 'dismissed'::dispute_status
    
    -- Fallbacks
    WHEN 'resolved' THEN 'resolved_payout'::dispute_status -- Handle potential legacy data
    ELSE 'open'::dispute_status
END;

-- Drop the old column (which removes the problematic CHECK constraint automatically)
ALTER TABLE disputes DROP COLUMN status;

-- Rename the new column to 'status'
ALTER TABLE disputes RENAME COLUMN status_new TO status;

-- Set the default value for the new column
ALTER TABLE disputes ALTER COLUMN status SET DEFAULT 'open'::dispute_status;

-- Add index for performance on status filtering
CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status);
