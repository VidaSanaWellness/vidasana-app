import React from 'react';
import {View, Text, TouchableOpacity, ScrollView, ActivityIndicator} from 'react-native';
import {Feather} from '@expo/vector-icons';
import {useQuery} from '@tanstack/react-query';
import {supabase} from '@/utils/supabase';
import {useTranslation} from 'react-i18next';
import {useRouter} from 'expo-router';

export const CategoryGrid = () => {
  const {t} = useTranslation();
  const router = useRouter();

  const {data: categories, isLoading} = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const {data, error} = await supabase.from('categories').select('*').eq('status', true).order('name');
      if (error) throw error;
      return data;
    },
  });

  const getIconName = (iconName: string): keyof typeof Feather.glyphMap => {
    if (!iconName) return 'grid';
    return (iconName as keyof typeof Feather.glyphMap) in Feather.glyphMap ? (iconName as keyof typeof Feather.glyphMap) : 'grid';
  };

  const handleCategoryPress = (categoryId: number) => {
    router.push({
      pathname: '/(user)/(tabs)/home/services',
      params: {categoryId: categoryId.toString()},
    });
  };

  if (isLoading) {
    return (
      <View className="py-4">
        <ActivityIndicator size="small" color="#15803d" />
      </View>
    );
  }

  return (
    <View className="mt-6 px-4">
      <View className="mb-4 flex-row items-center justify-between">
        <Text className="text-lg font-bold text-black">{t('services.categories')}</Text>
        <TouchableOpacity onPress={() => router.push('/(user)/(tabs)/home/services')}>
          <Text className="text-sm font-semibold text-green-700">{t('common.seeAll')}</Text>
        </TouchableOpacity>
      </View>

      <View className="flex-row flex-wrap justify-between">
        {categories?.slice(0, 8).map((cat) => (
          <TouchableOpacity key={cat.id} activeOpacity={0.7} onPress={() => handleCategoryPress(cat.id)} className="mb-6 w-[22%] items-center">
            <View className="mb-2 h-14 w-14 items-center justify-center rounded-full bg-green-50">
              <Feather name={getIconName(cat.icon || 'grid')} size={24} color="#15803d" />
            </View>
            <Text numberOfLines={1} className="text-xs font-medium text-gray-700">
              {cat.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};
