import {SafeAreaView} from 'react-native-safe-area-context';
import {KeyboardAvoidingView, Platform, ScrollView, View, TextInput, Text, TouchableOpacity, Image, ActivityIndicator} from 'react-native';
import {useState} from 'react';
import {useForm, Controller} from 'react-hook-form';
import PasswordStrengthBar from '@/components/PasswordStrengthBar';
import {supabase} from '@/utils';
import Toast from 'react-native-toast-message';
import {useRouter} from 'expo-router';
import {Ionicons} from '@expo/vector-icons';
import Animated, {FadeInDown, FadeInUp} from 'react-native-reanimated';
import {useTranslation} from 'react-i18next';
import {IMAGES} from '@/assets';

type FormValues = {
  newPassword: string;
  confirmPassword: string;
};
const ChangePassword = () => {
  const {back} = useRouter();
  const {t} = useTranslation();
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const {control, formState, handleSubmit} = useForm<FormValues>({defaultValues: {newPassword: '', confirmPassword: ''}});

  const onSubmit = async ({newPassword}: FormValues) => {
    try {
      const {error} = await supabase.auth.updateUser({password: newPassword});
      if (error) throw error;
      Toast.show({type: 'success', text1: 'Password updated'});
      back();
    } catch (err: any) {
      Toast.show({type: 'error', text1: err?.message ?? 'Failed to update password'});
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <ScrollView keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled">
          <View className="flex-row items-center px-4">
            <TouchableOpacity className="mt-2 p-2" onPress={() => back()}>
              <Ionicons name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>
          </View>

          <View className="m-4 items-center">
            <Image source={IMAGES.logo} className="mt-12 aspect-square h-28" resizeMode="contain" />
          </View>

          <Animated.View entering={FadeInDown.delay(200)} className="mb-8 mt-9 items-center">
            <Text className="mb-2 text-3xl font-bold text-black">{t('auth.changePassword.title')}</Text>
            <Text className="px-10 text-center text-base text-gray-500">{t('auth.changePassword.subtitle')}</Text>
          </Animated.View>
          <Animated.View entering={FadeInUp.delay(400)} className="px-6">
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
              render={({field: {onChange, onBlur, value}, fieldState: {error}}) => (
                <View className="mb-4">
                  <View className={`rounded-xl border bg-gray-100 ${error ? 'border-red-300 bg-red-100' : 'border-transparent'}`}>
                    <View className="flex-row items-center">
                      <TextInput
                        value={value}
                        onBlur={onBlur}
                        autoCorrect={false}
                        autoCapitalize="none"
                        onChangeText={onChange}
                        placeholder="New password"
                        placeholderTextColor="#999"
                        secureTextEntry={!showNewPassword}
                        className="m-0 h-14 flex-1 px-4 text-base leading-5 text-black"
                      />
                      <TouchableOpacity className="mr-2 p-2" onPress={() => setShowNewPassword(!showNewPassword)}>
                        <Ionicons name={showNewPassword ? 'eye-off' : 'eye'} size={24} color="#666" />
                      </TouchableOpacity>
                    </View>
                    {Boolean(value) && <PasswordStrengthBar password={value} visible />}
                  </View>
                  {error && <Text className="ml-2 mt-1 text-sm text-red-500">{error.message}</Text>}
                </View>
              )}
            />

            <Controller
              name="confirmPassword"
              control={control}
              rules={{
                required: 'Confirm your password',
                validate: (value, formValues) => (value === formValues.newPassword ? true : 'Passwords do not match'),
              }}
              render={({field: {onChange, onBlur, value}, fieldState: {error}}) => (
                <View className="mb-4">
                  <View className={`rounded-xl border bg-gray-100 ${error ? 'border-red-300 bg-red-100' : 'border-transparent'}`}>
                    <View className="flex-row items-center">
                      <TextInput
                        value={value}
                        onBlur={onBlur}
                        onChangeText={onChange}
                        placeholderTextColor="#999"
                        placeholder="Confirm password"
                        secureTextEntry={!showConfirmPassword}
                        className="m-0 h-14 flex-1 px-4 text-base leading-5 text-black"
                      />
                      <TouchableOpacity className="mr-2 p-2" onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                        <Ionicons name={showConfirmPassword ? 'eye-off' : 'eye'} size={24} color="#666" />
                      </TouchableOpacity>
                    </View>
                  </View>
                  {error && <Text className="ml-2 mt-1 text-sm text-red-500">{error.message}</Text>}
                </View>
              )}
            />

            <TouchableOpacity
              onPress={handleSubmit(onSubmit)}
              disabled={!formState.isValid || formState.isSubmitting}
              className="mt-4 h-14 items-center justify-center rounded-full bg-[#3E6065] shadow">
              {formState.isSubmitting ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text className="text-lg font-semibold text-white">{t('auth.changePassword.updatePassword')}</Text>
              )}
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
export default ChangePassword;
