import {useEffect} from 'react';
import {supabase} from '@/utils';
import {useRouter} from 'expo-router';
import * as Linking from 'expo-linking';
import {View, ActivityIndicator} from 'react-native';

export default function GoogleAuthRedirect() {
  const router = useRouter();

  useEffect(() => {
    const handleDeepLink = async () => {
      try {
        const url = await Linking.getInitialURL();
        if (url) {
          // Extract tokens from the URL hash
          // URL format: vidasana://google-auth#access_token=...&refresh_token=...&...
          const parsedUrl = new URL(url);
          // hash includes the '#', substring(1) removes it
          const hash = parsedUrl.hash ? parsedUrl.hash.substring(1) : '';

          if (!hash) return checkSession();

          const params = new URLSearchParams(hash);
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');

          if (accessToken && refreshToken) {
            const {error} = await supabase.auth.setSession({access_token: accessToken, refresh_token: refreshToken});

            if (error) return router.replace('/auth');

            // Session set successfully, now check profile
            checkSession();
          } else {
            // No tokens found?
            checkSession();
          }
        } else {
          checkSession();
        }
      } catch (e) {
        console.error('Error handling deep link:', e);
        router.replace('/auth');
      }
    };

    const checkSession = async () => {
      const {
        data: {session},
      } = await supabase.auth.getSession();

      if (session) {
        // Check if profile exists
        const {data: profile} = await supabase.from('profile').select('id').eq('id', session.user.id).single();

        if (profile) {
          // Check role for correct redirect
          const role = session.user.user_metadata?.role;
          if (role === 'provider') {
            router.replace('/(provider)/(tabs)/(topTab)');
          } else {
            router.replace('/(user)/(tabs)/home');
          }
        } else {
          // New User: Redirect to Register with pre-filled data
          const email = session.user.email;
          const fullName = session.user.user_metadata?.full_name;

          router.replace({pathname: '/auth/register', params: {email, fullName, googleAuth: 'true'}});
        }
      } else {
        // If no session, go back to auth
        router.replace('/auth');
      }
    };

    handleDeepLink();
  }, []);

  return (
    <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white'}}>
      <ActivityIndicator size="large" color="#00594f" />
    </View>
  );
}
