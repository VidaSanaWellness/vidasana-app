import '@/i18n';
import '../../global.css';
import '../../nativewind-interop';
import {useEffect} from 'react';
import {Stack} from 'expo-router';
import {useAppStore} from '@/store';
import AppProvider from '@/provider';
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {initialRouteName: 'index'};

import {StripeProvider} from '@stripe/stripe-react-native';

export default function RootLayout() {
  const session = useAppStore((e) => e.session!);
  const user = session?.user;

  // useFonts({
  //   TwemojiMozilla: require('../../node_modules/react-native-country-select/lib/assets/fonts/TwemojiMozilla.woff2'),
  // });

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <StripeProvider
      publishableKey={
        process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
        'pk_test_51QsM40L4Fj1CqEryxUSh6hZCVeQFL3tJ3PR3tEuUo3iNUEFv5v1t9eH86y9L8S0j2L6H0H6J0L5H9J8L4H6J0L5'
      }
      merchantIdentifier="merchant.com.vidasana.app" // optional, for Apple Pay
    >
      <AppProvider>
        <Stack screenOptions={{headerShown: false}}>
          <Stack.Protected guard={!user}>
            <Stack.Screen name="auth" />
          </Stack.Protected>
          <Stack.Protected guard={!user?.user_metadata?.role}>
            <Stack.Screen name="selectRole" />
          </Stack.Protected>
          <Stack.Protected guard={user?.user_metadata?.role === 'user'}>
            <Stack.Screen name="(user)" />
          </Stack.Protected>
          <Stack.Protected guard={user?.user_metadata?.role === 'provider'}>
            <Stack.Screen name="(provider)" />
          </Stack.Protected>
          <Stack.Protected guard={!user}>
            <Stack.Screen name="edit-profile" />
          </Stack.Protected>
        </Stack>
      </AppProvider>
    </StripeProvider>
  );
}
