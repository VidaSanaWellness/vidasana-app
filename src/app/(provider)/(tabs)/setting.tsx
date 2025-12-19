import type React from 'react';
import {useState} from 'react';
import {supabase} from '@/utils';
import {Link, useRouter} from 'expo-router';
import {Ionicons} from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Animated, {FadeIn, FadeOut} from 'react-native-reanimated';
import {ActivityIndicator, Alert, Image, Platform, ScrollView, Text, TouchableOpacity, View} from 'react-native';
import {LanguagePicker} from '@/components/LanguagePicker';
import {useTranslation} from 'react-i18next';

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

const useCurrentUser = () => ({});

const Profile = () => {
  const router = useRouter();
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
  const [isFetchingProfile, setIsFetchingProfile] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isLanguagePickerVisible, setIsLanguagePickerVisible] = useState(false);
  const {t, i18n} = useTranslation();

  const {user: currentUser, loading: isLoadingProfile, refresh} = useCurrentUser();
  const insets = useSafeAreaInsets();
  const keyboardVerticalOffset = Platform.OS === 'ios' ? Math.max(insets.bottom, 0) + 12 : 0;
  const _keyboardSpacerHeight = Math.max(0, keyboardHeight > 0 ? keyboardHeight - keyboardVerticalOffset : 0);
  const isProvider = !!currentUser?.isProvider;
  const isBusy = isLoadingProfile || isFetchingProfile;
  const roleLabel = userInfo.role ? String(userInfo.role).toUpperCase() : isProvider ? 'PROVIDER' : 'MEMBER';

  //   useEffect(() => {
  //     if (!currentUser) {
  //       setUserInfo({
  //         fullName: '',
  //         email: '',
  //         phone: '',
  //         role: '',
  //       });
  //       setProfileImage(null);
  //       return;
  //     }

  //     setUserInfo((prev) => ({
  //       fullName: currentUser.fullName || prev.fullName,
  //       email: currentUser.email || prev.email,
  //       phone: prev.phone,
  //       role: String(currentUser.role || prev.role || ''),
  //     }));

  //     const fetchProfile = async () => {
  //       setIsFetchingProfile(true);
  //       try {
  //         const {data, error} = await supabase
  //           .from('users')
  //           .select('full_name, email, phone_number, role, profile_image_url')
  //           .eq('id', currentUser.id)
  //           .single();

  //         if (error) {
  //           console.error('Error fetching profile:', error.message);
  //           return;
  //         }

  //         setUserInfo({
  //           fullName: data?.full_name ?? currentUser.fullName ?? '',
  //           email: data?.email ?? currentUser.email ?? '',
  //           phone: data?.phone_number ?? '',
  //           role: String(data?.role ?? currentUser.role ?? ''),
  //         });
  //         setProfileImage(data?.profile_image_url ? String(data.profile_image_url) : null);
  //       } catch (fetchError) {
  //         console.error('Error loading profile:', fetchError);
  //       } finally {
  //         setIsFetchingProfile(false);
  //       }
  //     };

  //     fetchProfile();
  //   }, [currentUser]);

  //   useEffect(() => {
  //     if (!isEditing) {
  //       setKeyboardHeight(0);
  //       return;
  //     }

  //     const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
  //     const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

  //     const handleKeyboardShow = (event: KeyboardEvent) => {
  //       setKeyboardHeight(event.endCoordinates?.height ?? 0);
  //     };

  //     const handleKeyboardHide = () => {
  //       setKeyboardHeight(0);
  //     };

  //     const showSubscription = Keyboard.addListener(showEvent, handleKeyboardShow);
  //     const hideSubscription = Keyboard.addListener(hideEvent, handleKeyboardHide);

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

  const resetPassword = async () => {
    try {
      const {error} = await supabase.auth.resetPasswordForEmail(userInfo.email, {
        redirectTo: 'yourapp://reset-password',
      });
      if (error) throw error;
      Alert.alert('Success', 'Check your email for password reset instructions.');
    } catch (error) {
      console.error('Error sending password reset email:', error);
      Alert.alert('Error', 'Failed to send reset email. Please try again.');
    }
  };

  const handlePasswordChange = () => {
    Alert.alert('Change Password', "We'll send you an email with instructions to change your password.", [
      {text: 'Cancel', style: 'cancel'},
      {text: 'Send Email', onPress: resetPassword},
    ]);
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
      const {data, error} = await supabase
        .from('users')
        .update({full_name: trimmedName, phone_number: trimmedPhone || null})
        .eq('id', currentUser.id)
        .select('full_name, email, phone_number, role')
        .single();

      if (error) throw error;

      setUserInfo({
        email: data?.email ?? userInfo.email,
        fullName: data?.full_name ?? trimmedName,
        phone: data?.phone_number ?? trimmedPhone,
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
        <View className="items-center rounded-b-3xl bg-[#F5F5F5] pb-8" style={{paddingTop: insets.top + 30}}>
          <TouchableOpacity onPress={handleImagePick}>
            <View className="relative mb-4">
              {profileImage ? (
                <Image source={{uri: profileImage}} className="h-[120px] w-[120px] rounded-full" />
              ) : (
                <View className="h-[120px] w-[120px] items-center justify-center rounded-full bg-[#E5E5E5]">
                  <Ionicons name="person" size={40} color="#666" />
                </View>
              )}
              <View className="absolute bottom-0 right-0 h-[30px] w-[30px] items-center justify-center rounded-full bg-[#3E6065]">
                <Ionicons name="camera" size={14} color="#FFF" />
              </View>
            </View>
          </TouchableOpacity>

          <View className="flex-row items-center space-x-2">
            <Text className="text-2xl font-semibold text-black">{userInfo.fullName || 'Your Name'}</Text>

            <View className={`rounded-full px-3 py-1 ${isProvider ? 'bg-[#3E6065]' : 'bg-gray-300'}`}>
              <Text className="text-xs font-bold text-white">{roleLabel}</Text>
            </View>
          </View>

          <Text className="mt-1 text-base text-[#666]">{userInfo.email}</Text>
        </View>

        {/* Loading State */}
        {isBusy && (
          <View className="flex-row items-center justify-center space-x-2 px-5 py-3">
            <ActivityIndicator size="small" color="#3E6065" />
            <Text className="text-sm text-[#4A4A4A]">{isLoadingProfile ? 'Loading your profile...' : 'Refreshing profile...'}</Text>
          </View>
        )}

        {/* Account Settings */}
        <View className="mt-6 px-5">
          <Text className="mb-4 text-lg font-semibold text-black">{t('settings.accountSettings')}</Text>

          <Link asChild href="/edit-profile">
            <TouchableOpacity className="mb-2 flex-row items-center rounded-xl bg-[#F5F5F5] px-4 py-3">
              <Ionicons name="person-outline" size={24} color="#3E6065" />
              <Text className="ml-3 flex-1 text-base text-[#3E6065]">{t('profile.editTitle')}</Text>
              <Ionicons name="chevron-forward" size={24} color="#3E6065" />
            </TouchableOpacity>
          </Link>

          <TouchableOpacity className="mb-2 flex-row items-center rounded-xl bg-[#F5F5F5] px-4 py-3" onPress={handlePasswordChange}>
            <Ionicons name="key-outline" size={24} color="#3E6065" />
            <Text className="ml-3 flex-1 text-base text-[#3E6065]">{t('settings.changePassword')}</Text>
            <Ionicons name="chevron-forward" size={24} color="#3E6065" />
          </TouchableOpacity>
        </View>

        {/* Preferences */}
        <View className="mt-6 px-5">
          <Text className="mb-4 text-lg font-semibold text-black">{t('settings.preferences')}</Text>

          {/* <TouchableOpacity
            className="mb-2 flex-row items-center rounded-xl bg-[#F5F5F5] px-4 py-3"
            onPress={() => Alert.alert('Coming Soon', 'This feature will be available soon!')}>
            <Ionicons name="notifications-outline" size={24} color="#3E6065" />
            <Text className="ml-3 flex-1 text-base text-[#3E6065]">{t('settings.notifications')}</Text>
            <Ionicons name="chevron-forward" size={24} color="#3E6065" />
          </TouchableOpacity> */}

          {/* <TouchableOpacity
            className="mb-2 flex-row items-center rounded-xl bg-[#F5F5F5] px-4 py-3"
            onPress={() => Alert.alert('Coming Soon', 'This feature will be available soon!')}>
            <Ionicons name="moon-outline" size={24} color="#3E6065" />
            <Text className="ml-3 flex-1 text-base text-[#3E6065]">{t('settings.darkMode')}</Text>
            <Ionicons name="chevron-forward" size={24} color="#3E6065" />
          </TouchableOpacity> */}

          <TouchableOpacity className="mb-2 flex-row items-center rounded-xl bg-[#F5F5F5] px-4 py-3" onPress={() => setIsLanguagePickerVisible(true)}>
            <Ionicons name="globe-outline" size={24} color="#3E6065" />
            <Text className="ml-3 flex-1 text-base text-[#3E6065]">
              {t('settings.language')} ({t(`languages.${i18n.language}`)})
            </Text>
            <Ionicons name="chevron-forward" size={24} color="#3E6065" />
          </TouchableOpacity>
        </View>

        <LanguagePicker visible={isLanguagePickerVisible} onClose={() => setIsLanguagePickerVisible(false)} />

        {/* Support */}
        <View className="mt-6 px-5">
          <Text className="mb-4 text-lg font-semibold text-black">{t('settings.support')}</Text>

          <TouchableOpacity
            className="mb-2 flex-row items-center rounded-xl bg-[#F5F5F5] px-4 py-3"
            onPress={() => Alert.alert('Coming Soon', 'This feature will be available soon!')}>
            <Ionicons name="help-circle-outline" size={24} color="#3E6065" />
            <Text className="ml-3 flex-1 text-base text-[#3E6065]">{t('settings.helpCenter')}</Text>
            <Ionicons name="chevron-forward" size={24} color="#3E6065" />
          </TouchableOpacity>

          <TouchableOpacity
            className="mb-2 flex-row items-center rounded-xl bg-[#F5F5F5] px-4 py-3"
            onPress={() => router.push('/TermsAndConditions')}>
            <Ionicons name="document-text-outline" size={24} color="#3E6065" />
            <Text className="ml-3 flex-1 text-base text-[#3E6065]">{t('settings.termsAndConditions')}</Text>
            <Ionicons name="chevron-forward" size={24} color="#3E6065" />
          </TouchableOpacity>

          <TouchableOpacity className="mb-2 flex-row items-center rounded-xl bg-[#F5F5F5] px-4 py-3" onPress={() => router.push('/PrivacyPolicy')}>
            <Ionicons name="shield-checkmark-outline" size={24} color="#3E6065" />
            <Text className="ml-3 flex-1 text-base text-[#3E6065]">{t('settings.privacyPolicy')}</Text>
            <Ionicons name="chevron-forward" size={24} color="#3E6065" />
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <AnimatedTouchableOpacity
          entering={FadeIn}
          exiting={FadeOut}
          onPress={handleLogout}
          className="mx-5 mb-8 mt-10 flex-row items-center justify-center rounded-xl bg-[#FFE8E8] py-4">
          <Ionicons name="log-out-outline" size={24} color="#E03C31" />
          <Text className="ml-2 text-base font-semibold text-[#E03C31]">{t('settings.logOut')}</Text>
        </AnimatedTouchableOpacity>
      </ScrollView>
    </Animated.View>
  );
};

export default Profile;
