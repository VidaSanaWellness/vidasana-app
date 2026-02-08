import {serve} from 'https://deno.land/std@0.168.0/http/server.ts';
import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
import {Resend} from 'https://esm.sh/resend@1.0.0';

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
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
    const {disputeId} = await req.json();

    if (!disputeId) {
      throw new Error('Missing disputeId');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Fetch Dispute & Provider Details
    const {data: dispute, error: disputeError} = await supabase
      .from('disputes')
      .select(
        `
        *,
        provider:profile!disputes_provider_id_fkey(name, email),
        client:profile!disputes_client_id_fkey(name)
      `
      )
      .eq('id', disputeId)
      .single();

    if (disputeError || !dispute) {
      console.error('Dispute fetch error:', disputeError);
      throw new Error('Could not find dispute');
    }

    const providerEmail = dispute.provider?.email;
    const providerName = dispute.provider?.name || 'Provider';
    const clientName = dispute.client?.name || 'Client';

    if (!providerEmail) {
      console.log('No provider email found, skipping notification.');
      return new Response(JSON.stringify({message: 'No provider email'}), {
        headers: {...corsHeaders, 'Content-Type': 'application/json'},
      });
    }

    // 2. Send Email via Resend
    const {data: emailData, error: emailError} = await resend.emails.send({
      from: 'VidaSana <support@vidasanawellness.com>', // Update with verified domain
      to: [providerEmail],
      subject: `Action Required: New Dispute for Booking #${disputeId.substring(0, 8)}`,
      html: `
        <h1>New Dispute Reported</h1>
        <p>Hello ${providerName},</p>
        <p>A dispute has been reported by <strong>${clientName}</strong> for one of your bookings.</p>
        <p><strong>Reason:</strong> ${dispute.reason}</p>
        <p>Please log in to your Provider Dashboard to view the details and respond within 48 hours to avoid automatic resolution in the client's favor.</p>
        <br/>
        <p>Best regards,<br/>The VidaSana Team</p>
      `,
    });

    if (emailError) {
      console.error('Resend error:', emailError);
      throw emailError;
    }

    return new Response(JSON.stringify({success: true, emailId: emailData?.id}), {
      headers: {...corsHeaders, 'Content-Type': 'application/json'},
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({error: error.message}), {
      headers: {...corsHeaders, 'Content-Type': 'application/json'},
      status: 400,
    });
  }
});
