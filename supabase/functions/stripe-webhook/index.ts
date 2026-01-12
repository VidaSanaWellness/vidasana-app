import {serve} from 'https://deno.land/std@0.168.0/http/server.ts';
import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14.10.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

const endpointSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

serve(async (req) => {
  const signature = req.headers.get('stripe-signature');

  if (!signature || !endpointSecret) {
    return new Response('Webhook signature verification failed.', {status: 400});
  }

  let event;
  try {
    const body = await req.text();
    event = stripe.webhooks.constructEvent(body, signature, endpointSecret);
  } catch (err) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return new Response(`Webhook Error: ${err.message}`, {status: 400});
  }

  // Create Supabase Client (Service Role)
  const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');

  // Log event to database
  try {
    await supabase.from('stripe_webhooks').insert({
      event_id: event.id,
      event_type: event.type,
      payload: event,
      status: 'pending',
    });
  } catch (err) {
    console.error('Failed to log webhook:', err);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const {error} = await supabase.rpc('handle_checkout_session_completed', {
          p_session_id: session.id,
          p_payment_intent: session.payment_intent as string,
          p_amount_total: session.amount_total,
          p_metadata: session.metadata,
          p_customer_id: session.customer as string,
        });

        if (error) throw error;
        break;
      }
      // Add other event handlers here (e.g., account.updated for Connect)
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    // Update webhook log status to success
    await supabase.from('stripe_webhooks').update({status: 'success', processed_at: new Date()}).eq('event_id', event.id);
  } catch (err) {
    console.error(`Error processing event ${event.id}:`, err);
    // Update webhook log status to failed
    await supabase.from('stripe_webhooks').update({status: 'failed', error_message: err.message, processed_at: new Date()}).eq('event_id', event.id);

    return new Response(`Error processing webhook: ${err.message}`, {status: 500});
  }

  return new Response(JSON.stringify({received: true}), {
    headers: {'Content-Type': 'application/json'},
  });
});
