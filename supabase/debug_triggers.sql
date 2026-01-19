-- 1. List all triggers on the services_booking table (Run this to see what you have)
SELECT trigger_schema, trigger_name, event_manipulation, Action_statement 
FROM information_schema.triggers 
WHERE event_object_table = 'services_booking';

-- 2. DANGEROUS: Drop known legacy triggers (Try running this block)
DROP TRIGGER IF EXISTS check_overlapping_bookings ON public.services_booking;
DROP TRIGGER IF EXISTS validate_booking_slot ON public.services_booking;
DROP TRIGGER IF EXISTS enforce_slot_date ON public.services_booking;

-- 3. Drop the function that is likely causing the error (The error comes from the function code)
DROP FUNCTION IF EXISTS check_overlapping_bookings();
DROP FUNCTION IF EXISTS validate_booking_slot();

-- 4. If you see a trigger in step 1 that isn't deleted, use:
-- DROP TRIGGER [trigger_name] ON public.services_booking;
