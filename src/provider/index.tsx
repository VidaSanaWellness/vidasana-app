import {supabase} from '@/utils';
import {useAppStore} from '@/store';
import {StatusBar} from 'expo-status-bar';
import {useQueryClientState} from '@/hooks';
import {ReactElement, useEffect} from 'react';
import {KeyboardProvider} from 'react-native-keyboard-controller';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {queries: {retry: 2, staleTime: __DEV__ ? 0 : 1000 * 60 * 10}},
});

const AppProvider = ({children}: {children: ReactElement}) => {
  useQueryClientState();

  const setSession = useAppStore((s) => s.setSession);

  useEffect(() => {
    const {data} = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('Auth state changed:', {event: _event, session});
      setSession(session);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  return (
    <>
      <StatusBar translucent style="auto" backgroundColor="transparent" />
      <GestureHandlerRootView className="flex-1">
        <QueryClientProvider client={queryClient}>
          <KeyboardProvider>{children}</KeyboardProvider>
        </QueryClientProvider>
      </GestureHandlerRootView>
    </>
  );
};

export default AppProvider;
