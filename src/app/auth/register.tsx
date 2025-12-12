import {IMAGES} from '@/assets';
import {Link} from 'expo-router';
import {supabase} from '@/utils';
import React, {useState} from 'react';
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
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);

  const {control, formState, handleSubmit} = useForm<FormData>({defaultValues: {fullName: '', email: '', phone: '', password: ''}});

  const onSubmit = async (data: FormData) => {
    try {
      if (!agreeToTerms) return Alert.alert('Terms Required', 'Please agree to the terms and conditions');
      const {email, phone, password, fullName} = data;
      const {data: authData, error: signUpError} = await supabase.auth.signUp({email, password, options: {data: {full_name: fullName}}});
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
            <Text className="mb-2 text-3xl font-bold text-black">Get Started</Text>
            <Text className="text-base text-gray-500">by creating a free account.</Text>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(400)} className="px-6">
            {/* FULL NAME */}
            <Controller
              name="fullName"
              control={control}
              rules={{
                required: 'Full Name is required',
                validate: (val) => {
                  if (!/^[A-Za-z\s]+$/.test(val)) return 'Full name must contain alphabets only';
                  const parts = val.trim().split(' ');
                  if (parts.length < 2) return 'Please enter at least 2 words';
                  return true;
                },
              }}
              render={({field, fieldState}) => (
                <View className="mb-4">
                  <View className={`rounded-xl border bg-gray-100 ${fieldState.error ? 'border-red-300 bg-red-100' : 'border-transparent'}`}>
                    <TextInput
                      {...field}
                      autoCapitalize="words"
                      placeholder="Full Name"
                      placeholderTextColor="#999"
                      onChangeText={field.onChange}
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
              rules={{required: 'Email is required', pattern: {value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Please enter a valid email address'}}}
              render={({field, fieldState}) => (
                <View className="mb-4">
                  <View className={`rounded-xl border bg-gray-100 ${fieldState.error ? 'border-red-300 bg-red-100' : 'border-transparent'}`}>
                    <TextInput
                      {...field}
                      placeholder="Email"
                      autoCapitalize="none"
                      placeholderTextColor="#999"
                      keyboardType="email-address"
                      onChangeText={field.onChange}
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
                required: 'Phone number is required',
                pattern: {value: /^(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$/, message: 'Please enter a valid phone number'},
              }}
              render={({field, fieldState}) => (
                <View className="mb-4">
                  <View className={`rounded-xl border bg-gray-100 ${fieldState.error ? 'border-red-300 bg-red-100' : 'border-transparent'}`}>
                    <TextInput
                      {...field}
                      keyboardType="phone-pad"
                      placeholder="Phone number"
                      placeholderTextColor="#999"
                      onChangeText={field.onChange}
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
                required: 'Password is required',
                minLength: {value: 8, message: 'Password must be at least 8 characters long'},
                validate: (val) => {
                  if (!/[A-Z]/.test(val)) return 'Password must contain at least one uppercase letter';
                  if (!/[a-z]/.test(val)) return 'Password must contain at least one lowercase letter';
                  if (!/[0-9]/.test(val)) return 'Password must contain at least one number';
                  if (!/[!@#$%^&*(),.?":{}|<>]/.test(val)) return 'Password must contain at least one special character';
                  return true;
                },
              }}
              render={({field, fieldState}) => (
                <View className="mb-4">
                  <View className={`rounded-xl border bg-gray-100 ${fieldState.error ? 'border-red-300 bg-red-100' : 'border-transparent'}`}>
                    <View className="flex-row items-center">
                      <TextInput
                        {...field}
                        placeholder="Strong password"
                        onChangeText={field.onChange}
                        secureTextEntry={!showPassword}
                        onFocus={() => setIsPasswordFocused(true)}
                        onBlur={() => {
                          field.onBlur();
                          if (!fieldState.error) setIsPasswordFocused(false);
                        }}
                        placeholderTextColor="#999"
                        className="m-0 h-14 flex-1 px-4 text-base leading-5 text-black"
                      />
                      <TouchableOpacity className="mr-1 p-2" onPress={() => setShowPassword(!showPassword)}>
                        <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={24} color="#666" />
                      </TouchableOpacity>
                    </View>
                    <PasswordStrengthBar password={field?.value || ''} visible={isPasswordFocused || (field?.value?.length || 0) > 0} />
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
                I agree to the <Text className="font-semibold text-[#E03C31]">Terms</Text> and{' '}
                <Text className="font-semibold text-[#E03C31]">Conditions</Text>
              </Text>
            </View>

            {/* SUBMIT */}
            <TouchableOpacity
              onPress={handleSubmit(onSubmit)}
              disabled={formState.isSubmitting}
              className="mt-4 h-14 items-center justify-center rounded-full bg-[#3E6065] shadow">
              {formState?.isSubmitting ? <ActivityIndicator color="#FFF" /> : <Text className="text-lg font-semibold text-white">Sign Up</Text>}
            </TouchableOpacity>

            <GoogleSignInButton />

            {/* LOGIN LINK */}
            <View className="my-5 flex-row items-center justify-center">
              <Text className="text-sm text-gray-600">Already a member? </Text>
              <Link replace href="/auth">
                <Text className="text-sm font-semibold text-[#E03C31]">Login</Text>
              </Link>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default Register;
