import {Link} from 'expo-router';
import {supabase} from '@/utils/supabase';
import {Feather} from '@expo/vector-icons';
import {useInfiniteQuery} from '@tanstack/react-query';
import {ActivityIndicator, FlatList, Image, Pressable, RefreshControl, Text, TextInput, TouchableOpacity, View} from 'react-native';
import {useState, useMemo} from 'react';
import {useUserLocation} from '@/hooks';
import {SearchHeader} from '@/components';
import FilterModal, {FilterState} from '@/components/modals/FilterModal';
import {useDebouncer} from '@/hooks/useDebounce';
import {useTranslation} from 'react-i18next';
import {SafeAreaView} from 'react-native-safe-area-context';

// Types
type Event = {
  id: string;
  title: string;
  description: string;
  images: string[] | null;
  start_at: string;
  dist_meters?: number;
  price?: number;
};

type SortOption = 'relevance' | 'price_asc' | 'price_desc' | 'newest';

export default function EventsScreen() {
  const {t, i18n} = useTranslation();
  // -- State --
  const [searchQuery, setSearchQuery, debouncedSearchQuery] = useDebouncer('', 500);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFilterModalVisible, setFilterModalVisible] = useState(false);

  // Filter States
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  // Events use Date Range not Days
  const [dateFrom, setDateFrom] = useState<Date | null>(null);
  const [dateTo, setDateTo] = useState<Date | null>(null);

  const [sortBy, setSortBy] = useState<SortOption>('relevance');
  const [isNearMeEnabled, setIsNearMeEnabled] = useState(false);
  const [radius, setRadius] = useState<number>(10); // Default 10km

  // Location State
  const userLocation = useUserLocation();

  // Handler to Apply Filters from Modal
  const handleApplyFilters = (filters: FilterState) => {
    setSelectedCategories(filters.categories);
    setDateFrom(filters.dateFrom);
    setDateTo(filters.dateTo);
    setSortBy(filters.sortBy);
    setIsNearMeEnabled(filters.isNearMeEnabled);
    setRadius(filters.radius || 10);
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedCategories.length > 0) count++;
    if (dateFrom || dateTo) count++;
    if (sortBy !== 'relevance') count++;
    if (isNearMeEnabled) count++;
    return count;
  }, [selectedCategories, dateFrom, dateTo, sortBy, isNearMeEnabled]);

  // -- Data Fetching --
  const {data, isLoading, refetch, hasNextPage, fetchNextPage, isFetchingNextPage} = useInfiniteQuery({
    queryKey: [
      'events_search',
      i18n.language,
      debouncedSearchQuery,
      selectedCategories,
      dateFrom,
      dateTo,
      userLocation,
      sortBy,
      isNearMeEnabled,
      radius,
    ],
    initialPageParam: 0,
    queryFn: async ({pageParam = 0}) => {
      const LIMIT = 10;
      const {data: rpcData, error} = await supabase.rpc('search_events', {
        search_query: debouncedSearchQuery,
        target_lang: i18n.language,
        category_filter: selectedCategories.length > 0 ? selectedCategories : undefined,
        date_from: dateFrom ? dateFrom.toISOString() : undefined,
        date_to: dateTo ? dateTo.toISOString() : undefined,
        user_lat: userLocation?.latitude || undefined,
        user_lng: userLocation?.longitude || undefined,
        radius_meters: isNearMeEnabled ? radius * 1000 : undefined,
        sort_by: sortBy,
        page_offset: pageParam,
        page_limit: LIMIT,
      });

      if (error) {
        console.error('Search Events API Error:', error);
        throw error;
      }
      return rpcData as Event[];
    },
    getNextPageParam: (lastPage, allPages) => {
      // If less than limit, no more pages
      return lastPage && lastPage.length === 10 ? allPages.length * 10 : undefined;
    },
  });

  const activeEvents = useMemo(() => {
    return data?.pages.flatMap((page) => page) || [];
  }, [data]);

  const onRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  const formatDistance = (meters?: number) => {
    if (!meters) return null;
    if (meters < 1000) return `${Math.round(meters)}m`;
    return `${(meters / 1000).toFixed(1)}km`;
  };

  const renderItem = ({item}: {item: Event}) => {
    // Get first image or placeholder
    const imageUrl = item.images && item.images.length > 0 ? supabase.storage.from('images').getPublicUrl(item.images[0]).data.publicUrl : null;

    return (
      <Link href={`/(user)/events/${item.id}`} asChild>
        <Pressable className="mb-4 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <View className="flex-row">
            {/* Image (Left Side) - Keeping consistent 32x32 size */}
            <View className="aspect-square w-32 bg-gray-200">
              {imageUrl ? (
                <Image source={{uri: imageUrl}} className="h-full w-full" resizeMode="cover" />
              ) : (
                <View className="h-full w-full items-center justify-center">
                  <Feather name="calendar" size={24} color="#9CA3AF" />
                </View>
              )}
            </View>

            {/* Content (Right Side) */}
            <View className="flex-1 justify-between p-3">
              <View>
                <View className="mb-1 flex-row items-start justify-between">
                  <Text className="flex-1 text-lg font-bold text-gray-900" numberOfLines={1}>
                    {item.title}
                  </Text>
                  {item.dist_meters !== undefined && item.dist_meters !== null && (
                    <View className="ml-2 flex-row items-center rounded bg-gray-100 px-1.5 py-0.5">
                      <Feather name="map-pin" size={10} color="#6B7280" />
                      <Text className="ml-1 text-[10px] text-gray-500">{formatDistance(item.dist_meters)}</Text>
                    </View>
                  )}
                </View>
                <Text className="mb-2 text-xs text-gray-500" numberOfLines={2}>
                  {item.description}
                </Text>
              </View>

              <View>
                {/* Date/Time */}
                <View className="mb-1 flex-col">
                  {/* Start Time */}
                  <View className="mb-1 flex-row items-center">
                    <Feather name="clock" size={12} color="#6B7280" />
                    <Text className="ml-1 text-xs text-gray-600">
                      {t('events.startTime')}:{' '}
                      {item.start_at
                        ? `${new Date(item.start_at).toLocaleTimeString('en-US', {hour: '2-digit', minute: '2-digit', hour12: true})} - ${new Date(item.start_at).getDate().toString().padStart(2, '0')}/${(new Date(item.start_at).getMonth() + 1).toString().padStart(2, '0')}/${new Date(item.start_at).getFullYear().toString().slice(-2)}`
                        : ''}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </Pressable>
      </Link>
    );
  };

  const renderHeader = () => (
    <SearchHeader
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      onFilterPress={() => setFilterModalVisible(true)}
      activeFilterCount={activeFilterCount}
      placeholder={t('events.searchPlaceholder')}
    />
  );

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 px-4 pt-2">
        <FlatList
          data={activeEvents}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{paddingBottom: 100}}
          ListHeaderComponent={renderHeader()}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) {
              fetchNextPage();
            }
          }}
          onEndReachedThreshold={0.5}
          ListFooterComponent={isFetchingNextPage ? <ActivityIndicator size="small" color="#15803d" className="my-4" /> : null}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={() =>
            !isLoading ? (
              <View className="mt-20 items-center justify-center">
                <View className="mb-4 h-24 w-24 items-center justify-center rounded-full bg-gray-50">
                  <Feather name="calendar" size={40} color="#D1D5DB" />
                </View>
                <Text className="mb-2 text-lg font-bold text-gray-900">{t('events.noEvents')}</Text>
                <Text className="mb-6 text-center text-gray-500">{t('events.noEventsSubtitle')}</Text>
              </View>
            ) : (
              <ActivityIndicator size="large" color="#15803d" className="mt-10" />
            )
          }
        />
      </View>
      <FilterModal
        visible={isFilterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        onApply={handleApplyFilters}
        initialFilters={{
          categories: selectedCategories,
          days: [],
          dateFrom,
          dateTo,
          sortBy,
          isNearMeEnabled,
          radius,
        }}
        userLocation={userLocation}
        mode="event"
      />
    </SafeAreaView>
  );
}
