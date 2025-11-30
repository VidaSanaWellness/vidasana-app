import React from 'react';
import {supabase} from '@/utils';
import {Ionicons} from '@expo/vector-icons';
import {useForm, Controller} from 'react-hook-form';
import {useLocalSearchParams, useRouter} from 'expo-router';
import Animated, {FadeInDown, FadeInUp} from 'react-native-reanimated';
import {KeyboardAvoidingView, Platform, ScrollView, Alert, TouchableOpacity, Text, ActivityIndicator} from 'react-native';

type FormValues = {userType: 'user' | 'provider'};
type RouteParams = {email: string; phone: string; password: string; fullName: string};

const SelectRoleScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const {email, phone, password, fullName} = params as RouteParams;

  const {control, formState, handleSubmit} = useForm<FormValues>({defaultValues: {userType: 'user'}});

  const onSubmit = async (data: FormValues) => {
    try {
      if (!data.userType) return Alert.alert('Error', 'Please select a role to continue');

      const {data: authData, error: signUpError} = await supabase.auth.signUp({
        email,
        password,
        options: {data: {full_name: fullName, phone_number: phone, user_type: data.userType}},
      });

      if (signUpError) return Alert.alert('Sign Up Error', signUpError.message);

      const {error: profileError} = await supabase.from('users').insert([
        {
          email,
          role: data.userType,
          full_name: fullName,
          phone_number: phone,
          id: authData.user?.id,
          auth_id: authData.user?.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);

      if (profileError) {
        return profileError.message.includes('duplicate key value') && profileError.message.includes('email')
          ? Alert.alert('Signup Error', 'A user with this email already exists.')
          : Alert.alert('Profile Error', profileError.message);
      }

      // 3. Ensure active session
      if (!authData.session) {
        const {error: signInError} = await supabase.auth.signInWithPassword({email, password});
        if (signInError) return Alert.alert('Sign In Error', 'Failed to sign in. Please try again.');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to complete registration');
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 bg-white">
      <ScrollView contentContainerStyle={{paddingBottom: 30}} className="flex-grow px-6">
        <TouchableOpacity className="absolute left-5 top-12 z-10 p-2" onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>

        <Animated.View entering={FadeInDown.delay(200)} className="mb-5 mt-16 items-center">
          <Text className="mb-2 text-center text-2xl font-bold text-black">How will you use VidaSana?</Text>
          <Text className="text-center text-base text-gray-500">Choose your role to continue</Text>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(400)} className="mb-8 mt-5 space-y-4">
          <Controller
            control={control}
            name="userType"
            render={({field}) => (
              <>
                <TouchableOpacity
                  className={`rounded-xl border p-5 ${field.value === 'user' ? 'border-[#3E6065] bg-[#3E6065]' : 'border-gray-300 bg-gray-100'}`}
                  onPress={() => field.onChange('user')}>
                  <Text className={`text-lg font-bold ${field.value === 'user' ? 'text-white' : 'text-[#3E6065]'}`}>Join Events</Text>
                  <Text className={`mt-1 text-sm ${field.value === 'user' ? 'text-[#EAF4F2]' : 'text-gray-600'}`}>
                    Discover and attend experiences
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className={`rounded-xl border p-5 ${field.value === 'provider' ? 'border-[#3E6065] bg-[#3E6065]' : 'border-gray-300 bg-gray-100'}`}
                  onPress={() => field.onChange('provider')}>
                  <Text className={`text-lg font-bold ${field.value === 'provider' ? 'text-white' : 'text-[#3E6065]'}`}>Host Events</Text>
                  <Text className={`mt-1 text-sm ${field.value === 'provider' ? 'text-[#EAF4F2]' : 'text-gray-600'}`}>
                    Create and manage your events
                  </Text>
                </TouchableOpacity>
              </>
            )}
          />
        </Animated.View>

        <TouchableOpacity
          onPress={handleSubmit(onSubmit)}
          disabled={formState.isSubmitting}
          className="h-14 items-center justify-center rounded-2xl bg-[#3E6065] shadow-2xl">
          {formState.isSubmitting ? <ActivityIndicator color="#FFF" /> : <Text className="text-lg font-semibold text-white">Continue</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default SelectRoleScreen;
