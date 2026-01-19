import {IMAGES} from '@/assets';
import {Link} from 'expo-router';
import {supabase} from '@/utils';
import React, {useState} from 'react';
import {Ionicons} from '@expo/vector-icons';
import {useTranslation} from 'react-i18next';
import Toast from 'react-native-toast-message';
import {useForm, Controller} from 'react-hook-form';
import {SafeAreaView} from 'react-native-safe-area-context';
import Animated, {FadeInDown, FadeInUp} from 'react-native-reanimated';
import {View, Text, Image, Platform, TextInput, ScrollView, TouchableOpacity, KeyboardAvoidingView} from 'react-native';
import {Display, Subtitle} from '@/components/Typography';
import {Button} from '@/components/Button';

type LoginFormData = {email: string; password: string};

const Page = () => {
  const {t} = useTranslation();
  const [showPassword, setShowPassword] = useState(false);

  const {control, clearErrors, handleSubmit, formState} = useForm({defaultValues: {email: '', password: ''}});

  const onSubmit = async (data: LoginFormData) => {
    try {
      clearErrors();
      const {email, password} = data;
      const {error} = await supabase.auth.signInWithPassword({email, password});
      if (error) throw error;
    } catch (e: any) {
      return Toast.show({type: 'error', text1: e?.message});
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View className="mb-5 mt-10 items-center">
            <Image source={IMAGES.logo} className="mt-12 aspect-square h-28" resizeMode="contain" />
          </View>

          <Animated.View entering={FadeInDown.delay(200)} className="mb-8 items-center px-6">
            <Display align="center" className="mb-2 text-black">
              {t('auth.login.welcomeBack')}
            </Display>
            <Subtitle align="center" color="gray">
              {t('auth.login.signInSubtitle')}
            </Subtitle>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(400)} className="px-6">
            <View className="w-full">
              <Controller
                name="email"
                control={control}
                rules={{
                  required: {value: true, message: t('validation.emailRequired')},
                  pattern: {value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: t('validation.emailInvalid')},
                }}
                render={({field, fieldState}) => (
                  <>
                    <TextInput
                      {...field}
                      placeholderTextColor="#999"
                      keyboardType="email-address"
                      onChangeText={field.onChange}
                      placeholder={t('auth.login.emailPlaceholder')}
                      style={{fontFamily: 'Nunito_400Regular'}}
                      className={`m-0 h-14 rounded-lg border bg-gray-50 px-4 text-base leading-5 text-black ${fieldState.error ? 'border-red-300 bg-red-50' : 'border-gray-200 focus:border-primary'}`}
                    />
                    {fieldState.error && <Text className="ml-2 mt-1 font-nunito text-sm text-red-500">{fieldState.error.message}</Text>}
                  </>
                )}
              />
              <View className="h-4" />
              <Controller
                name="password"
                control={control}
                rules={{
                  required: {value: true, message: t('validation.passwordRequired')},
                  minLength: {value: 6, message: t('validation.passwordMinLength', {count: 6})},
                }}
                render={({field, fieldState}) => (
                  <>
                    <View
                      className={`flex-row items-center rounded-lg border bg-gray-50 ${formState?.errors.password ? 'border-red-300 bg-red-50' : 'border-gray-200 focus:border-primary'}`}>
                      <TextInput
                        {...field}
                        placeholder={t('auth.login.passwordPlaceholder')}
                        placeholderTextColor="#999"
                        onChangeText={field.onChange}
                        secureTextEntry={!showPassword}
                        style={{fontFamily: 'Nunito_400Regular'}}
                        className="m-0 h-14 flex-1 px-4 text-base leading-5 text-black"
                      />
                      <TouchableOpacity className="mr-2 p-2" onPress={() => setShowPassword(!showPassword)}>
                        <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color="#666" />
                      </TouchableOpacity>
                    </View>
                    {fieldState.error && <Text className="ml-2 mt-1 font-nunito text-sm text-red-500">{fieldState.error.message}</Text>}
                  </>
                )}
              />
            </View>

            <View className="mb-6 mt-2 flex-row items-center justify-end">
              <Link href="/auth/forget-password">
                <Text className="font-nunito-bold text-sm font-semibold text-secondary">{t('auth.login.forgotPassword')}</Text>
              </Link>
            </View>

            {/* SUBMIT BUTTON */}
            <Button onPress={handleSubmit(onSubmit)} loading={formState.isSubmitting} label={t('auth.login.loginButton')} fullWidth />

            {/* <GoogleSignInButton /> */}

            {/* SIGN UP LINK */}
            <View className="mt-8 flex-row items-center justify-center">
              <Text className="font-nunito text-sm text-gray-600">{t('auth.login.noAccount')} </Text>
              <Link replace href="/auth/register">
                <Text className="font-nunito-bold text-sm font-semibold text-secondary">{t('auth.login.signUp')}</Text>
              </Link>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default Page;
