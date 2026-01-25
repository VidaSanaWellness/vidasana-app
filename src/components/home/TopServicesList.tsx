import React from 'react';
import {View, Text, TouchableOpacity, FlatList, ActivityIndicator} from 'react-native';
import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
import {supabase} from '@/utils/supabase';
import {useRouter} from 'expo-router';
import {useTranslation} from 'react-i18next';
import {ServiceCard} from '@/components';
import {useAppStore} from '@/store';
import Toast from 'react-native-toast-message';

export const TopServicesList = () => {
  const router = useRouter();
  const {t, i18n} = useTranslation();
  const {user} = useAppStore((s) => s.session!);
  const queryClient = useQueryClient();

  const {data: services, isLoading} = useQuery({
    queryKey: ['top-services', i18n.language, user?.id],
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
        page_limit: 10,
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
      // Cancel outgoing refetches
      await queryClient.cancelQueries({queryKey: ['top-services', i18n.language, user?.id]});

      // Snapshot previous value
      const previousServices = queryClient.getQueryData(['top-services', i18n.language, user?.id]);

      // Optimistically update
      queryClient.setQueryData(['top-services', i18n.language, user?.id], (old: any) => {
        if (!old) return old;
        return old.map((service: any) => (service.id === serviceId ? {...service, is_bookmarked: !isBookmarked} : service));
      });

      return {previousServices};
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousServices) {
        queryClient.setQueryData(['top-services', i18n.language, user?.id], context.previousServices);
      }
      Toast.show({type: 'error', text1: 'Failed to update bookmark'});
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({queryKey: ['top-services', i18n.language, user?.id]});
    },
  });

  const renderItem = ({item}: {item: any}) => (
    <ServiceCard
      id={item.id}
      title={item.title}
      description={item.description}
      price={item.price}
      images={item.images || []}
      weekDays={item.week_day || []}
      distance={item.dist_meters}
      isBookmarked={item.is_bookmarked || false}
      onBookmarkToggle={() => toggleBookmarkMutation.mutate({serviceId: item.id, isBookmarked: item.is_bookmarked || false})}
    />
  );

  if (isLoading) return <ActivityIndicator size="small" color="#00594f" className="my-4" />;

  return (
    <View className="mt-3">
      {/* <View className="mb-4 flex-row items-center justify-between px-4">
        <Text className="font-nunito-bold text-lg text-black">{t('services.popular')}</Text>
        <TouchableOpacity onPress={() => router.push('/(user)/(tabs)/home/services')}>
          <Text className="font-nunito-bold text-sm text-primary">{t('common.seeAll')}</Text>
        </TouchableOpacity>
      </View> */}

      <FlatList
        data={services || []}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{paddingHorizontal: 16}}
        scrollEnabled={false}
      />
    </View>
  );
};
