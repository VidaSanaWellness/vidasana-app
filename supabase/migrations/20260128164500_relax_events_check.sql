-- Relax the check constraint on events table to allow end_at >= start_at
-- Previously it was end_at > start_at

DO $$
BEGIN
    -- Drop the constraint if it exists (using the name from the error message)
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'events_check') THEN
        ALTER TABLE public.events DROP CONSTRAINT events_check;
    END IF;
    
    -- Also try to drop the standard naming convention version just in case
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'events_end_at_check') THEN
        ALTER TABLE public.events DROP CONSTRAINT events_end_at_check;
    END IF;
END $$;

-- Add the new constraint allowing equality
ALTER TABLE public.events 
ADD CONSTRAINT events_check CHECK (end_at >= start_at);
