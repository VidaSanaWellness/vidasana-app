import React, {useState} from 'react';
import {View, Text, FlatList, TouchableOpacity, Image, ActivityIndicator} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useLocalSearchParams, useRouter} from 'expo-router';
import {Ionicons, Feather} from '@expo/vector-icons';
import {useQuery} from '@tanstack/react-query';
import {supabase} from '@/utils/supabase';
import {useTranslation} from 'react-i18next';

export default function ProviderProfileScreen() {
  const {id: idParam} = useLocalSearchParams();
  const id = Array.isArray(idParam) ? idParam[0] : idParam;
  const router = useRouter();
  const {t, i18n} = useTranslation();
  const [activeTab, setActiveTab] = useState<'services' | 'events'>('services');

  // Fetch Provider Info
  const {data: provider, isLoading: isLoadingProvider} = useQuery({
    queryKey: ['provider', id],
    queryFn: async () => {
      const {data, error} = await supabase.from('profile').select('id, name, image').eq('id', id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch Provider Services
  const {data: services, isLoading: isLoadingServices} = useQuery({
    queryKey: ['provider_services', id],
    queryFn: async () => {
      // Assuming 'provider' column in services table is the profile id.
      // Wait, in previous schema check, 'provider' in services table is a UUID referencing 'provider' table, not 'profile' table directly?
      // Let's check get_service_by_id.sql again.
      // "WHERE p.id = s.provider" and "join public.profile p on r.user_id = p.id".
      // Actually, the `services` table has a `provider` column.
      // The `get_service_by_id` RPC now joins `profile` where `pr.id = s.provider`.
      // So `services.provider` IS the profile ID.

      const {data, error} = await supabase
        .from('services')
        .select(
          `
            id, price, images, capacity, booked_count,
            service_translations (*)
        `
        )
        .eq('provider', id)
        .eq('active', true);

      if (error) throw error;

      return data.map((s: any) => {
        const tr =
          s?.service_translations?.find((t: any) => t.lang_code === i18n.language) ||
          s?.service_translations?.find((t: any) => t.lang_code === 'en') ||
          s?.service_translations?.[0];
        return {
          ...s,
          title: tr?.title || 'Untitled',
          description: tr?.description || '',
        };
      });
    },
    enabled: !!id,
  });

  // Fetch Provider Events
  const {data: events, isLoading: isLoadingEvents} = useQuery({
    queryKey: ['provider_events', id],
    queryFn: async () => {
      const {data, error} = await supabase
        .from('events')
        .select(
          `
            id, start_at, end_at, images, category,
            event_translations (*)
        `
        )
        .eq('provider', id); // Assuming events also has 'provider' column

      if (error) throw error;

      return data.map((e) => {
        const tr =
          e.event_translations.find((t: any) => t.lang_code === i18n.language) ||
          e.event_translations.find((t: any) => t.lang_code === 'en') ||
          e.event_translations[0];
        return {
          ...e,
          title: tr?.title || 'Untitled Event',
          description: tr?.description || '',
        };
      });
    },
    enabled: !!id,
  });

  const renderServiceItem = ({item}: {item: any}) => {
    const imageUrl = item.images && item.images.length > 0 ? supabase.storage.from('images').getPublicUrl(item.images[0]).data.publicUrl : null;
    return (
      <TouchableOpacity
        onPress={() => router.push(`/(user)/services/${item.id}`)}
        className="mb-4 flex-row overflow-hidden rounded-2xl bg-white shadow-sm"
        style={{shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2}}>
        <View className="aspect-square w-32 bg-gray-200">
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
            <Text numberOfLines={1} className="mb-1 font-nunito-bold text-base text-gray-900">
              {item.title}
            </Text>
            <Text numberOfLines={2} className="font-nunito text-xs text-gray-500">
              {item.description}
            </Text>
          </View>
          <View className="flex-row items-center justify-between">
            <Text className="font-nunito-bold text-primary">${item.price}</Text>
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
        <View className="aspect-square w-32 bg-gray-200">
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
            <Text numberOfLines={1} className="mb-1 font-nunito-bold text-base text-gray-900">
              {item.title}
            </Text>
            <View className="flex-row items-center">
              <Feather name="calendar" size={12} color="gray" />
              <Text className="ml-1 font-nunito text-xs text-gray-500">{date}</Text>
            </View>
          </View>
          <View className="flex-row items-center justify-between">
            <Text className="font-nunito-bold text-xs text-primary">View Details</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoadingProvider) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#00594f" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      {/* Header */}
      <View className="relative border-b border-gray-100 bg-white px-4 pb-6 pt-2">
        <TouchableOpacity onPress={() => router.back()} className="absolute left-4 top-4 z-10 p-2">
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>

        <View className="items-center">
          <View className="mb-3 h-24 w-24 overflow-hidden rounded-full border-4 border-gray-100">
            {provider?.image ? (
              <Image
                source={{uri: supabase.storage.from('avatars').getPublicUrl(provider.image).data.publicUrl}}
                className="h-full w-full"
                resizeMode="cover"
              />
            ) : (
              <View className="h-full w-full items-center justify-center bg-gray-200">
                <Feather name="user" size={40} color="gray" />
              </View>
            )}
          </View>
          <Text className="font-nunito-bold text-xl text-gray-900">{provider?.name || 'Provider'}</Text>
        </View>
      </View>

      {/* Tabs */}
      <View className="flex-row border-b border-gray-200 bg-white">
        <TouchableOpacity
          onPress={() => setActiveTab('services')}
          className={`flex-1 items-center border-b-2 py-4 ${activeTab === 'services' ? 'border-primary' : 'border-transparent'}`}>
          <Text className={`font-nunito-bold ${activeTab === 'services' ? 'text-primary' : 'text-gray-500'}`}>Services</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab('events')}
          className={`flex-1 items-center border-b-2 py-4 ${activeTab === 'events' ? 'border-primary' : 'border-transparent'}`}>
          <Text className={`font-nunito-bold ${activeTab === 'events' ? 'text-primary' : 'text-gray-500'}`}>Events</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View className="flex-1 px-4 pt-4">
        {activeTab === 'services' ? (
          isLoadingServices ? (
            <ActivityIndicator className="mt-10" color="#00594f" />
          ) : (
            <FlatList
              data={services || []}
              keyExtractor={(item) => item.id}
              renderItem={renderServiceItem}
              ListEmptyComponent={<Text className="mt-10 text-center font-nunito text-gray-500">No services found.</Text>}
              contentContainerStyle={{paddingBottom: 20}}
              showsVerticalScrollIndicator={false}
            />
          )
        ) : isLoadingEvents ? (
          <ActivityIndicator className="mt-10" color="#00594f" />
        ) : (
          <FlatList
            data={events || []}
            keyExtractor={(item) => item.id}
            renderItem={renderEventItem}
            ListEmptyComponent={<Text className="mt-10 text-center font-nunito text-gray-500">No events found.</Text>}
            contentContainerStyle={{paddingBottom: 20}}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </SafeAreaView>
  );
}
