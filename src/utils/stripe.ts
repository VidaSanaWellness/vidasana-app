import {supabase} from './supabase';
import {Alert, Linking} from 'react-native';

export const stripe = {
  /**
   * Onboard a provider to Stripe Connect
   */
  connectAccount: async () => {
    try {
      const {data, error} = await supabase.functions.invoke('connect-account', {method: 'POST'});

      if (error) throw error;
      if (data?.url) {
        await Linking.openURL(data.url);
      } else {
        throw new Error('No onboarding URL returned');
      }
    } catch (error: any) {
      console.error('Stripe Connect Error:', error);
      Alert.alert('Error', error.message || 'Failed to connect Stripe account');
    }
  },

  /**
   * Fetch parameters for PaymentSheet (Local/Client-side implementation)
   * Uses direct Stripe API calls to bypass backend deployment issues.
   */
  fetchPaymentSheetParams: async ({serviceId}: {serviceId: string}) => {
    // Helper for Stripe API
    const stripeFetch = async (endpoint: string, method: 'POST' | 'GET', body?: any, customHeaders?: any) => {
      const url = `https://api.stripe.com/v1/${endpoint}`;
      const formBody = body
        ? Object.keys(body)
            .map((key) => {
              if (typeof body[key] === 'object') {
                // Simplified nested object serialization for transfer_data/metadata
                return Object.keys(body[key])
                  .map((subKey) => `${key}[${subKey}]=${encodeURIComponent(body[key][subKey])}`)
                  .join('&');
              }
              return `${key}=${encodeURIComponent(body[key])}`;
            })
            .join('&')
        : '';

      const resp = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${process.env.EXPO_PUBLIC_STRIPE_SECRET_KEY}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          ...customHeaders,
        },
        body: method === 'POST' ? formBody : undefined,
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json.error?.message || 'Stripe API Error');
      return json;
    };

    try {
      const {
        data: {user},
      } = await supabase.auth.getUser();
      if (!user) throw new Error('User not found');

      // 1. Get Service & Provider
      let providerId;
      let price = 0;

      if (serviceId) {
        const {data} = await supabase.from('services').select('id, price, provider').eq('id', serviceId).single();
        if (!data) throw new Error('Service not found');
        providerId = data.provider;
        price = data.price || 0;
      }

      const {data: providerData} = await supabase.from('provider').select('stripe').eq('id', providerId).single();
      const stripeAccountId = providerData?.stripe;

      // 2. Validate Account via API
      let destinationValid = false;
      if (stripeAccountId) {
        try {
          // Retrieve Account
          await stripeFetch(`accounts/${stripeAccountId}`, 'GET');
          destinationValid = true;
        } catch (e: any) {
          // Account validation failed; destinationValid stays false
        }
      }

      // 3. Customer
      let customerId = user.stripe_customer_id;
      if (!customerId) {
        const cust = await stripeFetch('customers', 'POST', {email: user.email});
        customerId = cust.id;
      }

      // 4. Ephemeral Key
      // REQUIRED: Must pass Stripe-Version header for ephemeral keys
      const ek = await stripeFetch('ephemeral_keys', 'POST', {customer: customerId}, {'Stripe-Version': '2023-10-16'});

      // 5. Payment Intent
      const amount = Math.round(price * 100);
      let piParams: any = {
        amount: amount,
        currency: 'usd',
        customer: customerId,
        'automatic_payment_methods[enabled]': 'true',
      };

      if (destinationValid) {
        piParams['application_fee_amount'] = Math.round(amount * 0.2);
        piParams['transfer_data[destination]'] = stripeAccountId;
      } else {
        piParams['metadata[manual_payout]'] = 'true';
      }

      const pi = await stripeFetch('payment_intents', 'POST', piParams);

      return {
        paymentIntent: pi.client_secret,
        ephemeralKey: ek.secret,
        customer: customerId,
        publishableKey: process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY,
      };
    } catch (error: any) {
      Alert.alert('Payment Error', error.message);
      throw error;
    }
  },
};
