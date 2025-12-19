import {SafeAreaView} from 'react-native-safe-area-context';
import {KeyboardAvoidingView, Platform, ScrollView, View, TextInput, Text, TouchableOpacity, ActivityIndicator} from 'react-native';
import {useForm, Controller} from 'react-hook-form';
import PasswordStrengthBar from '@/components/PasswordStrengthBar';
import {supabase} from '@/utils';
import Toast from 'react-native-toast-message';
import {useRouter} from 'expo-router';
import {Ionicons} from '@expo/vector-icons';

type FormValues = {
  newPassword: string;
  confirmPassword: string;
};
const ChangePassword = () => {
  const router = useRouter();
  const {
    control,
    handleSubmit,
    watch,
    formState: {errors, isSubmitting, isValid},
  } = useForm<FormValues>({
    defaultValues: {newPassword: '', confirmPassword: ''},
    mode: 'onChange',
  });

  const onSubmit = async ({newPassword}: FormValues) => {
    try {
      const {error} = await supabase.auth.updateUser({password: newPassword});
      if (error) throw error;
      Toast.show({type: 'success', text1: 'Password updated'});
      router.back();
    } catch (err: any) {
      Toast.show({type: 'error', text1: err?.message ?? 'Failed to update password'});
    }
  };

  const watchedPassword = watch('newPassword');

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <ScrollView contentContainerStyle={{flexGrow: 1, padding: 24}} keyboardShouldPersistTaps="handled">
          <View className="mb-6">
            <TouchableOpacity
              onPress={() => router.back()}
              className="mb-4 h-10 w-10 items-center justify-center rounded-full bg-black/70">
              <Ionicons name="arrow-back" size={20} color="#fff" />
            </TouchableOpacity>
            <Text className="text-3xl font-semibold text-black">Change Password</Text>
            <Text className="mt-2 text-base text-gray-500">Enter a new password that meets all of the rules below.</Text>
          </View>

          <Controller
            name="newPassword"
            control={control}
            rules={{
              required: 'New password is required',
              minLength: {value: 8, message: 'Password must be at least 8 characters long'},
              validate: (value) => {
                if (!/[A-Z]/.test(value)) return 'Add at least one uppercase letter';
                if (!/[a-z]/.test(value)) return 'Add at least one lowercase letter';
                if (!/[0-9]/.test(value)) return 'Add at least one number';
                if (!/[!@#$%^&*(),.?":{}|<>]/.test(value)) return 'Add at least one special character';
                return true;
              },
            }}
            render={({field: {onChange, onBlur, value}}) => (
              <View className="mb-5">
                <TextInput
                  value={value}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  autoCapitalize="none"
                  autoCorrect={false}
                  secureTextEntry
                  placeholder="New password"
                  placeholderTextColor="#999"
                  className={`h-14 rounded-2xl border px-4 text-base text-black ${errors.newPassword ? 'border-red-300 bg-red-100' : 'border-gray-200 bg-gray-100'}`}
                />
                {Boolean(watchedPassword) && <PasswordStrengthBar password={watchedPassword} visible />}
                {errors.newPassword && <Text className="mt-1 text-sm text-red-500">{errors.newPassword.message}</Text>}
              </View>
            )}
          />

          <Controller
            name="confirmPassword"
            control={control}
            rules={{
              required: 'Confirm your password',
              validate: (value) => (value === watchedPassword ? true : 'Passwords do not match'),
            }}
            render={({field: {onChange, onBlur, value}}) => (
              <View className="mb-6">
                <TextInput
                  value={value}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  secureTextEntry
                  placeholder="Confirm password"
                  placeholderTextColor="#999"
                  className={`h-14 rounded-2xl border px-4 text-base text-black ${errors.confirmPassword ? 'border-red-300 bg-red-100' : 'border-gray-200 bg-gray-100'}`}
                />
                {errors.confirmPassword && <Text className="mt-1 text-sm text-red-500">{errors.confirmPassword.message}</Text>}
              </View>
            )}
          />

          <TouchableOpacity
            onPress={handleSubmit(onSubmit)}
            disabled={!isValid || isSubmitting}
            className={`h-14 items-center justify-center rounded-full ${!isValid || isSubmitting ? 'bg-gray-300' : 'bg-[#3E6065]'}`}>
            {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text className="text-lg font-semibold text-white">Update Password</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
export default ChangePassword;
