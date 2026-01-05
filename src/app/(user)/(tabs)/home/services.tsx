import {Link} from 'expo-router';
import {supabase} from '@/utils/supabase';
import {Feather} from '@expo/vector-icons';
import {useInfiniteQuery} from '@tanstack/react-query';
import {ActivityIndicator, FlatList, Image, Pressable, RefreshControl, Text, TextInput, TouchableOpacity, View} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useUserLocation} from '@/hooks';
import {useState, useMemo, useEffect} from 'react';
import FilterModal, {FilterState} from '@/components/modals/FilterModal';
import {useDebouncer} from '@/hooks/useDebounce';
import {SearchHeader} from '@/components';
import {useLocalSearchParams} from 'expo-router';
import {SafeAreaView} from 'react-native-safe-area-context';

// Mock / Types
type Service = {
  id: string;
  title: string;
  description: string;
  price: number | null;
  images: string[] | null;
  provider: any;
  created_at: string;
  dist_meters?: number; // Distance in meters
};

type SortOption = 'relevance' | 'price_asc' | 'price_desc' | 'newest';

export default function ServicesScreen() {
  const {t, i18n} = useTranslation();
  const params = useLocalSearchParams();
  const initialFocus = params.focus === 'true';
  const initialCategoryId = params.categoryId ? Number(params.categoryId) : undefined;

  // -- State --
  // Use custom debouncer hook
  const [searchQuery, setSearchQuery, debouncedSearchQuery] = useDebouncer('', 500);

  // Manual refresh state for Pull-to-Refresh
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [isFilterModalVisible, setFilterModalVisible] = useState(false);

  // Filter States (Applied Filters)
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>('relevance');
  const [isNearMeEnabled, setIsNearMeEnabled] = useState(false);
  const [radius, setRadius] = useState<number>(10); // Default 10km
  const [inputRef, setInputRef] = useState<TextInput | null>(null);

  useEffect(() => {
    if (initialFocus && inputRef) {
      setTimeout(() => inputRef.focus(), 100);
    }
  }, [initialFocus, inputRef]);

  useEffect(() => {
    if (initialCategoryId) {
      setSelectedCategories([initialCategoryId]);
    }
  }, [initialCategoryId]);

  // Location State
  const {location: userLocation} = useUserLocation();

  // Handler to Apply Filters from Modal
  const handleApplyFilters = (filters: FilterState) => {
    setSelectedCategories(filters.categories);
    setSelectedDays(filters.days);
    setSortBy(filters.sortBy);
    setIsNearMeEnabled(filters.isNearMeEnabled);
    setRadius(filters.radius || 10);
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedCategories.length > 0) count++;
    if (selectedDays.length > 0) count++;
    if (sortBy !== 'relevance') count++;
    if (isNearMeEnabled) count++;
    return count;
  }, [selectedCategories, selectedDays, sortBy, isNearMeEnabled]);

  // -- Data Fetching --
  const {data, isLoading, refetch, hasNextPage, fetchNextPage, isFetchingNextPage} = useInfiniteQuery({
    queryKey: [
      'services_search',
      i18n.language,
      debouncedSearchQuery,
      selectedCategories,
      selectedDays,
      userLocation,
      sortBy,
      isNearMeEnabled,
      radius,
    ],
    initialPageParam: 0,
    queryFn: async ({pageParam = 0}) => {
      const LIMIT = 10;
      const {data: rpcData, error} = await supabase.rpc('search_services', {
        search_query: debouncedSearchQuery || null,
        target_lang: i18n.language,
        category_filter: selectedCategories.length > 0 ? selectedCategories : null,
        day_filter: selectedDays.length > 0 ? selectedDays : null,
        user_lat: userLocation?.latitude || null,
        user_lng: userLocation?.longitude || null,
        radius_meters: isNearMeEnabled ? radius * 1000 : null, // Radius in meters
        sort_by: sortBy,
        page_offset: pageParam,
        page_limit: LIMIT,
      });

      if (error) {
        console.error('Search API Error:', error);
        throw error;
      }
      return rpcData as Service[];
    },
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length === 10 ? allPages.length * 10 : undefined;
    },
  });

  // Manual Refresh Handler
  const onRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  const services = useMemo(() => {
    return data?.pages.flatMap((page) => page) || [];
  }, [data]);

  // -- Renders --
  const formatDistance = (meters?: number) => {
    if (!meters) return null;
    if (meters < 1000) return `${Math.round(meters)}m`;
    return `${(meters / 1000).toFixed(1)}km`;
  };

  const renderItem = ({item}: {item: Service}) => {
    const imageUrl = item.images && item.images.length > 0 ? supabase.storage.from('images').getPublicUrl(item.images[0]).data.publicUrl : null;

    return (
      <Link href={`/(user)/services/${item.id}`} asChild>
        <Pressable className="mb-4 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <View className="flex-row">
            <View className="h-32 w-32 bg-gray-200">
              {imageUrl ? (
                <Image source={{uri: imageUrl}} className="h-full w-full" resizeMode="cover" />
              ) : (
                <View className="h-full w-full items-center justify-center">
                  <Feather name="image" size={24} color="#9CA3AF" />
                </View>
              )}
            </View>

            <View className="flex-1 justify-between p-3">
              <View>
                <View className="mb-1 flex-row items-start justify-between">
                  {/* Title */}
                  <Text className="flex-1 text-lg font-bold text-gray-900" numberOfLines={1}>
                    {item.title}
                  </Text>
                  <View className="items-end">
                    {item.price !== null && <Text className="text-sm font-semibold text-green-700">${item.price}</Text>}
                    {item.dist_meters !== undefined && item.dist_meters !== null && (
                      <View className="mt-1 flex-row items-center rounded bg-gray-100 px-1.5 py-0.5">
                        <Feather name="map-pin" size={10} color="#6B7280" />
                        <Text className="ml-1 text-[10px] text-gray-500">{formatDistance(item.dist_meters)}</Text>
                      </View>
                    )}
                  </View>
                </View>
                <Text className="mb-2 text-xs text-gray-500" numberOfLines={2}>
                  {item.description}
                </Text>
              </View>

              <View className="flex-row items-center">
                <Feather name="clock" size={12} color="gray" />
                <Text className="ml-1 text-xs text-gray-500">{t('services.viewDetails')}</Text>
              </View>
            </View>
          </View>
        </Pressable>
      </Link>
    );
  };

  const renderHeader = () => (
    <View className="mb-4 px-4 pt-4">
      {/* Search Header Inline Implementation to access ref */}
      <View className="flex-row items-center gap-3">
        <View className="h-12 flex-1 flex-row items-center rounded-xl border border-gray-200 bg-gray-100 px-4">
          <Feather name="search" size={20} color="#9CA3AF" />
          <TextInput
            ref={setInputRef}
            placeholder={t('services.searchPlaceholder')}
            className="ml-2 h-full flex-1 text-gray-900"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Feather name="x" size={16} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          onPress={() => setFilterModalVisible(true)}
          className={`h-12 w-12 items-center justify-center rounded-xl border ${
            activeFilterCount > 0 ? 'border-green-700 bg-green-700' : 'border-gray-200 bg-white'
          }`}>
          <Feather name="sliders" size={20} color={activeFilterCount > 0 ? 'white' : '#374151'} />
          {activeFilterCount > 0 && <View className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full border border-white bg-red-500" />}
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-white">
      {renderHeader()}
      <View className="flex-1 px-4">
        <FlatList
          data={services}
          renderItem={renderItem}
          keyExtractor={(item, index) => item.id || `service-${index}`}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{paddingBottom: 100}}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) {
              fetchNextPage();
            }
          }}
          onEndReachedThreshold={0.5}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="#15803d" />}
          ListFooterComponent={isFetchingNextPage ? <ActivityIndicator size="small" color="#15803d" className="my-4" /> : null}
          ListEmptyComponent={
            !isLoading ? (
              <View className="mt-20 items-center justify-center">
                <View className="mb-4 h-24 w-24 items-center justify-center rounded-full bg-gray-50">
                  <Feather name="search" size={40} color="#D1D5DB" />
                </View>
                <Text className="text-lg font-bold text-gray-900">{t('services.noServices')}</Text>
              </View>
            ) : null
          }
        />
      </View>

      {/* Filter Modal Component */}
      <FilterModal
        visible={isFilterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        onApply={handleApplyFilters}
        initialFilters={{
          categories: selectedCategories,
          days: selectedDays,
          sortBy,
          isNearMeEnabled,
          radius,
        }}
        userLocation={userLocation}
      />
    </SafeAreaView>
  );
}
