import React from 'react';
import {useRouter} from 'expo-router';
import {supabase} from '@/utils';
import {Feather} from '@expo/vector-icons';
import {useTranslation} from 'react-i18next';
import {useQuery} from '@tanstack/react-query';
import {View, Text, TouchableOpacity, FlatList, ActivityIndicator, Image} from 'react-native';

interface CategoryGridProps {
  selectedCategory: number | null;
  onSelectCategory: (id: number | null) => void;
}

export const CategoryGrid = ({selectedCategory, onSelectCategory}: CategoryGridProps) => {
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

  const data = (() => {
    if (!categories) return [];
    // Show all categories in horizontal list
    const items: any[] = [...categories];
    // Add "All" at the beginning instead of "See All" at end? Or keep "See All" for navigating?
    // Let's keep "See All" at the end for full search page, but maybe add "All" chip at start for clearing filter?
    // User asked to clear by tapping "All" in categories. So we need an "All" chip.
    const allItem = {id: 'all', name: t('common.all', 'All'), icon: null};
    return [allItem, ...items];
  })();

  const renderItem = ({item}: {item: any}) => {
    const isAll = item.id === 'all';
    const isSelected = isAll ? selectedCategory === null : selectedCategory === item.id;
    const iconUrl = !isAll ? item.icon : null;

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => {
          if (isAll) {
            onSelectCategory(null);
          } else {
            // If already selected, deselect (optional, asking user implied "All" clears it)
            // For now, selecting another switches, selecting "All" clears.
            onSelectCategory(item.id);
          }
        }}
        className={`mr-3 flex-row items-center rounded-full border px-4 py-2.5 ${
          isSelected ? 'border-primary bg-primary' : 'border-gray-200 bg-white'
        }`}>
        {/* Only show icon if not "All" (or show specific icon for All) */}
        {!isAll && (
          <View className="mr-2 h-5 w-5 items-center justify-center">
            {iconUrl ? (
              <Image source={{uri: iconUrl}} className="h-full w-full" resizeMode="contain" tintColor={isSelected ? 'white' : undefined} />
            ) : (
              <Feather name="grid" size={16} color={isSelected ? 'white' : '#4B5563'} />
            )}
          </View>
        )}
        <Text className={`font-nunito-bold text-sm ${isSelected ? 'text-white' : 'text-gray-700'}`}>{item.name}</Text>
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
    <View className="mt-4">
      <FlatList
        horizontal
        data={data}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{paddingHorizontal: 16}}
      />
    </View>
  );
};
