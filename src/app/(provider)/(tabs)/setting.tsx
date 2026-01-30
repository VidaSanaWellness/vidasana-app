import type React from 'react';
import {useState, useEffect} from 'react';
import {supabase} from '@/utils';
import {useRouter} from 'expo-router';
import {Ionicons} from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Animated, {FadeIn, FadeOut} from 'react-native-reanimated';
import {ActivityIndicator, Alert, Image, Platform, ScrollView, TouchableOpacity, View} from 'react-native';
import {H2, H3, Body, Caption, LanguagePicker, EditProfileModal} from '@/components';
import {useTranslation} from 'react-i18next';
import {useAppStore} from '@/store';
import Toast from 'react-native-toast-message';

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

const Profile = () => {
  const router = useRouter();
  const session = useAppStore((state) => state.session);
  const currentUser = session?.user;

  const [isEditing, setIsEditing] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<{fullName: string; email: string; phone: string; role: string}>({
    fullName: '',
    email: '',
    phone: '',
    role: '',
  });
  const [isFetchingProfile, setIsFetchingProfile] = useState(true);
  const [isLanguagePickerVisible, setIsLanguagePickerVisible] = useState(false);
  const {t, i18n} = useTranslation();

  const isLoadingProfile = false; // We can improve this with a query later if needed
  const refresh = async () => {}; // Placeholder for now
  const insets = useSafeAreaInsets();
  const isBusy = isLoadingProfile || isFetchingProfile;

  useEffect(() => {
    if (!currentUser) {
      setUserInfo({fullName: '', email: '', phone: '', role: ''});
      setProfileImage(null);
      setIsFetchingProfile(false);
      return;
    }

    // Set initial data from session
    setUserInfo((prev) => ({
      fullName: currentUser.user_metadata?.full_name || prev.fullName,
      email: currentUser.email || prev.email,
      phone: prev.phone,
      role: String(currentUser.user_metadata?.role || prev.role || ''),
    }));

    const fetchProfile = async () => {
      setIsFetchingProfile(true);
      try {
        const {data, error} = await supabase.from('profile').select('name, phone, role, image').eq('id', currentUser.id).single();

        if (error) {
          console.error('Error fetching profile:', error.message);
          return;
        }

        setUserInfo({
          fullName: data?.name ?? currentUser.user_metadata?.full_name ?? '',
          email: currentUser.email ?? '',
          phone: data?.phone ?? '',
          role: String(data?.role ?? currentUser.user_metadata?.role ?? ''),
        });
        if (data?.image) {
          const {data: imageData} = supabase.storage.from('avatars').getPublicUrl(data.image);
          setProfileImage(imageData.publicUrl);
        }
      } catch (fetchError) {
        console.error('Error loading profile:', fetchError);
      } finally {
        setIsFetchingProfile(false);
      }
    };

    fetchProfile();
  }, [currentUser]);

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

  const handlePasswordChange = () => router.push('/(settings)/change-password');

  const handleEditPress = () => {
    if (isLoadingProfile || isFetchingProfile) return;
    setIsEditing(true);
  };

  // const handleSaveProfile = async () => {
  //   if (!currentUser?.id) return Alert.alert('Error', "We couldn't verify your account. Please sign in again.");

  //   const trimmedName = editedInfo.fullName.trim();
  //   const trimmedPhone = editedInfo.phone.trim();

  //   if (!trimmedName) return Alert.alert('Name required', 'Please enter your full name before saving.');

  //   setIsSaving(true);
  //   try {
  //     const fullPhoneNumber = selectedCountry ? `${selectedCountry?.callingCode} ${trimmedPhone}` : trimmedPhone;
  //     const countryCode = selectedCountry?.cca2 || '';

  //     const {data, error} = await supabase
  //       .from('profile')
  //       .update({name: trimmedName, phone: fullPhoneNumber || null, country: countryCode})
  //       .eq('id', currentUser.id)
  //       .select('name, phone, role')
  //       .single();

  //     if (error) throw error;

  //     setUserInfo({
  //       email: userInfo.email, // Email is not in profile table, keep existing
  //       fullName: data?.name ?? trimmedName,
  //       phone: data?.phone ?? fullPhoneNumber,
  //       role: String(data?.role ?? userInfo.role ?? ''),
  //     });
  //     setIsEditing(false);
  //     setEditedInfo({fullName: '', phone: ''});
  //     await refresh();
  //     Alert.alert('Profile updated', 'Your changes have been saved.');
  //   } catch (saveError) {
  //     console.error('Error updating profile:', saveError);
  //     Alert.alert('Error', "We couldn't save your profile changes right now. Please try again shortly.");
  //   } finally {
  //     setIsSaving(false);
  //   }
  // };

  const handleUpdateSuccess = (updatedData: {fullName: string; phone: string}) => {
    setUserInfo((prev) => ({...prev, phone: updatedData.phone, fullName: updatedData.fullName}));
    Toast.show({type: 'success', text1: 'Profile updated successfully'});
    refresh();
  };

  if (isFetchingProfile && !userInfo.fullName) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#00594f" />
        <Body className="mt-4 text-gray-500">Loading profile...</Body>
      </View>
    );
  }

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
              <View className="absolute bottom-0 right-0 h-[30px] w-[30px] items-center justify-center rounded-full bg-primary">
                <Ionicons name="camera" size={14} color="#FFF" />
              </View>
            </View>
          </TouchableOpacity>

          <View className={`rounded-full bg-primary px-3 py-1`}>
            <Caption className="text-xs font-bold uppercase text-white">{currentUser?.user_metadata?.role || 'Member'}</Caption>
          </View>

          <H2 className="text-center font-nunito-bold text-2xl text-black">{currentUser?.user_metadata?.full_name || 'User'}</H2>

          <Body className="mt-1 text-base text-[#666]">{userInfo.email}</Body>
        </View>

        {/* Loading State */}
        {isBusy && (
          <View className="flex-row items-center justify-center space-x-2 px-5 py-3">
            <ActivityIndicator size="small" color="#00594f" />
            <Body className="text-sm text-[#4A4A4A]">{isLoadingProfile ? 'Loading your profile...' : 'Refreshing profile...'}</Body>
          </View>
        )}

        {/* Account Settings */}
        <View className="mt-6 px-5">
          <H3 className="mb-4 text-black">{t('settings.accountSettings')}</H3>

          <TouchableOpacity className="mb-2 flex-row items-center rounded-xl bg-gray-50 px-4 py-3" onPress={handleEditPress}>
            <Ionicons name="person-outline" size={24} color="#00594f" />
            <Body className="ml-3 flex-1 font-nunito-bold text-base text-primary">{t('profile.editTitle')}</Body>
            <Ionicons name="chevron-forward" size={24} color="#00594f" />
          </TouchableOpacity>

          <TouchableOpacity className="mb-2 flex-row items-center rounded-xl bg-gray-50 px-4 py-3" onPress={handlePasswordChange}>
            <Ionicons name="key-outline" size={24} color="#00594f" />
            <Body className="ml-3 flex-1 font-nunito-bold text-base text-primary">{t('settings.changePassword')}</Body>
            <Ionicons name="chevron-forward" size={24} color="#00594f" />
          </TouchableOpacity>
        </View>

        {/* Preferences */}
        <View className="mt-6 px-5">
          <H3 className="mb-4 text-black">{t('settings.preferences')}</H3>

          <TouchableOpacity className="mb-2 flex-row items-center rounded-xl bg-gray-50 px-4 py-3" onPress={() => setIsLanguagePickerVisible(true)}>
            <Ionicons name="globe-outline" size={24} color="#00594f" />
            <Body className="ml-3 flex-1 font-nunito-bold text-base text-primary">
              {t('settings.language')} ({t(`languages.${i18n.language}`)})
            </Body>
            <Ionicons name="chevron-forward" size={24} color="#00594f" />
          </TouchableOpacity>
        </View>

        <LanguagePicker visible={isLanguagePickerVisible} onClose={() => setIsLanguagePickerVisible(false)} />

        {/* Support */}
        <View className="mt-6 px-5">
          <H3 className="mb-4 text-black">{t('settings.support')}</H3>

          <TouchableOpacity
            className="mb-2 flex-row items-center rounded-xl bg-gray-50 px-4 py-3"
            onPress={() => Alert.alert('Coming Soon', 'This feature will be available soon!')}>
            <Ionicons name="help-circle-outline" size={24} color="#00594f" />
            <Body className="ml-3 flex-1 font-nunito-bold text-base text-primary">{t('settings.helpCenter')}</Body>
            <Ionicons name="chevron-forward" size={24} color="#00594f" />
          </TouchableOpacity>

          <TouchableOpacity className="mb-2 flex-row items-center rounded-xl bg-gray-50 px-4 py-3" onPress={() => router.push('/TermsAndConditions')}>
            <Ionicons name="document-text-outline" size={24} color="#00594f" />
            <Body className="ml-3 flex-1 font-nunito-bold text-base text-primary">{t('settings.termsAndConditions')}</Body>
            <Ionicons name="chevron-forward" size={24} color="#00594f" />
          </TouchableOpacity>

          <TouchableOpacity className="mb-2 flex-row items-center rounded-xl bg-gray-50 px-4 py-3" onPress={() => router.push('/PrivacyPolicy')}>
            <Ionicons name="shield-checkmark-outline" size={24} color="#00594f" />
            <Body className="ml-3 flex-1 font-nunito-bold text-base text-primary">{t('settings.privacyPolicy')}</Body>
            <Ionicons name="chevron-forward" size={24} color="#00594f" />
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <AnimatedTouchableOpacity
          entering={FadeIn}
          exiting={FadeOut}
          onPress={handleLogout}
          className="mx-5 mb-8 mt-10 flex-row items-center justify-center rounded-xl bg-red-50 py-4">
          <Ionicons name="log-out-outline" size={24} color="#dc2626" />
          <Body className="ml-2 font-nunito-bold text-base text-red-600">{t('settings.logOut')}</Body>
        </AnimatedTouchableOpacity>
      </ScrollView>

      {/* EDIT MODE SHEET */}
      <EditProfileModal visible={isEditing} onClose={() => setIsEditing(false)} onSuccess={handleUpdateSuccess} initialData={userInfo} />
    </Animated.View>
  );
};

export default Profile;
