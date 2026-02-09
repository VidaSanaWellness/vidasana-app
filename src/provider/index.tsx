import {useAppStore} from '@/store';
import {StatusBar} from 'expo-status-bar';
import storage from 'expo-sqlite/kv-store';
import {useQueryClientState} from '@/hooks';
import {SOSFAB, SOSModal} from '@/components';
import {supabase, toastConfig} from '@/utils';
import {ReactElement, useEffect} from 'react';
import Toast from 'react-native-toast-message';
import {QueryClient} from '@tanstack/react-query';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {KeyboardProvider} from 'react-native-keyboard-controller';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {PersistQueryClientProvider} from '@tanstack/react-query-persist-client';
import {createAsyncStoragePersister} from '@tanstack/query-async-storage-persister';

const queryClient = new QueryClient({defaultOptions: {queries: {retry: 2, staleTime: __DEV__ ? 0 : 1000 * 60 * 10}}});

const AppProvider = ({children}: {children: ReactElement}) => {
  useQueryClientState();
  const {top} = useSafeAreaInsets();
  const setSession = useAppStore((s) => s.setSession);

  useEffect(() => {
    const {data} = supabase.auth.onAuthStateChange((e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  return (
    <>
      <GestureHandlerRootView className="flex-1">
        <PersistQueryClientProvider client={queryClient} persistOptions={{persister: createAsyncStoragePersister({storage})}}>
          <KeyboardProvider>{children}</KeyboardProvider>
        </PersistQueryClientProvider>
      </GestureHandlerRootView>
      <StatusBar translucent style="auto" backgroundColor="transparent" />
      <Toast position="top" topOffset={top} config={toastConfig} />
      <SOSModal />
      <SOSFAB />
    </>
  );
};

export default AppProvider;
