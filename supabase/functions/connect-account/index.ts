import {serve} from 'https://deno.land/std@0.168.0/http/server.ts';
import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14.10.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2023-10-16',
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
    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
      global: {headers: {Authorization: req.headers.get('Authorization')!}},
    });

    const {
      data: {user},
    } = await supabase.auth.getUser();

    if (!user) throw new Error('User not found');

    // Check if provider record exists
    const {data: existingProvider} = await supabase.from('provider').select('stripe, id').eq('id', user.id).single();

    let accountId = existingProvider?.stripe;

    if (!accountId) {
      // Create a Standard Connect Account (or Express)
      const account = await stripe.accounts.create({
        type: 'express',
        email: user.email,
        metadata: {
          supabase_user_id: user.id,
        },
      });
      accountId = account.id;

      // Upsert provider record
      const {error} = await supabase.from('provider').upsert({
        id: user.id,
        stripe: accountId,
      });

      if (error) throw error;
    }

    const {data: newProvider} = await supabase.from('provider').select('stripe, id').eq('id', user.id).single();

    if (!newProvider?.stripe) {
      // Create a Standard Connect Account (or Express)
      const account = await stripe.accounts.create({
        type: 'express',
        email: user.email,
        metadata: {
          supabase_user_id: user.id,
        },
      });
      accountId = account.id;

      // Upsert provider record
      const {error} = await supabase.from('provider').upsert({
        id: user.id,
        stripe: accountId,
      });

      if (error) throw error;
    }

    // Create Account Link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${req.headers.get('origin') || 'exp://localhost'}/provider/stripe-connect?refresh=true`,
      return_url: `${req.headers.get('origin') || 'exp://localhost'}/provider/stripe-connect?success=true`,
      type: 'account_onboarding',
    });

    return new Response(JSON.stringify({url: accountLink.url}), {
      headers: {...corsHeaders, 'Content-Type': 'application/json'},
    });
  } catch (error) {
    return new Response(JSON.stringify({error: error.message}), {
      status: 400,
      headers: {...corsHeaders, 'Content-Type': 'application/json'},
    });
  }
});
