import {Stack, useRouter, useSegments} from 'expo-router';
import {useEffect, useState} from 'react';
import {supabase} from '@/utils/supabase';
import {useAppStore} from '@/store';
import {View, ActivityIndicator} from 'react-native';

export default function ProviderLayout() {
  const [loading, setLoading] = useState(true);
  const {user} = useAppStore((s) => s.session!);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    checkStatus();
  }, [segments]);

  const checkStatus = async () => {
    if (!user) return;

    // 1. Get Status & Provider Details
    const {data: profileData} = await supabase.from('profile').select('status').eq('id', user.id).single();
    const {data: providerData} = await supabase.from('provider').select('stripe').eq('id', user.id).single();

    const status = profileData?.status || 'onboarding';
    const hasStripe = !!providerData?.stripe;

    // 2. Determine Current Page
    const routeName = segments[1];

    // 3. Logic
    if (status === 'onboarding') {
      if (routeName !== 'payment-setup') router.replace('/(provider)/payment-setup');
    }
    // "Pending" = Under Review, BUT check if they actually finished Stripe first
    else if (status === 'pending') {
      if (!hasStripe) {
        // New user (default pending) who hasn't done stripe -> Send to setup
        if (routeName !== 'payment-setup') router.replace('/(provider)/payment-setup');
      } else {
        // User who HAS done stripe -> Send to proper Under Review screen
        if (routeName !== 'under-review') router.replace('/(provider)/under-review');
      }
    } else if (status === 'active') {
      if (!hasStripe && routeName !== 'payment-setup') router.replace('/(provider)/payment-setup');
    } else if (status === 'reject') {
      router.replace('/contact-support?reason=reject');
    } else if (status === 'delete') {
      router.replace('/contact-support?reason=delete');
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#00594f" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{headerShown: false}}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="payment-setup" options={{headerShown: false, presentation: 'fullScreenModal'}} />
      <Stack.Screen name="under-review" options={{headerShown: false}} />
      <Stack.Screen name="events/create" />
      <Stack.Screen name="events/[id]" />
      <Stack.Screen name="events/edit/[id]" />
      <Stack.Screen name="services/create" />
      <Stack.Screen name="services/[id]" />
      <Stack.Screen name="services/edit/[id]" />
    </Stack>
  );
}
