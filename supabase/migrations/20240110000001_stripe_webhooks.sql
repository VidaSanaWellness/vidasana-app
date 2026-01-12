-- Create a table to log webhooks for debugging and idempotency
create table if not exists public.stripe_webhooks (
  id uuid primary key default gen_random_uuid(),
  event_id text not null unique,
  event_type text not null,
  payload jsonb not null,
  created_at timestamp with time zone default now(),
  processed_at timestamp with time zone,
  status text default 'pending', -- pending, success, failed
  error_message text
);

-- Enable RLS
alter table public.stripe_webhooks enable row level security;

-- Only service role (Edge Functions) should insert/update these
create policy "Service role can manage webhooks"
  on public.stripe_webhooks
  using (true)
  with check (true);

-- Function to handle booking creation/update on successful checkout
create or replace function public.handle_checkout_session_completed(
  p_session_id text,
  p_payment_intent text,
  p_amount_total bigint,
  p_metadata jsonb,
  p_customer_id text
)
returns void
language plpgsql
security definer
as $$
declare
  v_user_id uuid;
  v_service_id uuid;
  v_event_id uuid;
  v_booking_id uuid;
  v_ticket_type_id uuid;
  v_quantity int;
begin
  -- Resolve user from metadata or stripe customer
  -- Metadata is preferred as it is set at checkout creation time
  v_user_id := (p_metadata->>'user_id')::uuid;
  
  if v_user_id is null then
    -- Fallback: try to find by stripe_customer_id (logic can be expanded)
    select id into v_user_id from public.profile where stripe_customer_id = p_customer_id limit 1;
  end if;

  if v_user_id is null then
    raise exception 'User not found for checkout session %', p_session_id;
  end if;

  -- Check if this is a Service Booking or Event Booking
  if (p_metadata->>'type') = 'service_booking' then
    v_service_id := (p_metadata->>'service_id')::uuid;
    
    -- Create Payment record
    insert into public.payments (amount, currency, status, "user")
    values (
      p_amount_total / 100.0, -- Stripe uses cents
      'usd', -- default, should logic from session
      'completed',
      v_user_id
    ) returning id into v_booking_id; -- Reusing variable for payment_id temporarily

    -- Create Service Booking
    -- NOTE: 'appointed' time should come from metadata
    insert into public.services_booking (
      service, 
      "user", 
      payment_id, 
      price, 
      status, 
      appointed
    )
    values (
      v_service_id,
      v_user_id,
      v_booking_id, -- payment_id
      p_amount_total / 100.0,
      'booked',
      (p_metadata->>'appointed_at')::timestamp
    );

  elsif (p_metadata->>'type') = 'event_booking' then
    v_event_id := (p_metadata->>'event_id')::uuid;
    v_ticket_type_id := (p_metadata->>'ticket_type_id')::uuid;
    v_quantity := coalesce((p_metadata->>'quantity')::int, 1);

    -- Create Payment
    insert into public.payments (amount, currency, status, "user")
    values (
      p_amount_total / 100.0,
      'usd',
      'completed',
      v_user_id
    ) returning id into v_booking_id;

    -- Create Event Booking
    insert into public.event_booking (
      event_id,
      "user",
      ticket_type_id,
      payment_id,
      quantity,
      unit_price,
      total_price
    )
    values (
      v_event_id,
      v_user_id,
      v_ticket_type_id,
      v_booking_id,
      v_quantity,
      (p_amount_total / 100.0) / v_quantity,
      p_amount_total / 100.0
    );
  end if;

end;
$$;
