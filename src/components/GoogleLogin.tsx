import {supabase} from '@/utils';
import {expo} from '@/../app.json';
import {useEffect, useState} from 'react';
import * as WebBrowser from 'expo-web-browser';
import {Text} from '@react-navigation/elements';
import {useTranslation} from 'react-i18next';
import {ActivityIndicator, Image, StyleSheet, TouchableOpacity, View} from 'react-native';

WebBrowser.maybeCompleteAuthSession();

export function GoogleSignInButton() {
  const {t} = useTranslation();
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
      const res = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {skipBrowserRedirect: true, queryParams: {prompt: 'consent'}, redirectTo: `${expo.scheme}://google-auth`},
      });

      const googleOAuthUrl = res.data.url;

      if (!googleOAuthUrl) return console.error('no oauth url found!');

      const result = await WebBrowser.openAuthSessionAsync(googleOAuthUrl, `${expo.scheme}://google-auth`, {showInRecents: true});

      console.debug('onSignInButtonPress - openAuthSessionAsync - result', {result});

      if (result && result.type === 'success') {
        console.debug('onSignInButtonPress - openAuthSessionAsync - success');
        const params = extractParamsFromUrl(result.url);
        console.debug('onSignInButtonPress - openAuthSessionAsync - success', {params});

        if (params.access_token && params.refresh_token) {
          const {error} = await supabase.auth.setSession({access_token: params.access_token, refresh_token: params.refresh_token});
          if (error) throw error;
        } else {
        }
      }
    } catch (error) {
      console.log('🚀 ~ handleGoogleAuth ~ error:', error);
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
        <Text style={styles.orText}>{t('auth.orLoginWith')}</Text>
        <View style={styles.orLine} />
      </View>
      <TouchableOpacity onPress={handleGoogleAuth} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#000" />
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
