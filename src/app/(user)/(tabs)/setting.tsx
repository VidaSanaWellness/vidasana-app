import type React from 'react';
import {useState, useEffect} from 'react';
import {supabase} from '@/utils';
import {useRouter} from 'expo-router';
import {Ionicons} from '@expo/vector-icons';
import {useTranslation} from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import {LanguagePicker} from '@/components/LanguagePicker';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import PhoneInput from 'react-native-international-phone-number';
import Animated, {FadeIn, FadeOut, SlideInDown, SlideOutDown} from 'react-native-reanimated';
import {ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View} from 'react-native';
import {useAppStore} from '@/store';

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

const Profile = () => {
  const router = useRouter();
  const {user: currentUser} = useAppStore((s) => s.session!);
  const [isEditing, setIsEditing] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<{fullName: string; email: string; phone: string; role: string}>({
    fullName: '',
    email: '',
    phone: '',
    role: '',
  });
  const [editedInfo, setEditedInfo] = useState({fullName: '', phone: ''});
  const [isSaving, setIsSaving] = useState(false);
  const [isFetchingProfile, setIsFetchingProfile] = useState(true);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isLanguagePickerVisible, setIsLanguagePickerVisible] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<any>(null);

  const {t, i18n} = useTranslation();

  const isLoadingProfile = isFetchingProfile;
  const refresh = async () => {};
  const insets = useSafeAreaInsets();
  const keyboardVerticalOffset = Platform.OS === 'ios' ? Math.max(insets.bottom, 0) + 12 : 0;
  const _keyboardSpacerHeight = Math.max(0, keyboardHeight > 0 ? keyboardHeight - keyboardVerticalOffset : 0);
  const isProvider = !!currentUser?.user_metadata?.role && currentUser.user_metadata.role === 'provider';
  const isBusy = isLoadingProfile || isFetchingProfile;
  const roleLabel = userInfo.role ? String(userInfo.role).toUpperCase() : isProvider ? 'PROVIDER' : 'MEMBER';

  useEffect(() => {
    if (!currentUser) {
      setUserInfo({
        fullName: '',
        email: '',
        phone: '',
        role: '',
      });
      setProfileImage(null);
      setIsFetchingProfile(false);
      return;
    }

    // Initialize with session metadata first
    setUserInfo((prev) => ({
      fullName: currentUser.user_metadata?.full_name || prev.fullName,
      email: currentUser.email || prev.email,
      phone: prev.phone,
      role: String(currentUser.user_metadata?.role || prev.role || ''),
    }));

    const fetchProfile = async () => {
      try {
        const {data, error} = await supabase.from('profile').select('name, phone, role, image').eq('id', currentUser.id).single();

        if (error) {
          console.error('Error fetching profile:', error.message);
          return;
        }

        if (data) {
          setUserInfo({
            fullName: data.name ?? currentUser.user_metadata?.full_name ?? '',
            email: currentUser.email ?? '',
            phone: data.phone ?? '',
            role: String(data.role ?? currentUser.user_metadata?.role ?? ''),
          });
          setProfileImage(data.image ? String(data.image) : null);
        }
      } catch (fetchError) {
        console.error('Error loading profile:', fetchError);
      } finally {
        setIsFetchingProfile(false);
      }
    };

    fetchProfile();
  }, [currentUser]);

  //   useEffect(() => {
  //     if (!isEditing) {
  //       setKeyboardHeight(0);
  //       return;
  //     }
  //
  //     const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
  //     const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
  //
  //     const handleKeyboardShow = (event: KeyboardEvent) => {
  //       setKeyboardHeight(event.endCoordinates?.height ?? 0);
  //     };
  //
  //     const handleKeyboardHide = () => {
  //       setKeyboardHeight(0);
  //     };
  //
  //     const showSubscription = Keyboard.addListener(showEvent, handleKeyboardShow);
  //     const hideSubscription = Keyboard.addListener(hideEvent, handleKeyboardHide);
  //
  //     return () => {
  //       showSubscription.remove();
  //       hideSubscription.remove();
  //     };
  //   }, [isEditing]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      Alert.alert('Error', 'Failed to log out. Please try again.');
    }
  };

  const handleImagePick = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setProfileImage(result.assets[0].uri as string);
      // TODO: Upload image to storage
    }
  };

  const handlePasswordChange = () => {
    router.push('/(settings)/change-password');
  };

  const handleEditPress = () => {
    if (isLoadingProfile || isFetchingProfile) return;
    setEditedInfo({phone: userInfo.phone, fullName: userInfo.fullName});
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    if (isSaving) return;
    setIsEditing(false);
    setEditedInfo({fullName: '', phone: ''});
  };

  const handleSaveProfile = async () => {
    if (!currentUser?.id) return Alert.alert('Error', "We couldn't verify your account. Please sign in again.");

    const trimmedName = editedInfo.fullName.trim();
    const trimmedPhone = editedInfo.phone.trim();

    if (!trimmedName) return Alert.alert('Name required', 'Please enter your full name before saving.');

    setIsSaving(true);
    try {
      const fullPhoneNumber = selectedCountry ? `${selectedCountry?.callingCode} ${trimmedPhone}` : trimmedPhone;
      const countryCode = selectedCountry?.cca2 || '';

      const {data, error} = await supabase
        .from('profile')
        .update({name: trimmedName, phone: fullPhoneNumber || null, country: countryCode})
        .eq('id', currentUser.id)
        .select('name, phone, role')
        .single();

      if (error) throw error;

      setUserInfo({
        email: userInfo.email,
        fullName: data?.name ?? trimmedName,
        phone: data?.phone ?? fullPhoneNumber,
        role: String(data?.role ?? userInfo.role ?? ''),
      });
      setIsEditing(false);
      setEditedInfo({fullName: '', phone: ''});
      await refresh();
      Alert.alert('Profile updated', 'Your changes have been saved.');
    } catch (saveError) {
      console.error('Error updating profile:', saveError);
      Alert.alert('Error', "We couldn't save your profile changes right now. Please try again shortly.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Animated.View entering={FadeIn} exiting={FadeOut} className="flex-1 bg-white">
      <ScrollView className="flex-1" contentInsetAdjustmentBehavior="never" contentContainerStyle={{paddingBottom: insets.bottom + 32}}>
        {/* Profile Header */}
        <View className="items-center rounded-b-3xl bg-gray-50 pb-8" style={{paddingTop: insets.top + 30}}>
          <TouchableOpacity onPress={handleImagePick}>
            <View className="relative mb-4">
              {profileImage ? (
                <Image source={{uri: profileImage}} className="h-[120px] w-[120px] rounded-full" />
              ) : (
                <View className="h-[120px] w-[120px] items-center justify-center rounded-full bg-gray-200">
                  <Ionicons name="person" size={40} color="#666" />
                </View>
              )}
              <View className="absolute bottom-0 right-0 h-[30px] w-[30px] items-center justify-center rounded-full border-2 border-white bg-primary">
                <Ionicons name="camera" size={14} color="#FFF" />
              </View>
            </View>
          </TouchableOpacity>

          <View className="flex-row items-center space-x-2">
            <Text className="font-nunito-bold text-2xl text-black">{currentUser?.user_metadata?.full_name || 'User'}</Text>

            <View className={`rounded-full px-3 py-1 ${currentUser?.user_metadata?.role === 'provider' ? 'bg-primary' : 'bg-gray-300'}`}>
              <Text className="text-xs font-bold uppercase text-white">{currentUser?.user_metadata?.role || 'Member'}</Text>
            </View>
          </View>

          <Text className="mt-1 font-nunito text-base text-gray-500">{currentUser?.email}</Text>
        </View>

        {/* Loading State */}
        {isBusy && (
          <View className="flex-row items-center justify-center space-x-2 px-5 py-3">
            <ActivityIndicator size="small" color="#00594f" />
            <Text className="font-nunito text-sm text-gray-700">{isLoadingProfile ? 'Loading your profile...' : 'Refreshing profile...'}</Text>
          </View>
        )}

        {/* Account Settings */}
        <View className="mt-6 px-5">
          <Text className="mb-4 font-nunito-bold text-lg text-black">{t('settings.accountSettings')}</Text>

          <TouchableOpacity
            className={`mb-2 flex-row items-center rounded-xl bg-gray-50 px-4 py-3 ${isBusy || isEditing ? 'opacity-60' : ''}`}
            disabled={isBusy || isEditing}
            onPress={handleEditPress}>
            <Ionicons name="person-outline" size={24} color="#00594f" />
            <Text className="ml-3 flex-1 font-nunito-bold text-base text-primary">{t('profile.editTitle')}</Text>
            <Ionicons name="chevron-forward" size={24} color="#00594f" />
          </TouchableOpacity>

          <TouchableOpacity className="mb-2 flex-row items-center rounded-xl bg-gray-50 px-4 py-3" onPress={handlePasswordChange}>
            <Ionicons name="key-outline" size={24} color="#00594f" />
            <Text className="ml-3 flex-1 font-nunito-bold text-base text-primary">{t('settings.changePassword')}</Text>
            <Ionicons name="chevron-forward" size={24} color="#00594f" />
          </TouchableOpacity>
        </View>

        {/* Preferences */}
        <View className="mt-6 px-5">
          <Text className="mb-4 font-nunito-bold text-lg text-black">{t('settings.preferences')}</Text>

          <TouchableOpacity className="mb-2 flex-row items-center rounded-xl bg-gray-50 px-4 py-3" onPress={() => setIsLanguagePickerVisible(true)}>
            <Ionicons name="globe-outline" size={24} color="#00594f" />
            <Text className="ml-3 flex-1 font-nunito-bold text-base text-primary">
              {t('settings.language')} ({t(`languages.${i18n.language}`)})
            </Text>
            <Ionicons name="chevron-forward" size={24} color="#00594f" />
          </TouchableOpacity>
        </View>

        <LanguagePicker visible={isLanguagePickerVisible} onClose={() => setIsLanguagePickerVisible(false)} />

        {/* Support */}
        <View className="mt-6 px-5">
          <Text className="mb-4 font-nunito-bold text-lg text-black">{t('settings.support')}</Text>

          <TouchableOpacity
            className="mb-2 flex-row items-center rounded-xl bg-gray-50 px-4 py-3"
            onPress={() => Alert.alert('Coming Soon', 'This feature will be available soon!')}>
            <Ionicons name="help-circle-outline" size={24} color="#00594f" />
            <Text className="ml-3 flex-1 font-nunito-bold text-base text-primary">{t('settings.helpCenter')}</Text>
            <Ionicons name="chevron-forward" size={24} color="#00594f" />
          </TouchableOpacity>

          <TouchableOpacity
            className="mb-2 flex-row items-center rounded-xl bg-gray-50 px-4 py-3"
            onPress={() => router.push('/TermsAndConditions' as any)}>
            <Ionicons name="document-text-outline" size={24} color="#00594f" />
            <Text className="ml-3 flex-1 font-nunito-bold text-base text-primary">{t('settings.termsAndConditions')}</Text>
            <Ionicons name="chevron-forward" size={24} color="#00594f" />
          </TouchableOpacity>

          <TouchableOpacity
            className="mb-2 flex-row items-center rounded-xl bg-gray-50 px-4 py-3"
            onPress={() => router.push('/PrivacyPolicy' as any)}>
            <Ionicons name="shield-checkmark-outline" size={24} color="#00594f" />
            <Text className="ml-3 flex-1 font-nunito-bold text-base text-primary">{t('settings.privacyPolicy')}</Text>
            <Ionicons name="chevron-forward" size={24} color="#00594f" />
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <AnimatedTouchableOpacity
          entering={FadeIn}
          exiting={FadeOut}
          onPress={handleLogout}
          className="mx-5 mb-8 mt-10 flex-row items-center justify-center rounded-xl bg-red-50 py-4">
          <Ionicons name="log-out-outline" size={24} color="#E03C31" />
          <Text className="ml-2 font-nunito-bold text-base text-[#E03C31]">{t('settings.logOut')}</Text>
        </AnimatedTouchableOpacity>
      </ScrollView>

      {/* EDIT MODE SHEET */}
      {isEditing && (
        <Animated.View entering={FadeIn} exiting={FadeOut} pointerEvents="box-none" className="absolute inset-0 bg-[rgba(0,0,0,0.25)]">
          <TouchableOpacity className="absolute inset-0" activeOpacity={1} accessible={false} onPress={handleCancelEdit} />

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? Math.max(insets.bottom, 0) - 112 : 0}
            className="w-full flex-1 items-center justify-end"
            style={{paddingBottom: insets.bottom || 0}}>
            <Animated.View
              entering={SlideInDown}
              exiting={SlideOutDown}
              className="max-h-[90%] w-full rounded-t-3xl bg-white px-6 pb-12 pt-6 shadow-lg">
              <KeyboardAvoidingView className="w-full flex-grow-0">
                <View className="w-full">
                  <Text className="mb-2 text-xl font-bold text-[#1F1F1F]">Edit Profile</Text>

                  <Text className="mb-5 text-sm text-[#6B6B6B]">Update your personal details so providers and companions can stay in touch.</Text>

                  {/* Full Name */}
                  <View className="mb-5">
                    <Text className="mb-2 font-nunito text-sm text-gray-700">Full Name</Text>
                    <TextInput
                      editable={!isSaving}
                      returnKeyType="done"
                      value={editedInfo.fullName}
                      placeholder="Your full name"
                      onChangeText={(text) => setEditedInfo((p) => ({...p, fullName: text}))}
                      className="rounded-xl border border-gray-200 bg-white px-4 py-3 font-nunito text-base text-gray-900"
                    />
                  </View>

                  {/* Phone */}
                  <View className="mb-5">
                    <Text className="mb-2 font-nunito text-sm text-gray-700">Phone Number</Text>
                    <View className="w-full">
                      <PhoneInput
                        value={editedInfo.phone}
                        onChangePhoneNumber={(text) => setEditedInfo((p) => ({...p, phone: text}))}
                        selectedCountry={selectedCountry}
                        onChangeSelectedCountry={setSelectedCountry}
                        defaultCountry="US"
                        language="eng"
                        placeholder="Add a phone number"
                        phoneInputStyles={{
                          container: {
                            backgroundColor: '#FFF',
                            borderColor: '#E5E7EB',
                            borderWidth: 1,
                            borderRadius: 12,
                            height: 56,
                          },
                          input: {
                            color: '#000',
                            fontSize: 16,
                            fontFamily: 'Nunito_400Regular',
                          },
                          flagContainer: {
                            backgroundColor: 'transparent',
                            borderTopLeftRadius: 12,
                            borderBottomLeftRadius: 12,
                          },
                          callingCode: {
                            fontSize: 16,
                            fontFamily: 'Nunito_400Regular',
                            color: '#374151',
                          },
                          divider: {
                            backgroundColor: '#E5E7EB',
                          },
                          caret: {
                            color: '#374151',
                            fontSize: 16,
                          },
                        }}
                        modalStyles={{
                          container: {
                            backgroundColor: '#FFF',
                          },
                          backdrop: {
                            backgroundColor: 'rgba(0, 0, 0, 0.5)',
                          },
                          list: {
                            backgroundColor: '#FFF',
                          },
                          searchInput: {
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: '#E5E7EB',
                            color: '#000',
                            backgroundColor: '#F9FAFB',
                            height: 48,
                            paddingHorizontal: 16,
                            fontSize: 16,
                            fontFamily: 'Nunito_400Regular',
                          },
                          countryItem: {
                            borderWidth: 1,
                            borderColor: '#F3F4F6',
                            backgroundColor: '#FFF',
                            marginVertical: 4,
                            paddingVertical: 12,
                            borderRadius: 12,
                          },
                          flag: {
                            fontSize: 24,
                          },
                          callingCode: {
                            color: '#374151',
                          },
                          countryName: {
                            color: '#000',
                            fontFamily: 'Nunito_400Regular',
                          },
                        }}
                      />
                    </View>
                  </View>

                  {/* Email */}
                  <View className="mb-5">
                    <Text className="mb-2 text-sm text-[#4A4A4A]">Email</Text>
                    <TextInput
                      editable={false}
                      value={userInfo.email}
                      selectTextOnFocus={false}
                      className="rounded-xl border border-[#E0E0E0] bg-[#F0F0F0] px-4 py-3 text-base text-[#9E9E9E]"
                    />
                  </View>

                  {/* Buttons */}
                  <View className="flex-row justify-end space-x-3">
                    <TouchableOpacity
                      disabled={isSaving}
                      onPress={handleCancelEdit}
                      className={`rounded-xl bg-gray-100 px-5 py-3 ${isSaving ? 'opacity-60' : ''}`}>
                      <Text className="font-nunito-bold text-base text-gray-700">Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={handleSaveProfile}
                      disabled={isSaving}
                      className={`rounded-xl bg-primary px-5 py-3 ${isSaving ? 'opacity-60' : ''}`}>
                      {isSaving ? (
                        <ActivityIndicator size="small" color="#FFF" />
                      ) : (
                        <Text className="font-nunito-bold text-base text-white">Save Changes</Text>
                      )}
                    </TouchableOpacity>
                  </View>

                  <View className="h-10" />
                </View>
              </KeyboardAvoidingView>
            </Animated.View>
          </KeyboardAvoidingView>
        </Animated.View>
      )}
    </Animated.View>
  );
};

export default Profile;
