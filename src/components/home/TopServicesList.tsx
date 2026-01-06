import React from 'react';
import {View, Text, TouchableOpacity, Image, FlatList, ActivityIndicator} from 'react-native';
import {useQuery} from '@tanstack/react-query';
import {supabase} from '@/utils/supabase';
import {Feather, Ionicons} from '@expo/vector-icons';
import {useRouter} from 'expo-router';
import {useTranslation} from 'react-i18next';

export const TopServicesList = () => {
  const router = useRouter();
  const {t, i18n} = useTranslation();

  const {data: services, isLoading} = useQuery({
    queryKey: ['top-services', i18n.language],
    queryFn: async () => {
      const {data, error} = await supabase.rpc('search_services', {
        search_query: null,
        target_lang: i18n.language,
        category_filter: null,
        day_filter: null,
        user_lat: null,
        user_lng: null,
        radius_meters: null,
        sort_by: 'relevance',
        page_offset: 0,
        page_limit: 5,
      });
      if (error) throw error;
      return data;
    },
  });

  const renderItem = ({item}: {item: any}) => {
    const imageUrl = item.images && item.images.length > 0 ? supabase.storage.from('images').getPublicUrl(item.images[0]).data.publicUrl : null;

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => router.push(`/(user)/services/${item.id}`)}
        className="mr-4 w-60 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm">
        <View className="mb-3 aspect-square w-full overflow-hidden rounded-xl bg-gray-100">
          {imageUrl ? (
            <Image source={{uri: imageUrl}} className="h-full w-full" resizeMode="cover" />
          ) : (
            <View className="h-full w-full items-center justify-center">
              <Feather name="image" size={24} color="#9CA3AF" />
            </View>
          )}
        </View>

        <View>
          <View className="flex-row items-start justify-between">
            <Text numberOfLines={1} className="mr-2 flex-1 text-base font-bold text-gray-900">
              {item.title}
            </Text>
            <Text className="text-sm font-bold text-green-700">${item.price}</Text>
          </View>

          <Text numberOfLines={1} className="mt-1 text-xs text-gray-500">
            {item.description}
          </Text>

          <View className="mt-2 flex-row items-center">
            <Ionicons name="star" size={14} color="#FBBF24" />
            <Text className="ml-1 text-xs font-medium text-gray-700">4.8</Text>
            <Text className="ml-1 text-xs text-gray-400">| 8,289 reviews</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) return <ActivityIndicator size="small" color="#15803d" />;

  return (
    <View className="mt-6">
      <View className="mb-4 flex-row items-center justify-between px-4">
        <Text className="text-lg font-bold text-black">{t('services.popular')}</Text>
        <TouchableOpacity onPress={() => router.push('/(user)/(tabs)/home/services')}>
          <Text className="text-sm font-semibold text-green-700">{t('common.seeAll')}</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        horizontal
        data={services || []}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{paddingHorizontal: 16}}
      />
    </View>
  );
};
