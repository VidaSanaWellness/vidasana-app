import React from 'react';
import {useRouter} from 'expo-router';
import {Ionicons} from '@expo/vector-icons';
import {useRoute} from '@react-navigation/native';
import {useForm, Controller} from 'react-hook-form';
import Animated, {FadeInDown, FadeInUp} from 'react-native-reanimated';
import {View, Text, TextInput, TouchableOpacity, Image, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator} from 'react-native';

type RouteParams = {email: string; phone: string; password: string};

type FormValues = {fullName: string};

const FullNameScreen = () => {
  const {back, navigate} = useRouter();
  const route = useRoute();
  const {email, phone, password} = route.params as RouteParams;

  const {control, formState, handleSubmit} = useForm<FormValues>({defaultValues: {fullName: ''}});

  const onSubmit = async (data: FormValues) =>
    navigate({pathname: '/auth/selectRole', params: {email, phone, password, fullName: data.fullName.trim()}});

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 bg-white">
      <ScrollView contentContainerStyle={{flexGrow: 1, paddingBottom: 30}} showsVerticalScrollIndicator={false}>
        {/* Back Button */}
        <TouchableOpacity className="absolute left-5 top-12 z-10 p-2" onPress={() => back()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>

        {/* Header Section with Logo */}
        <View className="mb-5 mt-12 items-center">
          <Image
            // source={require('../../../assets/v-logo.png')}
            resizeMode="contain"
            className="mt-12 h-[110px] w-[250px]"
          />
        </View>

        {/* Title Section */}
        <Animated.View entering={FadeInDown.delay(200)} className="mb-8 items-center">
          <Text className="mb-2 text-3xl font-bold text-black">One Last Step</Text>
          <Text className="text-base text-gray-500">Please enter your full name</Text>
        </Animated.View>

        {/* Form Section */}
        <Animated.View entering={FadeInUp.delay(400)} className="-mt-8 px-6">
          <Controller
            name="fullName"
            control={control}
            rules={{required: 'Full Name is required'}}
            render={({field, fieldState}) => (
              <>
                <View className={`mb-4 rounded-xl border bg-gray-100 ${fieldState.error ? 'border-red-300 bg-red-100' : 'border-transparent'}`}>
                  <TextInput
                    {...field}
                    autoCapitalize="words"
                    placeholder="Full Name"
                    placeholderTextColor="#999"
                    onChangeText={field.onChange}
                    className="h-[50px] px-4 text-base text-black"
                  />
                </View>
                {fieldState.error && <Text className="mb-2 ml-2 text-sm text-red-500">{fieldState.error.message}</Text>}
              </>
            )}
          />

          {/* Continue Button */}
          <TouchableOpacity
            onPress={handleSubmit(onSubmit)}
            disabled={formState.isSubmitting}
            className="mt-4 h-14 items-center justify-center rounded-full bg-[#3E6065] shadow-2xl">
            {formState.isSubmitting ? <ActivityIndicator color="#FFF" /> : <Text className="text-lg font-semibold text-white">Continue</Text>}
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default FullNameScreen;
