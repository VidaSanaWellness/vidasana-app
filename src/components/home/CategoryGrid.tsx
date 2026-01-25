import React from 'react';
import {useRouter} from 'expo-router';
import {supabase} from '@/utils/supabase';
import {Feather} from '@expo/vector-icons';
import {useTranslation} from 'react-i18next';
import {useQuery} from '@tanstack/react-query';
import {View, Text, TouchableOpacity, FlatList, ActivityIndicator, Image} from 'react-native';

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

  const handleCategoryPress = (categoryId: number) =>
    router.push({pathname: '/(user)/(tabs)/home/services', params: {categoryId: categoryId.toString()}});

  const data = (() => {
    if (!categories) return [];
    // Show all categories in horizontal list
    const items: any[] = [...categories];
    // Add "See All" at the end
    items.push({id: 'see-all', isSeeAll: true, name: t('common.seeAll'), icon: 'more-horizontal'});
    return items;
  })();

  const renderItem = ({item}: {item: any}) => {
    const isSeeAll = item.id === 'see-all';
    const iconUrl = !isSeeAll ? item.icon : null;

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => (isSeeAll ? router.push('/(user)/(tabs)/home/services') : handleCategoryPress(item.id))}
        className="mr-3 flex-row items-center rounded-full border border-gray-200 bg-white px-4 py-2.5">
        <View className="mr-2 h-5 w-5 items-center justify-center">
          {isSeeAll ? (
            <Feather name="grid" size={16} color="#4B5563" />
          ) : iconUrl ? (
            <Image source={{uri: iconUrl}} className="h-full w-full" resizeMode="contain" />
          ) : (
            <Feather name="grid" size={16} color="#4B5563" />
          )}
        </View>
        <Text className="font-nunito-bold text-sm text-gray-700">{item.name}</Text>
      </TouchableOpacity>
    );
  };

  if (isLoading)
    return (
      <View className="py-4">
        <ActivityIndicator size="small" color="#00594f" />
      </View>
    );

  return (
    <FlatList
      horizontal
      data={data}
      renderItem={renderItem}
      keyExtractor={(item) => item.id.toString()}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{paddingHorizontal: 16}}
    />
  );
};
