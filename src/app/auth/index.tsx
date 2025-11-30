import {supabase} from '@/utils';
import React, {useState} from 'react';
import {useRouter} from 'expo-router';
import {Ionicons} from '@expo/vector-icons';
import {GoogleSignInButton} from '@/components';
import {useForm, Controller} from 'react-hook-form';
import Animated, {FadeInDown, FadeInUp} from 'react-native-reanimated';
import {View, Text, Alert, Image, Platform, TextInput, ScrollView, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView} from 'react-native';

type LoginFormData = {email: string; password: string};

const Page = () => {
  const {navigate} = useRouter();

  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {control, setError, clearErrors, handleSubmit, formState} = useForm({defaultValues: {email: '', password: ''}});

  const onSubmit = async (data: LoginFormData) => {
    try {
      const {email, password} = data;
      clearErrors();

      // TODO: working on user DB
      // const {error: userError} = await supabase.from('users').select('email').eq('email', email).single();
      // if (userError) {
      //   setError('email', {type: 'manual', message: 'Account not found'});
      //   return Alert.alert('Account Not Found', 'No account found with this email. Would you like to create one?', [
      //     {text: 'Cancel', style: 'cancel'},
      //     {text: 'Sign Up', onPress: () => navigate('Register')},
      //   ]);
      // }

      const {error} = await supabase.auth.signInWithPassword({email, password});

      if (error) {
        return error.message.includes('Invalid login credentials')
          ? setError('password', {type: 'manual', message: 'Incorrect password'})
          : Alert.alert('Error', 'Failed to sign in. Please try again.');
      }
    } catch (error) {
      return Alert.alert('Error', 'Failed to sign in. Please try again.');
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 bg-white">
      <ScrollView contentContainerStyle={{flexGrow: 1, paddingBottom: 30}} showsVerticalScrollIndicator={false}>
        <View className="mb-5 mt-10 items-center">
          <Image className="mt-12 h-[110px] w-[250px]" resizeMode="contain" />
        </View>

        <Animated.View entering={FadeInDown.delay(200)} className="mb-8 items-center">
          <Text className="mb-2 text-3xl font-bold text-black">Welcome Back</Text>
          <Text className="text-base text-gray-500">sign in to access your account</Text>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(400)} className="px-6">
          <View className="w-full">
            <Controller
              name="email"
              control={control}
              rules={{required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/}}
              render={({field, fieldState}) => (
                <>
                  <TextInput
                    {...field}
                    placeholderTextColor="#999"
                    keyboardType="email-address"
                    onChangeText={field.onChange}
                    placeholder="Enter your email"
                    className={`h-14 rounded-xl border bg-gray-100 px-4 text-base text-black ${fieldState.error ? 'border-red-300 bg-red-100' : 'border-transparent'}`}
                  />
                  {fieldState.error && <Text className="mb-2 ml-2 text-sm text-red-500">{fieldState.error.message}</Text>}
                </>
              )}
            />
            <View className="h-4" />
            <Controller
              name="password"
              control={control}
              rules={{minLength: 4, required: true}}
              render={({field, fieldState}) => (
                <>
                  <View
                    className={`flex-row items-center rounded-xl border bg-gray-100 ${formState?.errors.password ? 'border-red-300 bg-red-100' : 'border-transparent'}`}>
                    <TextInput
                      {...field}
                      placeholder="Password"
                      placeholderTextColor="#999"
                      onChangeText={field.onChange}
                      secureTextEntry={!showPassword}
                      className="h-14 flex-1 px-4 text-base text-black"
                    />
                    <TouchableOpacity className="mr-1 p-2" onPress={() => setShowPassword(!showPassword)}>
                      <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={24} color="#666" />
                    </TouchableOpacity>
                  </View>
                  {fieldState.error && <Text className="mb-2 ml-2 text-sm text-red-500">{fieldState.error.message}</Text>}
                </>
              )}
            />
          </View>

          <View className="mb-6 mt-2 flex-row items-center justify-between">
            <TouchableOpacity className="ml-1 mt-2 flex-row items-center" onPress={() => setRememberMe(!rememberMe)}>
              <View className={`mr-2 h-5 w-5 items-center justify-center rounded border-2 border-black  ${rememberMe ? 'bg-white' : ''}`}>
                <View className={`h-3 w-3 rounded ${rememberMe ? 'bg-[#E03C31]' : ''}`} />
              </View>
              <Text className="text-sm text-gray-600">Remember me</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigate('/auth/forgetPassword')}>
              <Text className="text-sm font-semibold text-[#E03C31]">Forget password?</Text>
            </TouchableOpacity>
          </View>

          {/* SUBMIT BUTTON */}

          <TouchableOpacity
            onPress={handleSubmit(onSubmit)}
            disabled={formState?.isSubmitting}
            className="h-14 items-center justify-center rounded-full bg-[#3E6065] shadow-2xl">
            {formState.isSubmitting ? <ActivityIndicator color="#FFF" /> : <Text className="text-lg font-semibold text-white">Done</Text>}
          </TouchableOpacity>

          <GoogleSignInButton />

          {/* SIGN UP LINK */}
          <View className="mt-5 flex-row items-center justify-center">
            <Text className="text-sm text-gray-600">Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigate('/auth/register')}>
              <Text className="text-sm font-semibold text-[#E03C31]">Sign up</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default Page;
