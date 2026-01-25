import '@/i18n';
import '../../global.css';
import '../../nativewind-interop';
import {useEffect} from 'react';
import {useAppStore} from '@/store';
import AppProvider from '@/provider';
import {supabase} from '@/utils/supabase';
import {Stack, useRouter} from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import {StripeProvider} from '@stripe/stripe-react-native';
import {
  useFonts,
  Nunito_700Bold,
  Nunito_300Light,
  Nunito_900Black,
  Nunito_500Medium,
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_800ExtraBold,
  Nunito_200ExtraLight,
} from '@expo-google-fonts/nunito';

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {initialRouteName: 'index'};

export default function RootLayout() {
  const session = useAppStore((e) => e.session!);
  const user = session?.user;
  const router = useRouter();

  const [fontsLoaded] = useFonts({
    Nunito_700Bold,
    Nunito_300Light,
    Nunito_900Black,
    Nunito_500Medium,
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_800ExtraBold,
    Nunito_200ExtraLight,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  // Global status check for reject/delete (applies to both users and providers)
  useEffect(() => {
    const checkUserStatus = async () => {
      if (!user) return;
      const {data} = await supabase.from('profile').select('status').eq('id', user.id).single();
      const status = data?.status;
      if (status === 'reject') {
        router.replace('/contact-support?reason=reject');
      } else if (status === 'delete') {
        router.replace('/contact-support?reason=delete');
      }
    };

    checkUserStatus();
  }, [user]);

  if (!fontsLoaded) {
    return null; // Or a minimal splash view, but native splash handles this usually
  }

  return (
    <StripeProvider publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY!}>
      <AppProvider>
        <Stack screenOptions={{headerShown: false}}>
          <Stack.Protected guard={!user}>
            <Stack.Screen name="auth" />
          </Stack.Protected>
          <Stack.Protected guard={user?.user_metadata?.role === 'user'}>
            <Stack.Screen name="(user)" />
          </Stack.Protected>
          <Stack.Protected guard={user?.user_metadata?.role === 'provider'}>
            <Stack.Screen name="(provider)" />
          </Stack.Protected>
          <Stack.Protected guard={!!user}>
            <Stack.Screen name="edit-profile" />
          </Stack.Protected>
        </Stack>
      </AppProvider>
    </StripeProvider>
  );
}
