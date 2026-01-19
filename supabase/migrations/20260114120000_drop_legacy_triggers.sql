-- Drop legacy triggers that might be referencing the deleted 'slot_date' column
-- The error "record 'new' has no field 'slot_date'" confirms a legacy trigger exists.

-- Attempt to drop likely names for this trigger
DROP TRIGGER IF EXISTS check_overlapping_bookings ON public.services_booking;
DROP TRIGGER IF EXISTS validate_booking_slot ON public.services_booking;
DROP TRIGGER IF EXISTS check_booking_overlap ON public.services_booking;
DROP TRIGGER IF EXISTS enforce_slot_date ON public.services_booking;
DROP TRIGGER IF EXISTS check_slot_date ON public.services_booking;

-- Drop associated functions if they exist (cascade should handle it for triggers, but to be safe)
DROP FUNCTION IF EXISTS check_overlapping_bookings();
DROP FUNCTION IF EXISTS validate_booking_slot();
DROP FUNCTION IF EXISTS check_booking_overlap();
