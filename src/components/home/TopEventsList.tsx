import React from 'react';
import {View, Text, TouchableOpacity, Image, FlatList, ActivityIndicator} from 'react-native';
import {useQuery} from '@tanstack/react-query';
import {supabase} from '@/utils/supabase';
import {Feather} from '@expo/vector-icons';
import {useRouter} from 'expo-router';
import {useTranslation} from 'react-i18next';

export const TopEventsList = () => {
  const router = useRouter();
  const {t, i18n} = useTranslation();

  const {data: events, isLoading} = useQuery({
    queryKey: ['top-events', i18n.language],
    queryFn: async () => {
      const {data, error} = await supabase.rpc('search_events', {
        search_query: undefined,
        target_lang: i18n.language,
        category_filter: undefined,
        date_from: undefined,
        date_to: undefined,
        user_lat: undefined,
        user_lng: undefined,
        radius_meters: undefined,
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
        onPress={() => router.push(`/(user)/events/${item.id}`)}
        className="mr-4 w-60 rounded-3xl border border-gray-100 bg-white shadow-sm">
        <View className="aspect-square w-full overflow-hidden rounded-t-3xl bg-gray-100">
          {imageUrl ? (
            <Image source={{uri: imageUrl}} className="h-full w-full" resizeMode="cover" />
          ) : (
            <View className="h-full w-full items-center justify-center">
              <Feather name="calendar" size={24} color="#9CA3AF" />
            </View>
          )}
        </View>

        <View className="p-3">
          <View className="flex-row items-start justify-between">
            <Text numberOfLines={1} className="mr-2 flex-1 font-nunito-bold text-base text-gray-900">
              {item.title}
            </Text>
            {/* Events might not have price or we show location */}
          </View>

          <Text numberOfLines={1} className="mt-1 font-nunito text-xs text-gray-500">
            {item.description}
          </Text>

          <View className="mt-2 flex-row items-center">
            <Feather name="clock" size={12} color="gray" />
            <Text className="ml-1 font-nunito text-xs text-gray-500">{item.start_at ? new Date(item.start_at).toLocaleDateString() : ''}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) return <ActivityIndicator size="small" color="#00594f" />;

  return (
    <View className="mb-8 mt-6">
      <View className="mb-4 flex-row items-center justify-between px-4">
        <Text className="font-nunito-bold text-lg text-black">{t('events.popular')}</Text>
        <TouchableOpacity onPress={() => router.push('/(user)/(tabs)/home/events')}>
          <Text className="font-nunito-bold text-sm text-primary">{t('common.seeAll')}</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        horizontal
        data={events || []}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{paddingHorizontal: 16}}
      />
    </View>
  );
};
