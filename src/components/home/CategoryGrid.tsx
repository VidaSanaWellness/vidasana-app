import React from 'react';
import {useRouter} from 'expo-router';
import {supabase} from '@/utils/supabase';
import {Feather} from '@expo/vector-icons';
import {useTranslation} from 'react-i18next';
import {useQuery} from '@tanstack/react-query';
import {View, Text, TouchableOpacity, FlatList, ActivityIndicator} from 'react-native';

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

  const handleCategoryPress = (categoryId: number) =>
    router.push({pathname: '/(user)/(tabs)/home/services', params: {categoryId: categoryId.toString()}});

  const data = (() => {
    if (!categories) return [];
    const items: any[] = categories.slice(0, 7);
    items.push({id: 'see-all', isSeeAll: true, name: t('common.seeAll'), icon: 'more-horizontal'});
    return items;
  })();

  const renderItem = ({item}: {item: any}) => {
    const isSeeAll = item.id === 'see-all';

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => (isSeeAll ? router.push('/(user)/(tabs)/home/services') : handleCategoryPress(item.id))}
        className="mb-6 w-1/4 items-center px-1">
        <View className={`mb-2 h-14 w-14 items-center justify-center rounded-2xl ${isSeeAll ? 'bg-gray-100' : 'bg-primary/5'}`}>
          <Feather name={getIconName(item.icon)} size={24} color={isSeeAll ? '#4B5563' : '#00594f'} />
        </View>
        <Text numberOfLines={1} className="font-nunito-bold text-center text-xs text-gray-700">
          {item.name}
        </Text>
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
    <View className="mt-6 px-4">
      <View className="mb-4 flex-row items-center justify-between">
        <Text className="font-nunito-bold text-lg text-black">{t('services.categories')}</Text>
      </View>

      <FlatList
        data={data}
        numColumns={4}
        scrollEnabled={false}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        columnWrapperStyle={{justifyContent: 'flex-start'}}
      />
    </View>
  );
};
