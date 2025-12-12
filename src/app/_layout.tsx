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

export default function RootLayout() {
  const session = useAppStore((e) => e.session!);
  const user = session?.user;

  console.log('🚀 ~ RootLayout ~ user:', user?.user_metadata);

  // useFonts({
  //   TwemojiMozilla: require('../../node_modules/react-native-country-select/lib/assets/fonts/TwemojiMozilla.woff2'),
  // });

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
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
  );
}
