import React, {useState} from 'react';
import {View, Text, FlatList, TouchableOpacity, Image, ActivityIndicator, RefreshControl} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useRouter} from 'expo-router';
import {Ionicons, Feather} from '@expo/vector-icons';
import {useQuery} from '@tanstack/react-query';
import {supabase} from '@/utils/supabase';
import {useTranslation} from 'react-i18next';
import {useAppStore} from '@/store';
import {LikeButton} from '@/components';

export default function LikedItemsScreen() {
  const router = useRouter();
  const {t, i18n} = useTranslation();
  const {user} = useAppStore((s) => s.session!);
  const [activeTab, setActiveTab] = useState<'services' | 'events'>('services');

  const {
    data: likedItems,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['liked-items', user?.id, activeTab],
    queryFn: async () => {
      if (activeTab === 'services') {
        // Fetch Service Bookmarks
        const {data: bookmarks, error} = await supabase
          .from('bookmark')
          .select(
            `
            id,
            created_at,
            service:services (
              id, price, images, capacity, 
              service_translations!service_translations_service_fkey (*)
            )
          `
          )
          .eq('user', user.id);

        if (error) {
          console.error('Error fetching service bookmarks:', error);
          throw error;
        }

        return bookmarks
          .filter((b) => b.service)
          .map((b) => {
            const s = b.service as any;
            const tr =
              s.service_translations.find((t: any) => t.lang_code === i18n.language) ||
              s.service_translations.find((t: any) => t.lang_code === 'en') ||
              s.service_translations[0];
            return {
              ...s,
              title: tr?.title || 'Untitled',
              description: tr?.description || '',
              bookmark_id: b.id,
            };
          });
      } else {
        // Fetch Event Bookmarks (Likes)
        const {data: bookmarks, error} = await supabase
          .from('event_bookmarks')
          .select(
            `
            id,
            created_at,
            event:events (
              id, start_at, end_at, images, category,
              event_translations!event_translations_event_fkey (*)
            )
          `
          )
          .eq('user', user.id);

        if (error) throw error;

        return bookmarks
          .filter((b) => b.event)
          .map((b) => {
            const e = b.event as any;
            const tr =
              e.event_translations.find((t: any) => t.lang_code === i18n.language) ||
              e.event_translations.find((t: any) => t.lang_code === 'en') ||
              e.event_translations[0];
            return {
              ...e,
              title: tr?.title || 'Untitled Event',
              description: tr?.description || '',
              bookmark_id: b.id,
            };
          });
      }
    },
    enabled: !!user?.id,
  });

  const renderServiceItem = ({item}: {item: any}) => {
    const imageUrl = item.images && item.images.length > 0 ? supabase.storage.from('images').getPublicUrl(item.images[0]).data.publicUrl : null;

    return (
      <TouchableOpacity
        onPress={() => router.push(`/(user)/services/${item.id}`)}
        className="mb-4 flex-row overflow-hidden rounded-2xl bg-white shadow-sm"
        style={{shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2}}>
        <View className="h-32 w-32 bg-gray-200">
          {imageUrl ? (
            <Image source={{uri: imageUrl}} className="h-full w-full" resizeMode="cover" />
          ) : (
            <View className="h-full w-full items-center justify-center">
              <Feather name="image" size={24} color="gray" />
            </View>
          )}
        </View>
        <View className="flex-1 justify-between p-3">
          <View>
            <Text numberOfLines={1} className="mb-1 text-base font-bold text-gray-900">
              {item.title}
            </Text>
            <Text numberOfLines={2} className="text-xs text-gray-500">
              {item.description}
            </Text>
          </View>
          <View className="flex-row items-center justify-between">
            <Text className="font-bold text-green-700">${item.price}</Text>
            {/* We don't render LikeButton here to avoid complex list state mgmt for now, just list them */}
            <Ionicons name="heart" size={20} color="#ef4444" />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEventItem = ({item}: {item: any}) => {
    const imageUrl = item.images && item.images.length > 0 ? supabase.storage.from('images').getPublicUrl(item.images[0]).data.publicUrl : null;

    const date = new Date(item.start_at).toLocaleDateString();

    return (
      <TouchableOpacity
        onPress={() => router.push(`/(user)/events/${item.id}`)}
        className="mb-4 flex-row overflow-hidden rounded-2xl bg-white shadow-sm"
        style={{shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2}}>
        <View className="h-32 w-32 bg-gray-200">
          {imageUrl ? (
            <Image source={{uri: imageUrl}} className="h-full w-full" resizeMode="cover" />
          ) : (
            <View className="h-full w-full items-center justify-center">
              <Feather name="image" size={24} color="gray" />
            </View>
          )}
        </View>
        <View className="flex-1 justify-between p-3">
          <View>
            <Text numberOfLines={1} className="mb-1 text-base font-bold text-gray-900">
              {item.title}
            </Text>
            <View className="flex-row items-center">
              <Feather name="calendar" size={12} color="gray" />
              <Text className="ml-1 text-xs text-gray-500">{date}</Text>
            </View>
          </View>
          <View className="flex-row items-center justify-between">
            <Text className="text-xs font-medium text-green-700">View Details</Text>
            <Ionicons name="heart" size={20} color="#ef4444" />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50 from-white to-gray-50" edges={['top']}>
      {/* Header */}
      <View className="relative flex-row items-center justify-center border-b border-gray-100 bg-white px-4 py-4">
        <TouchableOpacity onPress={() => router.back()} className="absolute left-4 z-10 rounded-full bg-gray-100 p-2">
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-gray-900">Liked Items</Text>
      </View>

      {/* Tabs */}
      <View className="flex-row p-4">
        <TouchableOpacity
          onPress={() => setActiveTab('services')}
          className={`mr-3 flex-1 items-center justify-center rounded-xl py-3 ${activeTab === 'services' ? 'bg-green-700' : 'bg-white'}`}
          style={activeTab !== 'services' && {borderWidth: 1, borderColor: '#E5E7EB'}}>
          <Text className={`font-semibold ${activeTab === 'services' ? 'text-white' : 'text-gray-600'}`}>Services</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab('events')}
          className={`flex-1 items-center justify-center rounded-xl py-3 ${activeTab === 'events' ? 'bg-green-700' : 'bg-white'}`}
          style={activeTab !== 'events' && {borderWidth: 1, borderColor: '#E5E7EB'}}>
          <Text className={`font-semibold ${activeTab === 'events' ? 'text-white' : 'text-gray-600'}`}>Events</Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      <View className="flex-1 px-4">
        {isLoading ? (
          <View className="mt-10 items-center">
            <ActivityIndicator size="large" color="#15803d" />
          </View>
        ) : (
          <FlatList
            data={likedItems || []}
            keyExtractor={(item) => item.id}
            renderItem={activeTab === 'services' ? renderServiceItem : renderEventItem}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{paddingBottom: 40}}
            ListEmptyComponent={
              <View className="mt-20 items-center justify-center">
                <View className="mb-4 h-24 w-24 items-center justify-center rounded-full bg-gray-100">
                  <Ionicons name="heart-outline" size={40} color="#D1D5DB" />
                </View>
                <Text className="text-lg font-bold text-gray-900">No liked {activeTab}</Text>
                <Text className="mt-2 text-center text-gray-500">Items you like will appear here.</Text>
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}
