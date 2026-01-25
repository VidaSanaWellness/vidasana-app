import {Feather} from '@expo/vector-icons';
import {useRouter} from 'expo-router';
import {useTranslation} from 'react-i18next';
import {View, Text, ScrollView, TouchableOpacity} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import React from 'react';
import {HomeHeader} from '@/components/home/HomeHeader';
import {CategoryGrid} from '@/components/home/CategoryGrid';
import {TopServicesList} from '@/components/home/TopServicesList';
// import {TopEventsList} from '@/components/home/TopEventsList'; // Hidden for now - events will have dedicated page

export default function HomeScreen() {
  const {t} = useTranslation();
  const router = useRouter();

  const handleSearchPress = () => router.push('/(user)/(tabs)/home/services?focus=true');

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <HomeHeader />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom: 100}}>
        <View className="mb-3 mt-2 px-4">
          <TouchableOpacity
            activeOpacity={1}
            onPress={handleSearchPress}
            className="h-14 flex-row items-center rounded-xl border border-gray-100 bg-gray-50 px-4">
            <Feather name="search" size={20} color="#9CA3AF" />
            <Text className="ml-3 flex-1 font-nunito text-base text-gray-400">{t('services.searchPlaceholder')}</Text>
            <View className="rounded-lg bg-primary p-2">
              <Feather name="sliders" size={16} color="white" />
            </View>
          </TouchableOpacity>
        </View>

        <CategoryGrid />

        <TopServicesList />

        {/* <TopEventsList /> */}
        {/* Events hidden - will have dedicated page */}
      </ScrollView>
    </SafeAreaView>
  );
}
