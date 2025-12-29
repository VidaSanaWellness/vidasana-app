import {IMAGES} from '@/assets';
import {Link} from 'expo-router';
import {supabase} from '@/utils';
import React, {useState} from 'react';
import {Ionicons} from '@expo/vector-icons';
import {useTranslation} from 'react-i18next';
import Toast from 'react-native-toast-message';
import {GoogleSignInButton} from '@/components';
import {useForm, Controller} from 'react-hook-form';
import {SafeAreaView} from 'react-native-safe-area-context';
import Animated, {FadeInDown, FadeInUp} from 'react-native-reanimated';
import {View, Text, Image, Platform, TextInput, ScrollView, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView} from 'react-native';

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
    } catch (e) {
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

          <Animated.View entering={FadeInDown.delay(200)} className="mb-8 items-center">
            <Text className="mb-2 text-3xl font-bold text-black">{t('auth.login.welcomeBack')}</Text>
            <Text className="text-base text-gray-500">{t('auth.login.signInSubtitle')}</Text>
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
                      className={`m-0 h-14 rounded-xl border bg-gray-100 px-4 text-base leading-5 text-black ${fieldState.error ? 'border-red-300 bg-red-100' : 'border-transparent'}`}
                    />
                    {fieldState.error && <Text className="ml-2 mt-1 text-sm text-red-500">{fieldState.error.message}</Text>}
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
                      className={`flex-row items-center rounded-xl border bg-gray-100 ${formState?.errors.password ? 'border-red-300 bg-red-100' : 'border-transparent'}`}>
                      <TextInput
                        {...field}
                        placeholder={t('auth.login.passwordPlaceholder')}
                        placeholderTextColor="#999"
                        onChangeText={field.onChange}
                        secureTextEntry={!showPassword}
                        className="m-0 h-14 flex-1 px-4 text-base leading-5 text-black"
                      />
                      <TouchableOpacity className="mr-1 p-2" onPress={() => setShowPassword(!showPassword)}>
                        <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={24} color="#666" />
                      </TouchableOpacity>
                    </View>
                    {fieldState.error && <Text className="ml-2 mt-1 text-sm text-red-500">{fieldState.error.message}</Text>}
                  </>
                )}
              />
            </View>

            <View className="mb-6 mt-2 flex-row items-center justify-between">
              <Link href="/auth/forget-password">
                <Text className="text-sm font-semibold text-[#E03C31]">{t('auth.login.forgotPassword')}</Text>
              </Link>
            </View>

            {/* SUBMIT BUTTON */}

            <TouchableOpacity
              onPress={handleSubmit(onSubmit)}
              disabled={formState?.isSubmitting}
              className="h-14 items-center justify-center rounded-full bg-[#3E6065] shadow">
              {formState.isSubmitting ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text className="text-lg font-semibold text-white">{t('common.done')}</Text>
              )}
            </TouchableOpacity>

            <GoogleSignInButton />

            {/* SIGN UP LINK */}
            <View className="mt-5 flex-row items-center justify-center">
              <Text className="text-sm text-gray-600">{t('auth.login.noAccount')} </Text>
              <Link replace href="/auth/register">
                <Text className="text-sm font-semibold text-[#E03C31]">{t('auth.login.signUp')}</Text>
              </Link>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default Page;
