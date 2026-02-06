import {IMAGES} from '@/assets';
import React, {useState} from 'react';
import {useAppStore} from '@/store';
import {Ionicons} from '@expo/vector-icons';
import {useTranslation} from 'react-i18next';
import {supabase, uploadFile} from '@/utils';
import Toast from 'react-native-toast-message';
import {useForm, Controller} from 'react-hook-form';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Link, useRouter, useLocalSearchParams} from 'expo-router';
import Animated, {FadeInDown, FadeInUp} from 'react-native-reanimated';
import {getDocumentAsync, DocumentPickerAsset} from 'expo-document-picker';
import {Display, Subtitle, Button, PasswordStrengthBar, PhoneInputField, Body, Caption, GoogleSignInButton} from '@/components';
import {View, Image, Platform, TextInput, ScrollView, TouchableOpacity, KeyboardAvoidingView, Pressable} from 'react-native';

type FormData = {email: string; phone: string; fullName: string; password: string};
type Role = 'user' | 'provider';

const Register = () => {
  const {t} = useTranslation();
  const router = useRouter();
  const {email: googleEmail, fullName: googleName, googleAuth} = useLocalSearchParams<{email: string; fullName: string; googleAuth: string}>();
  const setSession = useAppStore((s) => s.setSession);

  const [role, setRole] = useState<Role>('user');
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<any>(null);
  const [document, setDocument] = useState<DocumentPickerAsset | null>(null);
  const [isUSResident, setIsUSResident] = useState(false);

  const [docError, setDocError] = useState<string>('');

  const {control, formState, handleSubmit, setValue} = useForm<FormData>({
    defaultValues: {fullName: '', email: '', phone: '', password: ''},
  });

  React.useEffect(() => {
    if (googleAuth === 'true') {
      if (googleEmail) setValue('email', googleEmail);
      if (googleName) setValue('fullName', googleName);
    }
  }, [googleAuth, googleEmail, googleName, setValue]);

  const pickPdf = async () => {
    try {
      const result = await getDocumentAsync({copyToCacheDirectory: false, type: 'application/pdf', multiple: false});
      if (result.canceled) return;
      setDocument(result.assets[0]);
      setDocError('');
    } catch (error: any) {
      Toast.show({type: 'error', text2: error?.message || t('role.errorDoc')});
    }
  };

  const onSubmit = async (data: FormData) => {
    try {
      if (role === 'provider' && !document) return setDocError(t('validation.docRequired'));
      if (!agreeToTerms)
        return Toast.show({type: 'error', text1: t('auth.register.termsRequiredTitle'), text2: t('auth.register.termsRequiredMessage')});

      const {email, phone, password, fullName} = data;
      let userId = '';

      if (googleAuth === 'true') {
        const {data: userData, error: userError} = await supabase.auth.updateUser({data: {role: role, full_name: fullName}});
        if (userError) throw userError;
        if (!userData.user) throw new Error('User data missing');
        userId = userData.user.id;
      } else {
        const {data: authData, error: signUpError} = await supabase.auth.signUp({
          email,
          password,
          options: {data: {role: role, full_name: fullName}},
        });
        if (signUpError) throw signUpError;
        if (!authData.user?.id) throw new Error('User ID missing after signup');
        userId = authData.user.id;
      }

      // 2. Create Profile
      const callingCode = selectedCountry?.callingCode || '';
      const fullPhoneNumber = callingCode ? `${callingCode} ${phone}` : phone;
      const countryValue = callingCode;

      const {error: profileError} = await supabase.from('profile').upsert({
        id: userId,
        role: role,
        name: fullName,
        phone: fullPhoneNumber,
        country_code: countryValue,
        status: role === 'provider' ? 'onboarding' : 'active',
      });

      if (profileError) throw profileError;

      // 3. Provider Specifics
      if (role === 'provider') {
        const file = await uploadFile(document!, 'provider_docs', `${userId}/${document?.name}`);
        if (file.error) throw file.error;
        const {error: providerError} = await supabase.from('provider').insert({id: userId, US: isUSResident, document: file.data?.path});
        if (providerError) throw providerError;
      }

      Toast.show({type: 'success', text2: t('auth.register.success')});

      if (googleAuth === 'true') {
        const session = await supabase.auth.getSession();
        if (session.data.session) {
          setSession(session.data.session);
        }
      } else {
        if (role === 'provider') router.replace('/(provider)/payment-setup');
      }
    } catch (e: any) {
      Toast.show({type: 'error', text1: e?.message});
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom: 40}}>
          {/* HEADER */}
          <View className="m-5 items-center">
            <Image source={IMAGES.logo} className="mt-2 aspect-square h-28" resizeMode="contain" />
          </View>

          <Animated.View entering={FadeInDown.delay(200)} className="mb-4 items-center px-6">
            <Display align="center" className="mb-2 text-black">
              {t('auth.register.title')}
            </Display>
            <Subtitle align="center">{t('auth.register.subtitle')}</Subtitle>
          </Animated.View>

          {/* ROLE TABS */}
          <View className="mx-6 mb-6 flex-row rounded-xl bg-gray-100 p-1">
            <TouchableOpacity
              onPress={() => setRole('user')}
              className={`flex-1 items-center justify-center rounded-lg py-2 ${role === 'user' ? 'bg-white shadow-sm' : 'shadow-none'}`}>
              <View className="flex-row items-center">
                <Ionicons name="search-outline" size={16} color={role === 'user' ? '#00594f' : '#9CA3AF'} style={{marginRight: 6}} />
                <Body className={`font-nunito-bold text-sm ${role === 'user' ? 'text-primary' : 'text-gray-500'}`}>{t('role.joinEventsTitle')}</Body>
              </View>
              <Caption className={`text-[10px] ${role === 'user' ? 'text-primary' : 'text-gray-400'}`}>{t('role.eventsAndServices')}</Caption>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setRole('provider')}
              className={`flex-1 items-center justify-center rounded-lg py-2 ${role === 'provider' ? 'bg-white shadow-sm' : 'shadow-none'}`}>
              <View className="flex-row items-center">
                <Ionicons name="briefcase-outline" size={16} color={role === 'provider' ? '#00594f' : '#9CA3AF'} style={{marginRight: 6}} />
                <Body className={`font-nunito-bold text-sm ${role === 'provider' ? 'text-primary' : 'text-gray-500'}`}>
                  {t('role.hostEventsTitle')}
                </Body>
              </View>
              <Caption className={`text-[10px] ${role === 'provider' ? 'text-primary' : 'text-gray-400'}`}>{t('role.eventsAndServices')}</Caption>
            </TouchableOpacity>
          </View>

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
                  <View
                    className={`rounded-xl border bg-gray-50 ${fieldState.error ? 'border-red-300 bg-red-50' : 'border-gray-200 focus:border-primary'}`}>
                    <TextInput
                      {...field}
                      autoCapitalize="words"
                      placeholderTextColor="#999"
                      onChangeText={field.onChange}
                      placeholder={t('auth.register.fullNamePlaceholder')}
                      style={{fontFamily: 'Nunito_400Regular'}}
                      className="m-0 h-14 px-4 text-base leading-5 text-black"
                    />
                  </View>
                  {fieldState.error && <Caption className="ml-2 mt-1 text-red-500">{fieldState.error.message}</Caption>}
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
                  <View
                    className={`rounded-xl border bg-gray-50 ${fieldState.error ? 'border-red-300 bg-red-50' : 'border-gray-200 focus:border-primary'}`}>
                    <TextInput
                      {...field}
                      editable={googleAuth !== 'true'}
                      autoCapitalize="none"
                      placeholderTextColor="#999"
                      keyboardType="email-address"
                      onChangeText={field.onChange}
                      placeholder={t('auth.register.emailPlaceholder')}
                      style={{fontFamily: 'Nunito_400Regular'}}
                      className={`m-0 h-14 px-4 text-base leading-5 text-black ${googleAuth === 'true' ? 'text-gray-500' : ''}`}
                    />
                  </View>
                  {fieldState.error && <Caption className="ml-2 mt-1 text-red-500">{fieldState.error.message}</Caption>}
                </View>
              )}
            />

            {/* PHONE */}
            <Controller
              name="phone"
              control={control}
              rules={{required: t('validation.phoneRequired')}}
              render={({field, fieldState}) => (
                <PhoneInputField
                  value={field.value}
                  onChangePhoneNumber={field.onChange}
                  selectedCountry={selectedCountry}
                  onChangeSelectedCountry={setSelectedCountry}
                  error={fieldState.error}
                  placeholder={t('auth.register.phonePlaceholder')}
                />
              )}
            />

            {/* PROVIDER FIELDS */}
            {role === 'provider' && (
              <Animated.View entering={FadeInDown.delay(100)} className="mb-4">
                {/* Document Upload */}
                <Pressable
                  onPress={pickPdf}
                  className={`h-32 w-full items-center justify-center overflow-hidden rounded-lg border border-dashed bg-gray-50 ${docError ? 'border-red-300 bg-red-50' : !document ? 'border-gray-300' : 'border-primary bg-primary/5'}`}>
                  <Ionicons size={32} color={document ? '#00594f' : '#9CA3AF'} name={document ? 'document-text-outline' : 'cloud-upload-outline'} />
                  <Body className={`mt-2 px-4 text-center text-sm ${document ? 'font-bold text-primary' : 'text-gray-500'}`}>
                    {document ? document.name : t('role.uploadFileNote')}
                  </Body>
                </Pressable>
                {docError ? <Caption className="ml-2 mt-1 text-red-500">{docError}</Caption> : null}

                {/* US Resident Checkbox */}
                <Pressable onPress={() => setIsUSResident(!isUSResident)} className="mt-4 flex-row items-center">
                  <View
                    className={`mr-3 h-6 w-6 items-center justify-center rounded-lg border-2 ${isUSResident ? 'border-primary bg-primary' : 'border-gray-300 bg-white'}`}>
                    {isUSResident && <Ionicons name="checkmark" size={16} color="white" />}
                  </View>
                  <Body className="text-gray-700">{t('role.checkUS')}</Body>
                </Pressable>
              </Animated.View>
            )}

            {/* PASSWORD */}
            {googleAuth !== 'true' && (
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
                    <View
                      className={`rounded-xl border bg-gray-50 ${fieldState.error ? 'border-red-300 bg-red-50' : 'border-gray-200 focus:border-primary'}`}>
                      <View className="flex-row items-center">
                        <TextInput
                          {...field}
                          placeholderTextColor="#999"
                          onChangeText={field.onChange}
                          secureTextEntry={!showPassword}
                          placeholder={t('auth.register.passwordPlaceholder')}
                          style={{fontFamily: 'Nunito_400Regular'}}
                          className="m-0 h-14 flex-1 px-4 text-base leading-5 text-black"
                        />
                        <TouchableOpacity className="mr-2 p-2" onPress={() => setShowPassword(!showPassword)}>
                          <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color="#666" />
                        </TouchableOpacity>
                      </View>
                      <PasswordStrengthBar password={field?.value} visible={!fieldState.error?.message} />
                    </View>
                    {fieldState.error && <Caption className="ml-2 mt-1 text-red-500">{fieldState.error.message}</Caption>}
                  </View>
                )}
              />
            )}

            {/* TERMS */}
            <View className="mb-5 ml-2 flex-row items-center">
              <TouchableOpacity
                className="mr-2 h-5 w-5 items-center justify-center rounded border-2 border-black"
                onPress={() => setAgreeToTerms(!agreeToTerms)}>
                <View className={`h-2.5 w-2.5 rounded-sm ${agreeToTerms ? 'bg-secondary' : ''}`} />
              </TouchableOpacity>

              <Body className="flex-1 text-sm text-gray-600">
                {t('auth.register.agreeTo')} <Body className="font-nunito-bold text-secondary">{t('auth.register.terms')}</Body> {t('common.and')}{' '}
                <Body className="font-nunito-bold text-secondary">{t('auth.register.conditions')}</Body>
              </Body>
            </View>

            {/* SUBMIT */}
            <Button
              onPress={handleSubmit(onSubmit)}
              loading={formState.isSubmitting}
              label={t('auth.register.signUpButton')}
              fullWidth
              className="mt-4"
            />

            {googleAuth !== 'true' && <GoogleSignInButton />}

            {/* LOGIN LINK */}
            <View className="my-5 flex-row items-center justify-center">
              <Body className="text-sm text-gray-600">{t('auth.register.alreadyMember')} </Body>
              <Link replace href="/auth">
                <Body className="font-nunito-bold text-sm font-semibold text-secondary">{t('auth.register.loginLink')}</Body>
              </Link>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default Register;
