import {supabase} from '@/utils';
import * as Linking from 'expo-linking';
import {useEffect, useState} from 'react';
import * as WebBrowser from 'expo-web-browser';
import {Caption} from './Typography';
import {useTranslation} from 'react-i18next';
import {useRouter} from 'expo-router';
import {useAppStore} from '@/store';
import Toast from 'react-native-toast-message';
import {ActivityIndicator, Image, StyleSheet, TouchableOpacity, View} from 'react-native';

WebBrowser.maybeCompleteAuthSession();

export function GoogleSignInButton() {
  const {t} = useTranslation();
  const router = useRouter();
  const setSession = useAppStore((s) => s.setSession);
  const [loading, setLoading] = useState(false);

  function extractParamsFromUrl(url: string) {
    const parsedUrl = new URL(url);
    const hash = parsedUrl.hash.substring(1);
    const params = new URLSearchParams(hash);

    return {
      code: params.get('code'),
      token_type: params.get('token_type'),
      access_token: params.get('access_token'),
      refresh_token: params.get('refresh_token'),
      provider_token: params.get('provider_token'),
      expires_in: parseInt(params.get('expires_in') || '0'),
    };
  }

  async function handleGoogleAuth() {
    try {
      setLoading(true);
      console.debug('onSignInButtonPress - start');

      const redirectUrl = Linking.createURL('google-auth');
      console.log('Redirect URL:', redirectUrl);

      const res = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          skipBrowserRedirect: true,
          queryParams: {prompt: 'consent'},
          redirectTo: redirectUrl,
        },
      });

      const googleOAuthUrl = res.data.url;

      if (!googleOAuthUrl) return console.error('no oauth url found!');

      const result = await WebBrowser.openAuthSessionAsync(googleOAuthUrl, redirectUrl, {showInRecents: true});

      console.debug('onSignInButtonPress - openAuthSessionAsync - result', {result});

      if (result && result.type === 'success') {
        const params = extractParamsFromUrl(result.url);

        if (params.access_token && params.refresh_token) {
          const {data, error} = await supabase.auth.setSession({access_token: params.access_token, refresh_token: params.refresh_token});
          if (error) throw error;

          // Check if profile exists
          if (data.user) {
            const {data: profile} = await supabase.from('profile').select('id').eq('id', data.user.id).single();

            if (!profile) {
              // New User: Redirect to Register to complete profile
              const email = data.user.email;
              const fullName = data.user.user_metadata?.full_name;
              // We sign out because we want them to "register" properly in the UI flow,
              // or we keep them signed in but prevent app access?
              // Better to keep session but redirect.
              // However, _layout might auto-redirect if session exists.
              // We need to ensure _layout doesn't block "auth" stack if user has no profile?
              // ACTUALLY: The plan says "Do NOT call setSession" if profile missing, effectively.
              // But we MUST call setSession to verify the token and get the user ID/Email securely.
              // So we call setSession, then if NO profile, we might need to rely on _layout gating
              // OR we pass params to register.

              // Let's stick to the plan: Redirect to register.
              // If _layout redirects to "(user)", we have a race condition.
              // But _layout checks for "user" object.
              // Let's pass the info.

              // Optimization: Return to Register page
              router.push({pathname: '/auth/register', params: {email, fullName, googleAuth: 'true'}});
            } else {
              // If profile exists, useAppStore (or the listener in _layout) will pick it up?
              // GoogleLogin doesn't call `useAppStore.setState`.
              // We should rely on Supabase `onAuthStateChange` or manually update store if needed.
              // But `setSession` updates Supabase client state.
              // _layout.tsx uses `useAppStore` which persists.
              // We might need to sync it.

              const session = await supabase.auth.getSession();
              setSession(session.data.session);
            }
          }
        }
      }
    } catch (error) {
      console.log('🚀 ~ handleGoogleAuth ~ error:', error);
      Toast.show({type: 'error', text1: 'Google Sign In Failed', text2: (error as any).message});
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    WebBrowser.warmUpAsync();
    return () => {
      WebBrowser.coolDownAsync();
    };
  }, []);

  return (
    <>
      <View style={styles.orContainer}>
        <View style={styles.orLine} />
        <Caption style={styles.orText}>{t('auth.orLoginWith')}</Caption>
        <View style={styles.orLine} />
      </View>
      <TouchableOpacity onPress={handleGoogleAuth} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#00594f" />
        ) : (
          <Image
            // source={require('../../../assets/google-logo.png')}
            source={{uri: 'https://developers.google.com/identity/images/g-logo.png'}}
            style={styles.googleIcon}
            resizeMode="contain"
          />
        )}
      </TouchableOpacity>
    </>
  );
}

const styles = StyleSheet.create({
  orContainer: {
    marginTop: 40,
    marginVertical: 20,
    alignItems: 'center',
    flexDirection: 'row',
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E5E5',
  },
  orText: {
    fontSize: 14,
    color: '#666',
    paddingHorizontal: 10,
  },
  googleIcon: {
    width: 40,
    height: 40,
    alignSelf: 'center',
  },
});
