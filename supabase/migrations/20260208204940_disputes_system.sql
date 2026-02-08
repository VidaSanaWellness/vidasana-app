-- Add 'disputed' to booking_status enum
ALTER TYPE "public"."booking_status" ADD VALUE IF NOT EXISTS 'disputed';

-- Add status column to event_booking if not exists (using text check constraint or new enum)
-- First create the enum type for event status
DO $$ BEGIN
    CREATE TYPE "public"."event_booking_status" AS ENUM ('booked', 'completed', 'cancelled', 'disputed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "public"."event_booking" 
ADD COLUMN IF NOT EXISTS "status" "public"."event_booking_status" NOT NULL DEFAULT 'booked';

-- Create disputes table
CREATE TABLE IF NOT EXISTS "public"."disputes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    
    -- We use two nullable FKs for referential integrity
    "service_booking_id" UUID REFERENCES "public"."services_booking"("id") ON DELETE CASCADE,
    "event_booking_id" UUID REFERENCES "public"."event_booking"("id") ON DELETE CASCADE,
    
    "client_id" UUID NOT NULL REFERENCES "public"."profile"("id"),
    "provider_id" UUID NOT NULL REFERENCES "public"."profile"("id"),
    
    "status" TEXT NOT NULL CHECK (status IN ('open', 'provider_replied', 'evidence_submitted', 'resolved_refund', 'resolved_payout', 'closed')) DEFAULT 'open',
    
    "reason" TEXT NOT NULL,
    "evidence_client" JSONB DEFAULT '[]'::jsonb,
    
    "response_provider" TEXT,
    "evidence_provider" JSONB DEFAULT '[]'::jsonb,
    
    "admin_notes" TEXT,
    "resolution" TEXT CHECK (resolution IN ('client_win', 'provider_win', 'platform_error')),

    CONSTRAINT "disputes_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "disputes_booking_check" CHECK (
        ("service_booking_id" IS NOT NULL AND "event_booking_id" IS NULL) OR 
        ("service_booking_id" IS NULL AND "event_booking_id" IS NOT NULL)
    )
);

-- RLS Policies for disputes
ALTER TABLE "public"."disputes" ENABLE ROW LEVEL SECURITY;

-- Client can view their own disputes
CREATE POLICY "Client can view own disputes" ON "public"."disputes"
    FOR SELECT USING (auth.uid() = client_id);

-- Client can insert dispute for themselves
CREATE POLICY "Client can insert dispute" ON "public"."disputes"
    FOR INSERT WITH CHECK (auth.uid() = client_id);

-- Provider can view disputes against them
CREATE POLICY "Provider can view disputes against them" ON "public"."disputes"
    FOR SELECT USING (auth.uid() = provider_id);

-- Provider can update (respond) to disputes against them
CREATE POLICY "Provider can update dispute response" ON "public"."disputes"
    FOR UPDATE USING (auth.uid() = provider_id);

-- Admin can do everything (assumed service_role or admin user)
-- For now we rely on service role key for admin tasks if needed, or specific admin policies.
