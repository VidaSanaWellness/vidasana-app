-- Enable the wrappers extension
create extension if not exists wrappers with schema extensions;

-- Create the Stripe Foreign Data Wrapper
create foreign data wrapper stripe_wrapper
  handler stripe_fdw_handler
  validator stripe_fdw_validator;

-- Create the Stripe Server
-- NOTE: We are using a placeholder for the api_key. You MUST replace this in your dashboard 
-- or use the vault.decrypted_secrets to inject it securely.
-- For local development, you can edit this manually after migration or set it up via dashboard.
create server stripe_server
  foreign data wrapper stripe_wrapper
  options (
    api_key_id 'stripe_secret_key' -- Expecting a key in vault with this name, or replace with raw key for dev
  );

-- Create Foreign Table for Customers
-- Mapped to stripe.customers
create schema if not exists stripe;

create foreign table stripe.customers (
  id text,
  email text,
  name text,
  description text,
  created timestamp,
  metadata jsonb
)
  server stripe_server
  options (
    object 'customers'
  );

-- Add stripe_customer_id to public.profile
alter table public.profile 
add column if not exists stripe_customer_id text;

-- Create an index for faster lookups
create index if not exists idx_profile_stripe_customer_id 
on public.profile(stripe_customer_id);

-- Explicitly ensuring provider table has valid stripe account column is good practice, 
-- though it exists in current schema, we ensure it here.
-- It is 'stripe' text in the current schema.
comment on column public.provider.stripe is 'Stripe Connect Account ID';
