-- Insert the Stripe Secret Key into the Vault for the Wrapper to use
-- We use 'stripe_secret_key' as the name because that is what we referenced in stripe_setup.sql options(api_key_id 'stripe_secret_key')

select vault.create_secret(
  'sk_test_51RnRXzC08CfBZUK0Ak5KV7cyXhJWfrOSu37SLHgdsL6yFsJfQR71g6BYi4yK8UtrcoYMycmeUjOOJOhKYsS03FD400hsgnKY8o', 
  'stripe_secret_key'
);
