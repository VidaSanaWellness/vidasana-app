import '@/i18n';
import '../../global.css';
import '../../nativewind-svg-interop';
import {useEffect} from 'react';
import {Stack} from 'expo-router';
import AppProvider from '@/provider';
import {useAppStore} from '@/store';
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

export default function RootLayout() {
  const guard = useAppStore((e) => e.session);
  console.log('🚀 ~ RootLayout ~ guard:', guard);

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <AppProvider>
      <Stack screenOptions={{headerShown: false}}>
        <Stack.Protected guard={!!guard}>
          <Stack.Screen name="(tabs)" />
        </Stack.Protected>
        <Stack.Protected guard={!guard}>
          <Stack.Screen name="auth/index" />
        </Stack.Protected>
      </Stack>
    </AppProvider>
  );
}
