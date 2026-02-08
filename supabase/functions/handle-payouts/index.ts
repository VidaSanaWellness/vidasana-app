import {serve} from 'https://deno.land/std@0.168.0/http/server.ts';
import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14.10.0?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {headers: corsHeaders});
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const {bookingId} = await req.json().catch(() => ({bookingId: null})); // Optional Manual Trigger

    // Logic: Transfer 100% of payment to Provider (Connected Account)
    // We assume the payment is already collected on Platform (via stripe-connect changes)
    // and is sitting in the Platform's balance.

    let bookingsToProcess = [];

    if (bookingId) {
      // Fetch specific booking
      // Check services_booking first
      let {data: serviceBooking} = await supabase
        .from('services_booking')
        .select(
          `
          id, price, status,
          service:services!inner ( provider ) 
        `
        )
        .eq('id', bookingId)
        .single();

      if (serviceBooking) {
        bookingsToProcess.push({
          id: serviceBooking.id,
          amount: serviceBooking.price,
          provider_id: serviceBooking.service.provider,
          type: 'service',
        });
      } else {
        // Check event_booking
        let {data: eventBooking} = await supabase
          .from('event_booking')
          .select(
            `
                id, total_price, status,
                event:events!inner ( provider )
            `
          )
          .eq('id', bookingId)
          .single();

        if (eventBooking) {
          bookingsToProcess.push({
            id: eventBooking.id,
            amount: eventBooking.total_price,
            provider_id: eventBooking.event.provider,
            type: 'event',
          });
        }
      }
    } else {
      // Batch Process (e.g. Cron)
      // TO DO: Fetch 'completed' bookings older than 7 days that haven't been paid out.
      // For this MVP step, we only support manual trigger via ID or we'd need a 'payout_status' column.
      return new Response(JSON.stringify({message: 'Please provide bookingId for manual payout test or implement batch logic.'}), {
        headers: {...corsHeaders, 'Content-Type': 'application/json'},
      });
    }

    const results = [];

    for (const booking of bookingsToProcess) {
      // 1. Get Provider Stripe ID
      const {data: provider} = await supabase.from('provider').select('stripe').eq('id', booking.provider_id).single();

      if (!provider?.stripe) {
        results.push({id: booking.id, error: 'Provider has no Stripe URL'});
        continue;
      }

      const payoutAmount = Math.round(booking.amount * 100); // Cents

      // 2. Create Transfer
      // We transfer 100% (No Fees per user request "transfer 100% payment to client")
      // "Client" here interpreted as "Connected Account/Provider".
      try {
        const transfer = await stripe.transfers.create({
          amount: payoutAmount,
          currency: 'usd',
          destination: provider.stripe,
          metadata: {
            booking_id: booking.id,
            type: booking.type,
            manual_payout: 'true',
          },
          // source_transaction: ... // We really should link this if possible, but we don't have the ID handy unless we query logic.
          // For now, allow transfer from Available Platform Balance.
        });

        results.push({id: booking.id, status: 'transferred', transfer_id: transfer.id, amount: payoutAmount});

        // Optional: Mark as paid in DB if we had a column
      } catch (idxError) {
        results.push({id: booking.id, error: idxError.message});
      }
    }

    return new Response(JSON.stringify({results}), {
      headers: {...corsHeaders, 'Content-Type': 'application/json'},
    });
  } catch (error) {
    return new Response(JSON.stringify({error: error.message}), {
      headers: {...corsHeaders, 'Content-Type': 'application/json'},
      status: 400,
    });
  }
});
