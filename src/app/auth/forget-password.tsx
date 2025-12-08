import React from 'react';
import {IMAGES} from '@/assets';
import {supabase} from '@/utils';
import {expo} from '@/../app.json';
import {useRouter} from 'expo-router';
import {Ionicons} from '@expo/vector-icons';
import {useForm, Controller} from 'react-hook-form';
import {SafeAreaView} from 'react-native-safe-area-context';
import Animated, {FadeInDown, FadeInUp} from 'react-native-reanimated';
import {View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Image} from 'react-native';

const Page = () => {
  const {back} = useRouter();
  const {control, formState, handleSubmit} = useForm<{email: string}>({defaultValues: {email: ''}});

  const onSubmit = async (data: {email: string}) => {
    try {
      const {error} = await supabase.auth.resetPasswordForEmail(data.email, {redirectTo: `${expo.scheme}://reset-password`});
      if (error) {
        console.error(error.message);
      } else {
        back();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Header Section */}
          <View className="mb-5 flex-row items-center px-4">
            <TouchableOpacity className="mt-2 p-2" onPress={() => back()}>
              <Ionicons name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>
          </View>

          <View className="m-4 items-center">
            <Image source={IMAGES.logo} className="mt-12 aspect-square h-28" resizeMode="contain" />
          </View>

          <Animated.View entering={FadeInDown.delay(200)} className="mb-8 mt-9 items-center">
            <Text className="mb-2 text-3xl font-bold text-black">Reset Password</Text>
            <Text className="px-10 text-center text-base text-gray-500">Enter your email to receive reset instructions</Text>
          </Animated.View>

          {/* Form Section */}
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
                      autoCapitalize="none"
                      placeholderTextColor="#999"
                      keyboardType="email-address"
                      onChangeText={field.onChange}
                      placeholder="Enter your email"
                      className="m-0 h-14 px-4 leading-5 text-black"
                    />
                  </View>
                  {fieldState.error && <Text className="mb-2 ml-2 text-sm text-red-500">{fieldState.error.message}</Text>}
                </>
              )}
            />

            {/* Reset Button */}
            <TouchableOpacity
              onPress={handleSubmit(onSubmit)}
              disabled={formState.isSubmitting}
              className="mt-4 h-14 items-center justify-center rounded-full bg-[#3E6065] shadow">
              {formState.isSubmitting ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text className="text-lg font-semibold text-white">Send Reset Link</Text>
              )}
            </TouchableOpacity>

            {/* Back to Login Link */}
            <View className="mt-5 flex-row items-center justify-center">
              <Text className="text-sm text-gray-600">Remember your password? </Text>
              <TouchableOpacity onPress={() => back()}>
                <Text className="text-sm font-semibold text-[#E03C31]">Login</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default Page;
