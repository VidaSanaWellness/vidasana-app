import React from 'react';
import {View, Text, TouchableOpacity, Image, FlatList, ActivityIndicator} from 'react-native';
import {useQuery} from '@tanstack/react-query';
import {supabase} from '@/utils/supabase';
import {Feather} from '@expo/vector-icons';
import {useRouter} from 'expo-router';
import {useTranslation} from 'react-i18next';

export const TopServicesList = () => {
  const router = useRouter();
  const {t, i18n} = useTranslation();

  const {data: services, isLoading} = useQuery({
    queryKey: ['top-services', i18n.language],
    queryFn: async () => {
      const {data, error} = await supabase.rpc('search_services', {
        search_query: undefined,
        target_lang: i18n.language,
        category_filter: undefined,
        day_filter: undefined,
        user_lat: undefined,
        user_lng: undefined,
        radius_meters: undefined,
        sort_by: 'relevance',
        page_offset: 0,
        page_limit: 5,
      });
      if (error) throw error;
      if (!data || data.length === 0) return [];

      // Fetch week_day for the retrieved services
      const ids = data.map((s) => s.id);
      const {data: details, error: detailsError} = await supabase.from('services').select('id, week_day').in('id', ids);

      if (detailsError) {
        console.error('Error fetching service details:', detailsError);
        return data; // Return basic data if detail fetch fails
      }

      // Merge week_day into the result
      const detailsMap = new Map(details.map((d) => [d.id, d.week_day]));
      return data.map((s) => ({...s, week_day: detailsMap.get(s.id)}));
    },
  });

  const renderItem = ({item}: {item: any}) => {
    const imageUrl = item.images && item.images.length > 0 ? supabase.storage.from('images').getPublicUrl(item.images[0]).data.publicUrl : null;

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => router.push(`/(user)/services/${item.id}`)}
        className="mr-4 w-60 rounded-3xl border border-gray-100 bg-white shadow-sm">
        <View className="aspect-square w-full overflow-hidden rounded-t-3xl bg-gray-100">
          {imageUrl ? (
            <Image source={{uri: imageUrl}} className="h-full w-full" resizeMode="cover" />
          ) : (
            <View className="h-full w-full items-center justify-center">
              <Feather name="image" size={24} color="#9CA3AF" />
            </View>
          )}
        </View>

        <View className="p-3">
          <View className="flex-row items-start justify-between">
            <Text numberOfLines={1} className="mr-2 flex-1 font-nunito-bold text-base text-gray-900">
              {item.title}
            </Text>
            <Text className="font-nunito-bold text-sm text-primary">${item.price}</Text>
          </View>

          <Text numberOfLines={1} className="mt-1 font-nunito text-xs text-gray-500">
            {item.description}
          </Text>

          <View className="mt-2 flex-row flex-wrap gap-1">
            {item.week_day && item.week_day.length === 7 ? (
              <View className="h-5 items-center justify-center rounded-full bg-green-100 px-2">
                <Text className="font-nunito-bold text-[10px] uppercase text-green-800">All Days</Text>
              </View>
            ) : (
              ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((day) => {
                const isActive = item.week_day && item.week_day.includes(day);
                if (!isActive) return null;
                return (
                  <View key={day} className="h-5 w-10 items-center justify-center rounded-full bg-green-100">
                    <Text className="font-nunito-bold text-[10px] uppercase text-green-800">{day}</Text>
                  </View>
                );
              })
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) return <ActivityIndicator size="small" color="#00594f" />;

  return (
    <View className="mt-6">
      <View className="mb-4 flex-row items-center justify-between px-4">
        <Text className="font-nunito-bold text-lg text-black">{t('services.popular')}</Text>
        <TouchableOpacity onPress={() => router.push('/(user)/(tabs)/home/services')}>
          <Text className="font-nunito-bold text-sm text-primary">{t('common.seeAll')}</Text>
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
