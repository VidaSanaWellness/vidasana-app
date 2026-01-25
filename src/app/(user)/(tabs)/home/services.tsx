import {router, useLocalSearchParams} from 'expo-router';
import {supabase} from '@/utils/supabase';
import {useInfiniteQuery, useMutation, useQueryClient} from '@tanstack/react-query';
import {ActivityIndicator, FlatList, RefreshControl, Text, TextInput, View} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useUserLocation} from '@/hooks';
import {useState, useEffect} from 'react';
import FilterModal, {FilterState} from '@/components/modals/FilterModal';
import {useDebouncer} from '@/hooks/useDebounce';
import {SearchHeader, ServiceCard} from '@/components';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useAppStore} from '@/store';
import Toast from 'react-native-toast-message';
import {Feather} from '@expo/vector-icons';

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
  const {user} = useAppStore((s) => s.session!);
  const queryClient = useQueryClient();
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

  const activeFilterCount = (() => {
    let count = 0;
    if (selectedCategories.length > 0) count++;
    if (selectedDays.length > 0) count++;
    if (sortBy !== 'relevance') count++;
    if (isNearMeEnabled) count++;
    return count;
  })();

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
        search_query: debouncedSearchQuery || undefined,
        target_lang: i18n.language,
        category_filter: selectedCategories.length > 0 ? selectedCategories : undefined,
        day_filter: selectedDays.length > 0 ? selectedDays : undefined,
        user_lat: userLocation?.latitude || undefined,
        user_lng: userLocation?.longitude || undefined,
        radius_meters: isNearMeEnabled ? radius * 1000 : undefined, // Radius in meters
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

  const services = data?.pages.flatMap((page) => page) || [];

  // Bookmark mutation
  const toggleBookmarkMutation = useMutation({
    mutationFn: async ({serviceId, isBookmarked}: {serviceId: string; isBookmarked: boolean}) => {
      if (isBookmarked) {
        const {error} = await supabase.from('bookmark').delete().eq('service', serviceId).eq('user', user.id);
        if (error) throw error;
      } else {
        const {error} = await supabase.from('bookmark').insert({service: serviceId, user: user.id});
        if (error) throw error;
      }
    },
    onMutate: async ({serviceId, isBookmarked}) => {
      await queryClient.cancelQueries({queryKey: ['services_search', i18n.language]});
      const previousData = queryClient.getQueryData(['services_search', i18n.language]);

      queryClient.setQueryData(['services_search', i18n.language], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page: any[]) =>
            page.map((service: any) => (service.id === serviceId ? {...service, is_bookmarked: !isBookmarked} : service))
          ),
        };
      });

      return {previousData};
    },
    onError: (err, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['services_search', i18n.language], context.previousData);
      }
      Toast.show({type: 'error', text1: 'Failed to update bookmark'});
    },
    onSettled: () => {
      queryClient.invalidateQueries({queryKey: ['services_search', i18n.language]});
    },
  });

  const renderItem = ({item}: {item: any}) => (
    <ServiceCard
      id={item.id}
      title={item.title}
      description={item.description}
      price={item.price}
      images={item.images || []}
      distance={item.dist_meters}
      isBookmarked={item.is_bookmarked || false}
      onBookmarkToggle={() => toggleBookmarkMutation.mutate({serviceId: item.id, isBookmarked: item.is_bookmarked || false})}
    />
  );

  const renderHeader = () => (
    <SearchHeader
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      onFilterPress={() => setFilterModalVisible(true)}
      activeFilterCount={activeFilterCount}
      placeholder={t('services.searchPlaceholder')}
      onBack={() => router.back()}
      inputRef={setInputRef}
    />
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
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="#00594f" />}
          ListFooterComponent={isFetchingNextPage ? <ActivityIndicator size="small" color="#00594f" className="my-4" /> : null}
          ListEmptyComponent={
            !isLoading ? (
              <View className="mt-20 items-center justify-center">
                <View className="mb-4 h-24 w-24 items-center justify-center rounded-full bg-gray-50">
                  <Feather name="search" size={40} color="#D1D5DB" />
                </View>
                <Text className="font-nunito-bold text-lg text-gray-900">{t('services.noServices')}</Text>
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
          dateFrom: null,
          dateTo: null,
        }}
        userLocation={userLocation}
      />
    </SafeAreaView>
  );
}
