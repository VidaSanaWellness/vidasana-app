import React, {useState} from 'react';
import {useRouter} from 'expo-router';
import {Ionicons} from '@expo/vector-icons';
import {GoogleSignInButton} from '@/components';
import {useForm, Controller} from 'react-hook-form';
import PasswordStrengthBar from '@/components/PasswordStrengthBar';
import Animated, {FadeInDown, FadeInUp} from 'react-native-reanimated';
import {View, Text, Alert, Image, Platform, TextInput, ScrollView, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView} from 'react-native';

type FormData = {email: string; phone: string; password: string};

const Register = () => {
  const {navigate} = useRouter();
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);

  const {control, formState, handleSubmit} = useForm<FormData>({defaultValues: {email: '', phone: '', password: ''}});

  const onSubmit = async (params: FormData) => {
    if (!agreeToTerms) return Alert.alert('Terms Required', 'Please agree to the terms and conditions');
    navigate({params, pathname: '/auth/userDetails'});
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 bg-white">
      <ScrollView contentContainerStyle={{flexGrow: 1, paddingBottom: 30}} showsVerticalScrollIndicator={false}>
        {/* HEADER */}
        <View className="mb-5 mt-10 items-center">
          <Image className="mt-12 h-[110px] w-[250px]" resizeMode="contain" />
        </View>

        <Animated.View entering={FadeInDown.delay(200)} className="mb-8 items-center">
          <Text className="mb-2 text-3xl font-bold text-black">Get Started</Text>
          <Text className="text-base text-gray-500">by creating a free account.</Text>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(400)} className="px-6">
          <Controller
            name="email"
            control={control}
            rules={{required: 'Email is required', pattern: {value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Please enter a valid email address'}}}
            render={({field, fieldState}) => (
              <>
                <View className={`mb-4 rounded-xl border bg-gray-100 ${fieldState.error ? 'border-red-300 bg-red-100' : 'border-transparent'}`}>
                  <TextInput
                    {...field}
                    placeholder="Email"
                    autoCapitalize="none"
                    placeholderTextColor="#999"
                    keyboardType="email-address"
                    onChangeText={field.onChange}
                    className="h-14 px-4 text-base text-black"
                  />
                </View>
                {fieldState.error && <Text className="mb-2 ml-2 text-sm text-red-500">{fieldState.error.message}</Text>}
              </>
            )}
          />

          <Controller
            name="phone"
            control={control}
            rules={{
              required: 'Phone number is required',
              pattern: {value: /^(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$/, message: 'Please enter a valid phone number'},
            }}
            render={({field, fieldState}) => (
              <>
                <View className={`mb-4 rounded-xl border bg-gray-100 ${fieldState.error ? 'border-red-300 bg-red-100' : 'border-transparent'}`}>
                  <TextInput
                    {...field}
                    keyboardType="phone-pad"
                    placeholder="Phone number"
                    placeholderTextColor="#999"
                    onChangeText={field.onChange}
                    className="h-14 px-4 text-base text-black"
                  />
                </View>
                {fieldState.error && <Text className="mb-2 ml-2 text-sm text-red-500">{fieldState.error.message}</Text>}
              </>
            )}
          />

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
              <>
                <View className={`mb-4 rounded-xl border bg-gray-100 ${fieldState.error ? 'border-red-300 bg-red-100' : 'border-transparent'}`}>
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
                      className="h-14 flex-1 px-4 text-base text-black"
                    />
                    <TouchableOpacity className="mr-1 p-2" onPress={() => setShowPassword(!showPassword)}>
                      <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={24} color="#666" />
                    </TouchableOpacity>
                  </View>
                  <PasswordStrengthBar password={field?.value || ''} visible={isPasswordFocused || field?.value?.length! > 0} />
                </View>
                {fieldState.error && <Text className="mb-2 ml-2 text-sm text-red-500">{fieldState.error.message}</Text>}
              </>
            )}
          />

          {/* TERMS */}
          <View className="mb-5 ml-2 flex-row items-center">
            <TouchableOpacity
              className="mr-2 h-5 w-5 items-center justify-center rounded border-2 border-black"
              onPress={() => setAgreeToTerms(!agreeToTerms)}>
              <View className={`h-3 w-3 rounded ${agreeToTerms ? 'bg-[#E03C31]' : ''}`} />
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
            className="mt-4 h-14 items-center justify-center rounded-full bg-[#3E6065] shadow-2xl">
            {formState?.isSubmitting ? <ActivityIndicator color="#FFF" /> : <Text className="text-lg font-semibold text-white">Sign Up</Text>}
          </TouchableOpacity>

          <GoogleSignInButton />

          {/* LOGIN LINK */}
          <View className="mt-5 flex-row items-center justify-center">
            <Text className="text-sm text-gray-600">Already a member? </Text>
            <TouchableOpacity onPress={() => navigate('/auth')}>
              <Text className="text-sm font-semibold text-[#E03C31]">Login</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default Register;
