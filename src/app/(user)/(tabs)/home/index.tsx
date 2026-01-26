import {Feather} from '@expo/vector-icons';
import {useRouter} from 'expo-router';
import {useTranslation} from 'react-i18next';
import {View, Text, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, TextInput} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import React, {useState, useEffect} from 'react';
import {HomeHeader, CategoryGrid, MoodCheckInModal, FilterModal, ServiceCard, FilterState} from '@/components';
import {useDebouncer} from '@/hooks/useDebounce';
import {useUserLocation} from '@/hooks';
import {useInfiniteQuery, useMutation, useQueryClient} from '@tanstack/react-query';
import {supabase} from '@/utils';
import {useAppStore} from '@/store';
import Toast from 'react-native-toast-message';

// Module-level variable to track if modal has been shown in this session
let hasShownMoodModal = false;

type SortOption = 'relevance' | 'price_asc' | 'price_desc' | 'newest';

type Service = {
  id: string;
  title: string;
  description: string;
  price: number | null;
  images: string[] | null;
  provider: any;
  created_at: string;
  dist_meters?: number;
};

export default function HomeScreen() {
  const {t, i18n} = useTranslation();
  // const router = useRouter(); // Removed unused router
  const {user} = useAppStore((s) => s.session!);
  const hasSeenMoodModal = useAppStore((s) => s.hasSeenMoodModal);
  const setHasSeenMoodModal = useAppStore((s) => s.setHasSeenMoodModal);
  const queryClient = useQueryClient();

  // -- State --
  // Search
  const [searchQuery, setSearchQuery, debouncedSearchQuery] = useDebouncer('', 500);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>('relevance');
  const [isNearMeEnabled, setIsNearMeEnabled] = useState(true);
  const [radius, setRadius] = useState<number>(50); // Default 50km

  // Modals
  const [showMoodModal, setShowMoodModal] = useState(false);
  const [isFilterModalVisible, setFilterModalVisible] = useState(false);

  // Refreshing
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Location
  const {location: userLocation} = useUserLocation();

  // Auto-show mood modal
  useEffect(() => {
    // Show modal only if not seen yet
    if (!hasSeenMoodModal) {
      const timer = setTimeout(() => {
        setShowMoodModal(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [hasSeenMoodModal]);

  const handleMoodSelect = (moodId: number) => {
    console.log('Selected Mood:', moodId);
    setShowMoodModal(false);
    setHasSeenMoodModal(true);
    setSelectedCategory(moodId); // Assuming mood selection filters by category
  };

  // -- Data Fetching --
  const {data, isLoading, refetch, hasNextPage, fetchNextPage, isFetchingNextPage} = useInfiniteQuery({
    queryKey: [
      'services_search_home',
      i18n.language,
      debouncedSearchQuery,
      selectedCategory,
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
        category_filter: selectedCategory ? [selectedCategory] : undefined,
        day_filter: selectedDays.length > 0 ? selectedDays : undefined,
        user_lat: userLocation?.latitude || undefined,
        user_lng: userLocation?.longitude || undefined,
        radius_meters: isNearMeEnabled ? radius * 1000 : undefined,
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

  const services = data?.pages.flatMap((page) => page) || [];

  // Manual Refresh Handler
  const onRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  // Filter Apply Handler
  const handleApplyFilters = (filters: FilterState) => {
    // Categories are single select in grid but multi in modal logic usually.
    // For now, if modal returns multi categories, we might pick first or change logic.
    // Given the home screen design has a single select pill list, let's treat it as single select effectively,
    // or if modal allows multi, we might need to update the UI to show multiple selected.
    // Current CategoryGrid uses single ID `selectedCategory`.
    // Let's assume for consistency we stick to the primary one or if multiple, reset to first.
    if (filters.categories.length > 0) {
      setSelectedCategory(filters.categories[0]);
    } else {
      setSelectedCategory(null);
    }

    setSelectedDays(filters.days);
    setSortBy(filters.sortBy);
    setIsNearMeEnabled(filters.isNearMeEnabled);
    setRadius(filters.radius);
  };

  const activeFilterCount = (() => {
    let count = 0;
    if (selectedDays.length > 0) count++;
    if (sortBy !== 'relevance') count++;
    // Near me is default true now, maybe don't count it or count if specific params changed?
    // Let's count if it's NOT default
    if (radius !== 50) count++;
    return count;
  })();

  // Bookmark mutation (Copied from services.tsx)
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
      await queryClient.cancelQueries({queryKey: ['services_search_home', i18n.language]});
      const previousData = queryClient.getQueryData(['services_search_home', i18n.language]);

      queryClient.setQueryData(['services_search_home', i18n.language], (old: any) => {
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
    onError: (err, variables, context: any) => {
      if (context?.previousData) {
        queryClient.setQueryData(['services_search_home', i18n.language], context.previousData);
      }
      Toast.show({type: 'error', text1: 'Failed to update bookmark'});
    },
    onSettled: () => {
      queryClient.invalidateQueries({queryKey: ['services_search_home', i18n.language]});
    },
  });

  const renderItem = ({item}: {item: any}) => (
    <View className="px-4">
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
    </View>
  );

  const HeaderComponent = () => (
    <View>
      {/* Search & Filter Bar */}
      <View className="mb-3 mt-2 flex-row gap-3 px-4">
        <View className="h-14 flex-1 flex-row items-center rounded-xl border border-gray-100 bg-gray-50 px-4">
          <Feather name="search" size={20} color="#9CA3AF" />
          <TextInput
            className="ml-3 flex-1 font-nunito text-base text-gray-900"
            placeholder={t('services.searchPlaceholder')}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9CA3AF"
          />
        </View>
        <TouchableOpacity
          onPress={() => setFilterModalVisible(true)}
          className={`h-14 w-14 items-center justify-center rounded-xl ${
            activeFilterCount > 0 ? 'border-primary bg-primary' : 'border-gray-100 bg-gray-50'
          } border`}>
          <Feather name="sliders" size={20} color={activeFilterCount > 0 ? 'white' : '#4B5563'} />
          {activeFilterCount > 0 && <View className="absolute right-3 top-3 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />}
        </TouchableOpacity>
      </View>

      <CategoryGrid selectedCategory={selectedCategory} onSelectCategory={setSelectedCategory} />

      {/* Section Title */}
      <View className="mb-4 mt-6 flex-row items-center justify-between px-4">
        <Text className="font-nunito-bold text-lg text-black">
          {searchQuery || selectedCategory || activeFilterCount > 0
            ? t('services.results', 'Results')
            : t('services.recommended', 'Recommended for you')}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <HomeHeader onMoodPress={() => setShowMoodModal(true)} />

      <FlatList
        data={services}
        renderItem={renderItem}
        keyExtractor={(item, index) => item.id || `service-${index}`}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{paddingBottom: 100}}
        ListHeaderComponent={HeaderComponent}
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
            <View className="items-center justify-center py-20">
              <View className="mb-4 h-20 w-20 items-center justify-center rounded-full bg-gray-50">
                <Feather name="search" size={32} color="#D1D5DB" />
              </View>
              <Text className="font-nunito-bold text-lg text-gray-900">{t('services.noServices')}</Text>
              <Text className="mt-1 font-nunito text-sm text-gray-500">Try adjusting your filters</Text>
            </View>
          ) : null
        }
      />

      <MoodCheckInModal visible={showMoodModal} onClose={() => setShowMoodModal(false)} onMoodSelect={handleMoodSelect} />

      <FilterModal
        visible={isFilterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        onApply={handleApplyFilters}
        initialFilters={{
          categories: selectedCategory ? [selectedCategory] : [],
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
