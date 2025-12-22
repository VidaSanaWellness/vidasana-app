import {IMAGES} from '@/assets';
import {Link} from 'expo-router';
import {supabase} from '@/utils';
import React, {useState} from 'react';
import {useTranslation} from 'react-i18next';
import {Ionicons} from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import {GoogleSignInButton} from '@/components';
import {useForm, Controller} from 'react-hook-form';
import {SafeAreaView} from 'react-native-safe-area-context';
import PasswordStrengthBar from '@/components/PasswordStrengthBar';
import Animated, {FadeInDown, FadeInUp} from 'react-native-reanimated';
import {View, Text, Alert, Image, Platform, TextInput, ScrollView, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView} from 'react-native';

type FormData = {email: string; phone: string; fullName: string; password: string};

const Register = () => {
  const {t} = useTranslation();
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {control, formState, handleSubmit} = useForm<FormData>({defaultValues: {fullName: '', email: '', phone: '', password: ''}});

  const onSubmit = async (data: FormData) => {
    try {
      if (!agreeToTerms) return Alert.alert(t('auth.register.termsRequiredTitle'), t('auth.register.termsRequiredMessage'));
      const {email, phone, password, fullName} = data;
      const {error: signUpError} = await supabase.auth.signUp({email, password, options: {data: {full_name: fullName}}});
      if (signUpError) throw signUpError;
      const {error} = await supabase.from('profile').insert({name: fullName, country: '', phone: phone});
      if (error) throw error;
    } catch (e: any) {
      console.log('🚀 ~ onSubmit ~ e:', e);
      Toast.show({type: 'error', text1: e?.message});
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* HEADER */}
          <View className="m-5 items-center">
            <Image source={IMAGES.logo} className="mt-2 aspect-square h-28" resizeMode="contain" />
          </View>

          <Animated.View entering={FadeInDown.delay(200)} className="mb-8 items-center">
            <Text className="mb-2 text-3xl font-bold text-black">{t('auth.register.title')}</Text>
            <Text className="text-base text-gray-500">{t('auth.register.subtitle')}</Text>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(400)} className="px-6">
            {/* FULL NAME */}
            <Controller
              name="fullName"
              control={control}
              rules={{
                required: t('validation.fullNameRequired'),
                validate: (val) => {
                  if (!/^[A-Za-z\s]+$/.test(val)) return t('validation.fullNameAlphabets');
                  const parts = val.trim().split(' ');
                  if (parts.length < 2) return t('validation.fullNameTwoWords');
                  return true;
                },
              }}
              render={({field, fieldState}) => (
                <View className="mb-4">
                  <View className={`rounded-xl border bg-gray-100 ${fieldState.error ? 'border-red-300 bg-red-100' : 'border-transparent'}`}>
                    <TextInput
                      {...field}
                      autoCapitalize="words"
                      placeholderTextColor="#999"
                      onChangeText={field.onChange}
                      placeholder={t('auth.register.fullNamePlaceholder')}
                      className="m-0 h-14 px-4 text-base leading-5 text-black"
                    />
                  </View>
                  {fieldState.error && <Text className="ml-2 mt-1 text-sm text-red-500">{fieldState.error.message}</Text>}
                </View>
              )}
            />

            {/* EMAIL */}
            <Controller
              name="email"
              control={control}
              rules={{required: t('validation.emailRequired'), pattern: {value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: t('validation.emailInvalid')}}}
              render={({field, fieldState}) => (
                <View className="mb-4">
                  <View className={`rounded-xl border bg-gray-100 ${fieldState.error ? 'border-red-300 bg-red-100' : 'border-transparent'}`}>
                    <TextInput
                      {...field}
                      autoCapitalize="none"
                      placeholderTextColor="#999"
                      keyboardType="email-address"
                      onChangeText={field.onChange}
                      placeholder={t('auth.register.emailPlaceholder')}
                      className="m-0 h-14 px-4 text-base leading-5 text-black"
                    />
                  </View>
                  {fieldState.error && <Text className="ml-2 mt-1 text-sm text-red-500">{fieldState.error.message}</Text>}
                </View>
              )}
            />

            {/* PHONE */}
            <Controller
              name="phone"
              control={control}
              rules={{
                required: t('validation.phoneRequired'),
                pattern: {value: /^(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$/, message: t('validation.phoneInvalid')},
              }}
              render={({field, fieldState}) => (
                <View className="mb-4">
                  <View className={`rounded-xl border bg-gray-100 ${fieldState.error ? 'border-red-300 bg-red-100' : 'border-transparent'}`}>
                    <TextInput
                      {...field}
                      keyboardType="phone-pad"
                      placeholderTextColor="#999"
                      onChangeText={field.onChange}
                      placeholder={t('auth.register.phonePlaceholder')}
                      className="m-0 h-14 px-4 text-base leading-5 text-black"
                    />
                  </View>
                  {fieldState.error && <Text className="ml-2 mt-1 text-sm text-red-500">{fieldState.error.message}</Text>}
                </View>
              )}
            />

            {/* PASSWORD */}
            <Controller
              name="password"
              control={control}
              rules={{
                required: t('validation.passwordRequired'),
                minLength: {value: 8, message: t('validation.passwordMinLength', {count: 8})},
                validate: (val) => {
                  if (!/[A-Z]/.test(val)) return t('validation.passwordUppercase');
                  if (!/[a-z]/.test(val)) return t('validation.passwordLowercase');
                  if (!/[0-9]/.test(val)) return t('validation.passwordNumber');
                  if (!/[!@#$%^&*(),.?":{}|<>]/.test(val)) return t('validation.passwordSpecial');
                  return true;
                },
              }}
              render={({field, fieldState}) => (
                <View className="mb-4">
                  <View className={`rounded-xl border bg-gray-100 ${fieldState.error ? 'border-red-300 bg-red-100' : 'border-transparent'}`}>
                    <View className="flex-row items-center">
                      <TextInput
                        {...field}
                        placeholderTextColor="#999"
                        onChangeText={field.onChange}
                        secureTextEntry={!showPassword}
                        placeholder={t('auth.register.passwordPlaceholder')}
                        className="m-0 h-14 flex-1 px-4 text-base leading-5 text-black"
                      />
                      <TouchableOpacity className="mr-1 p-2" onPress={() => setShowPassword(!showPassword)}>
                        <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={24} color="#666" />
                      </TouchableOpacity>
                    </View>
                    <PasswordStrengthBar password={field?.value} visible={!fieldState.error?.message} />
                  </View>
                  {fieldState.error && <Text className="ml-2 mt-1 text-sm text-red-500">{fieldState.error.message}</Text>}
                </View>
              )}
            />

            {/* TERMS */}
            <View className="mb-5 ml-2 flex-row items-center">
              <TouchableOpacity
                className="mr-2 h-5 w-5 items-center justify-center rounded border-2 border-black"
                onPress={() => setAgreeToTerms(!agreeToTerms)}>
                <View className={`h-2.5 w-2.5 rounded-sm ${agreeToTerms ? 'bg-[#E03C31]' : ''}`} />
              </TouchableOpacity>

              <Text className="flex-1 text-sm text-gray-600">
                {t('auth.register.agreeTo')} <Text className="font-semibold text-[#E03C31]">{t('auth.register.terms')}</Text> {t('common.and')}{' '}
                <Text className="font-semibold text-[#E03C31]">{t('auth.register.conditions')}</Text>
              </Text>
            </View>

            {/* SUBMIT */}
            <TouchableOpacity
              onPress={handleSubmit(onSubmit)}
              disabled={formState.isSubmitting}
              className="mt-4 h-14 items-center justify-center rounded-full bg-[#3E6065] shadow">
              {formState?.isSubmitting ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text className="text-lg font-semibold text-white">{t('auth.register.signUpButton')}</Text>
              )}
            </TouchableOpacity>

            <GoogleSignInButton />

            {/* LOGIN LINK */}
            <View className="my-5 flex-row items-center justify-center">
              <Text className="text-sm text-gray-600">{t('auth.register.alreadyMember')} </Text>
              <Link replace href="/auth">
                <Text className="text-sm font-semibold text-[#E03C31]">{t('auth.register.loginLink')}</Text>
              </Link>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default Register;
