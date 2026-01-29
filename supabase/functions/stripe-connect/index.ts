import {serve} from 'https://deno.land/std@0.168.0/http/server.ts';
import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@12.0.0?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2022-11-15',
  httpClient: Stripe.createFetchHttpClient(),
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {headers: corsHeaders});
  }

  try {
    const supabaseClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
      global: {headers: {Authorization: req.headers.get('Authorization')!}},
    });

    // Admin Access for auth updates
    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');

    const {
      data: {user},
    } = await supabaseClient.auth.getUser();

    if (!user) {
      throw new Error('User not found');
    }

    // Parse body once
    const reqData = await req.json();
    const {action} = reqData;

    if (action === 'create_account_link') {
      // 1. Check if provider has stripe_account_id
      let {data: provider} = await supabaseClient.from('provider').select('stripe').eq('id', user.id).single();

      let accountId = provider?.stripe;

      // 2. If not, create Express account
      if (!accountId) {
        const account = await stripe.accounts.create({
          type: 'express',
          country: 'US', // Default to US or make dynamic if needed
          email: user.email,
          capabilities: {
            card_payments: {requested: true},
            transfers: {requested: true},
          },
        });
        accountId = account.id;

        // Save to DB
        await supabaseClient.from('provider').update({stripe: accountId}).eq('id', user.id);
      }

      // 3. Create Account Link
      const accountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: 'https://stripe.com', // Stripe requires HTTPS; Manual close needed on mobile
        return_url: 'https://stripe.com', // Stripe requires HTTPS; Manual close needed on mobile
        type: 'account_onboarding',
      });

      return new Response(JSON.stringify({url: accountLink.url}), {
        headers: {...corsHeaders, 'Content-Type': 'application/json'},
      });
    }

    if (action === 'create_login_link') {
      // Get account ID
      let {data: provider} = await supabaseClient.from('provider').select('stripe').eq('id', user.id).single();

      if (!provider?.stripe) throw new Error('No Stripe account found');

      const loginLink = await stripe.accounts.createLoginLink(provider.stripe);

      return new Response(JSON.stringify({url: loginLink.url}), {
        headers: {...corsHeaders, 'Content-Type': 'application/json'},
      });
    }

    if (action === 'create-ephemeral-key') {
      const {customerId} = reqData;
      if (!customerId) throw new Error('Customer ID required');

      const ephemeralKey = await stripe.ephemeralKeys.create({customer: customerId}, {apiVersion: '2022-11-15'});

      return new Response(JSON.stringify(ephemeralKey), {
        headers: {...corsHeaders, 'Content-Type': 'application/json'},
      });
    }

    if (action === 'create-payment-intent') {
      const {amount, customerId, providerId} = reqData;

      if (!amount || !customerId || !providerId) throw new Error('Missing required params');

      // Get Provider Stripe ID
      let {data: providerData} = await supabaseClient.from('provider').select('stripe').eq('id', providerId).single();
      const stripeAccountId = providerData?.stripe;

      let destinationValid = false;
      if (stripeAccountId) {
        try {
          const account = await stripe.accounts.retrieve(stripeAccountId);
          if (account.capabilities?.transfers === 'active' || account.capabilities?.card_payments === 'active') {
            destinationValid = true;
          }
        } catch (e) {
          console.error('Account validation failed', e);
        }
      }

      let piParams: any = {
        amount: amount,
        currency: 'usd',
        customer: customerId,
        automatic_payment_methods: {enabled: true},
      };

      if (destinationValid) {
        // Platform fee 20%
        piParams['application_fee_amount'] = Math.round(amount * 0.2);
        piParams['transfer_data'] = {destination: stripeAccountId};
      } else {
        piParams['metadata'] = {manual_payout: 'true'};
      }

      const paymentIntent = await stripe.paymentIntents.create(piParams);

      return new Response(JSON.stringify({clientSecret: paymentIntent.client_secret}), {
        headers: {...corsHeaders, 'Content-Type': 'application/json'},
      });
    }

    if (action === 'create-customer') {
      const {email, name} = reqData;

      const customer = await stripe.customers.create({name: name, email: email});

      // Update Supabase Auth Metadata
      await supabaseAdmin.auth.admin.updateUserById(user.id, {
        user_metadata: {stripe_customer_id: customer.id},
      });

      return new Response(JSON.stringify({customerId: customer.id}), {
        headers: {...corsHeaders, 'Content-Type': 'application/json'},
      });
    }

    if (action === 'check_status') {
      let {data: provider} = await supabaseClient.from('provider').select('stripe').eq('id', user.id).single();

      if (!provider?.stripe) {
        return new Response(JSON.stringify({isConnected: false}), {
          headers: {...corsHeaders, 'Content-Type': 'application/json'},
        });
      }

      const account = await stripe.accounts.retrieve(provider.stripe);

      return new Response(
        JSON.stringify({
          isConnected: true,
          details_submitted: account.details_submitted,
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled,
        }),
        {
          headers: {...corsHeaders, 'Content-Type': 'application/json'},
        }
      );
    }

    throw new Error('Invalid action');
  } catch (error) {
    return new Response(JSON.stringify({error: error.message}), {
      headers: {...corsHeaders, 'Content-Type': 'application/json'},
      status: 200, // Returning 200 to debug the error content on client
    });
  }
});
