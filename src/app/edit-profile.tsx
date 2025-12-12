import {useAppStore} from '@/store';
import {useRouter} from 'expo-router';
import {Ionicons} from '@expo/vector-icons';
import {useTranslation} from 'react-i18next';
import {Controller, useForm} from 'react-hook-form';
import {SafeAreaView} from 'react-native-safe-area-context';
import Animated, {FadeIn, FadeOut} from 'react-native-reanimated';
import {ActivityIndicator, KeyboardAvoidingView, Platform, Text, TextInput, TouchableOpacity, View} from 'react-native';

const Page = () => {
  const {back} = useRouter();
  const {t} = useTranslation();
  const {user} = useAppStore((s) => s.session!);
  const {control, formState, handleSubmit} = useForm({defaultValues: {fullName: '', phone: user.phone}});

  const submit = () => {};

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-row items-center justify-between p-5">
        <TouchableOpacity onPress={() => back()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-[#1F1F1F]">{t('editProfile')}</Text>
        <View className="w-6" />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <Animated.View entering={FadeIn} exiting={FadeOut} className="flex-1 px-5">
          {/* Full Name */}
          <Controller
            name="fullName"
            control={control}
            rules={{
              required: {value: true, message: 'Full Name is required'},
              minLength: {value: 3, message: 'Name at least have 3 latters'},
              pattern: {value: /^[A-Za-z\s]+$/, message: 'Please enter a valid name'},
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

          <Text className="mb-5 px-2 text-sm text-[#6B6B6B]">Update your personal details so providers and companions can stay in touch.</Text>

          <TouchableOpacity
            onPress={handleSubmit(submit)}
            disabled={formState.isSubmitting}
            className="mt-auto h-12 items-center justify-center rounded-full bg-[#3E6065] shadow">
            {formState.isSubmitting ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text className="text-base font-semibold text-white">Save Changes</Text>
            )}
          </TouchableOpacity>
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default Page;
