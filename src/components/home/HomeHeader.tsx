import React from 'react';
import {View, Text, Image, TouchableOpacity} from 'react-native';
import {Ionicons, Feather} from '@expo/vector-icons';
import {useRouter} from 'expo-router';
import {useAppStore} from '@/store';
import {useTranslation} from 'react-i18next';

export const HomeHeader = () => {
  const router = useRouter();
  const {t} = useTranslation();
  const {user} = useAppStore((s) => s.session!);
  const profileImage = user?.user_metadata?.image;

  return (
    <View className="flex-row items-center justify-between bg-white px-4 py-4">
      <View className="flex-row items-center">
        {profileImage ? (
          <Image source={{uri: profileImage}} className="h-12 w-12 rounded-full" />
        ) : (
          <View className="h-12 w-12 items-center justify-center rounded-full bg-gray-200">
            <Ionicons name="person" size={24} color="#666" />
          </View>
        )}
        <View className="ml-3">
          <Text className="text-sm text-gray-500">
            {(() => {
              const hour = new Date().getHours();
              if (hour < 12) return t('common.goodMorning');
              if (hour < 17) return t('common.goodAfternoon');
              if (hour < 21) return t('common.goodEvening');
              return t('common.goodNight');
            })()}{' '}
            👋
          </Text>
          <Text className="text-lg font-bold text-black">{user?.user_metadata?.full_name || 'User'}</Text>
        </View>
      </View>

      <View className="flex-row items-center gap-3">
        <TouchableOpacity
          className="h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white"
          onPress={() => router.push('/(user)/notifications' as any)}>
          <Feather name="bell" size={20} color="black" />
        </TouchableOpacity>
        <TouchableOpacity
          className="h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white"
          onPress={() => router.push('/(settings)/liked-items' as any)}>
          <Feather name="heart" size={20} color="black" />
        </TouchableOpacity>
      </View>
    </View>
  );
};
