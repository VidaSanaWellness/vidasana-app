import {useAppStore} from '@/store';
import {supabase} from '@/utils';
import {useRouter} from 'expo-router';
import {Ionicons} from '@expo/vector-icons';
import {useTranslation} from 'react-i18next';
import {Controller, useForm} from 'react-hook-form';
import {SafeAreaView} from 'react-native-safe-area-context';
import Animated, {FadeIn, FadeOut} from 'react-native-reanimated';
import {Alert, KeyboardAvoidingView, Platform, TextInput, TouchableOpacity, View} from 'react-native';
import {Button, H2, PhoneInputField, Body, Caption} from '@/components';
import {useState} from 'react';

const Page = () => {
  const {back} = useRouter();
  const {t} = useTranslation();
  const {user} = useAppStore((s) => s.session!);
  const [selectedCountry, setSelectedCountry] = useState<any>(null);

  const {control, formState, handleSubmit} = useForm({defaultValues: {fullName: user.user_metadata?.full_name || '', phone: user.phone || ''}});

  const submit = async (data: {fullName: string; phone: string}) => {
    try {
      const fullPhoneNumber = selectedCountry ? `${selectedCountry?.callingCode} ${data.phone}` : data.phone;
      const countryCode = selectedCountry?.cca2 || '';

      const {error} = await supabase.from('profile').update({name: data.fullName, phone: fullPhoneNumber, country: countryCode}).eq('id', user.id);
      if (error) throw error;

      // Refresh session or handle success
      Alert.alert(t('common.success'), t('profile.updateSuccess'));
      back();
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-row items-center justify-between p-5">
        <TouchableOpacity onPress={() => back()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <H2 className="text-[#1F1F1F]">{t('profile.editTitle')}</H2>
        <View className="w-6" />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <Animated.View entering={FadeIn} exiting={FadeOut} className="flex-1 px-5">
          {/* Full Name */}
          <Controller
            name="fullName"
            control={control}
            rules={{
              required: {value: true, message: t('validation.fullNameRequired')},
              minLength: {value: 3, message: t('profile.nameMinLength')},
              pattern: {value: /^[A-Za-z\s]+$/, message: t('profile.nameInvalid')},
            }}
            render={({field, fieldState}) => (
              <View className="mb-4">
                <View
                  className={`rounded-lg border bg-gray-50 ${fieldState.error ? 'border-red-300 bg-red-50' : 'border-gray-200 focus:border-primary'}`}>
                  <TextInput
                    {...field}
                    autoCapitalize="words"
                    placeholder={t('auth.register.fullNamePlaceholder')}
                    placeholderTextColor="#999"
                    onChangeText={field.onChange}
                    style={{fontFamily: 'Nunito_400Regular'}}
                    className="m-0 h-14 px-4 text-base leading-5 text-black"
                  />
                </View>
                {fieldState.error && <Caption className="ml-2 mt-1 text-sm text-red-500">{fieldState.error.message}</Caption>}
              </View>
            )}
          />

          <Controller
            name="phone"
            control={control}
            rules={{
              required: t('validation.phoneRequired'),
            }}
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

          <Body className="mb-5 px-2 text-sm text-[#6B6B6B]">{t('profile.updateDetails')}</Body>

          <Button onPress={handleSubmit(submit)} loading={formState.isSubmitting} label={t('profile.save')} className="mt-auto" fullWidth />
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default Page;
