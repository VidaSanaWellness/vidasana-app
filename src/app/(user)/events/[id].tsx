import {Feather, Ionicons} from '@expo/vector-icons';
import {supabase} from '@/utils/supabase';
import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
import {useLocalSearchParams, useRouter} from 'expo-router';
import {ActivityIndicator, Image, ScrollView, Text, TouchableOpacity, View, Platform, Linking} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useTranslation} from 'react-i18next';
import {AppleMaps, GoogleMaps} from 'expo-maps';
import {useAppStore} from '@/store';
import {LikeButton} from '@/components';

export default function UserEventDetailsScreen() {
  const {id: idParam} = useLocalSearchParams();
  const id = Array.isArray(idParam) ? idParam[0] : idParam;
  const {back} = useRouter();
  const {t, i18n} = useTranslation();
  const {user} = useAppStore((s) => s.session!);
  const queryClient = useQueryClient();
  const MapComponent = Platform.OS === 'ios' ? AppleMaps.View : GoogleMaps.View;

  const {data: event, isLoading} = useQuery({
    queryKey: ['event', id, i18n.language],
    queryFn: async () => {
      const {data, error} = await supabase
        .from('events')
        .select('*, event_translations(*), event_ticket_types(*), categories(*)')
        .eq('id', id)
        .single();

      if (error) throw error;

      // Check if liked
      const {count} = await supabase.from('event_bookmarks').select('*', {count: 'exact', head: true}).eq('event', id).eq('user', user.id);

      const translation =
        data.event_translations.find((tr: any) => tr.lang_code === i18n.language) ||
        data.event_translations.find((tr: any) => tr.lang_code === 'en') ||
        data.event_translations[0];

      return {
        ...data,
        title: translation?.title || 'Untitled Event',
        description: translation?.description || 'No description available',
        lat: (data as any).location?.coordinates ? (data as any).location.coordinates[1] : null,
        lng: (data as any).location?.coordinates ? (data as any).location.coordinates[0] : null,
        is_liked: count ? count > 0 : false,
      };
    },
  });

  const toggleLikeMutation = useMutation({
    mutationFn: async ({isLiked}: {isLiked: boolean}) => {
      if (isLiked) {
        const {error} = await supabase.from('event_bookmarks').delete().eq('event', id).eq('user', user.id);
        if (error) throw error;
      } else {
        const {error} = await supabase.from('event_bookmarks').insert({event: id, user: user.id});
        if (error) throw error;
      }
    },
    onMutate: async ({isLiked}) => {
      await queryClient.cancelQueries({queryKey: ['event', id, i18n.language]});
      const previousEvent = queryClient.getQueryData(['event', id, i18n.language]);
      queryClient.setQueryData(['event', id, i18n.language], (old: any) => ({...old, is_liked: !isLiked}));
      return {previousEvent};
    },
    onError: (err, variables, context) => {
      if (context?.previousEvent) {
        queryClient.setQueryData(['event', id, i18n.language], context.previousEvent);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({queryKey: ['event', id, i18n.language]});
    },
  });

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#15803d" />
      </View>
    );
  }

  if (!event) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <Text className="text-gray-500">Event not found</Text>
      </View>
    );
  }

  const imageUrl = event.images && event.images.length > 0 ? supabase.storage.from('images').getPublicUrl(event.images[0]).data.publicUrl : null;

  const openAddressOnMap = () => {
    if (!event.lat || !event.lng) return;
    const label = event.title;
    const url = Platform.select({ios: `maps:0,0?q=${label}@${event.lat},${event.lng}`, android: `geo:0,0?q=${event.lat},${event.lng}(${label})`});
    if (url) Linking.openURL(url);
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Header Image */}
        <View className="relative h-64 w-full bg-gray-200">
          {imageUrl ? (
            <Image source={{uri: imageUrl}} className="h-full w-full" resizeMode="cover" />
          ) : (
            <View className="h-full w-full items-center justify-center">
              <Feather name="image" size={40} color="gray" />
            </View>
          )}

          {/* Back Button */}
          <TouchableOpacity onPress={() => back()} className="absolute left-4 top-4 rounded-full bg-black/30 p-2 backdrop-blur-md">
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>

          {/* Like Button */}
          <View className="absolute right-4 top-4">
            <LikeButton
              isLiked={event?.is_liked || false}
              onToggle={() => {
                if (!toggleLikeMutation.isPending) {
                  toggleLikeMutation.mutate({isLiked: event?.is_liked || false});
                }
              }}
              isLoading={toggleLikeMutation.isPending}
            />
          </View>
        </View>

        {/* Content */}
        <View className="p-5">
          {/* Category Badge */}
          {event.categories && (
            <View className="mb-3 self-start rounded-full bg-green-100 px-3 py-1">
              <Text className="text-xs font-semibold text-green-700">{event.categories.name}</Text>
            </View>
          )}

          {/* Title */}
          <Text className="mb-2 text-2xl font-bold text-gray-900">{event.title}</Text>

          {/* Date & Time */}
          <View className="mb-6 rounded-xl bg-gray-50 p-4">
            <View className="mb-3 flex-row items-center">
              <View className="mr-3 rounded-full bg-green-100 p-2">
                <Feather name="calendar" size={20} color="#15803d" />
              </View>
              <View>
                <Text className="text-xs text-gray-500">{t('events.date')}</Text>
                <Text className="font-semibold text-gray-900">
                  {new Date(event.start_at).toLocaleDateString(undefined, {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'})}
                </Text>
              </View>
            </View>

            <View className="flex-row items-center">
              <View className="mr-3 rounded-full bg-green-100 p-2">
                <Feather name="clock" size={20} color="#15803d" />
              </View>
              <View>
                <Text className="text-xs text-gray-500">{t('events.time')}</Text>
                <Text className="font-semibold text-gray-900">
                  {new Date(event.start_at).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})} -{' '}
                  {new Date(event.end_at).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                </Text>
              </View>
            </View>

            {event.book_till && (
              <View className="mt-3 border-t border-gray-200 pt-3">
                <Text className="text-xs font-medium text-red-500">
                  {t('events.bookingDeadline')}: {new Date(event.book_till).toLocaleDateString()}
                </Text>
              </View>
            )}
          </View>

          {/* Description */}
          <View className="mb-6">
            <Text className="mb-2 text-lg font-bold text-gray-900">{t('events.aboutEvent')}</Text>
            <Text className="leading-6 text-gray-600">{event.description}</Text>
            <Text className="leading-6 text-gray-600">{event.description}</Text>
          </View>

          {/* Location Map */}
          {event.lat && event.lng ? (
            <View className="mb-6">
              <Text className="mb-2 text-lg font-bold text-gray-900">{t('events.location')}</Text>
              <View className="h-48 w-full overflow-hidden rounded-xl border border-gray-200">
                <MapComponent
                  style={{flex: 1}}
                  cameraPosition={{
                    coordinates: {latitude: event.lat, longitude: event.lng},
                    zoom: 15,
                  }}
                  markers={[
                    {
                      id: 'event-loc',
                      coordinates: {latitude: event.lat, longitude: event.lng},
                      title: event.title,
                    },
                  ]}
                  uiSettings={{
                    scrollGesturesEnabled: false,
                    zoomGesturesEnabled: false,
                    zoomControlsEnabled: false,
                    compassEnabled: false,
                    myLocationButtonEnabled: false,
                    rotationGesturesEnabled: false,
                    tiltGesturesEnabled: false,
                  }}
                />

                {/* Overlay for interaction */}
                <TouchableOpacity className="absolute bottom-0 left-0 right-0 top-0 active:bg-black/5" onPress={openAddressOnMap} />
              </View>
              <TouchableOpacity onPress={openAddressOnMap} className="mt-2 flex-row items-center">
                <Feather name="external-link" size={14} color="#15803d" />
                <Text className="ml-1 text-sm font-semibold text-green-700">Open in Maps</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Tickets */}
          {event.event_ticket_types && event.event_ticket_types.length > 0 && (
            <View className="mb-6">
              <Text className="mb-3 text-lg font-bold text-gray-900">{t('events.tickets')}</Text>
              {event.event_ticket_types.map((ticket: any) => (
                <View key={ticket.id} className="mb-3 flex-row items-center justify-between rounded-xl border border-gray-200 p-4">
                  <View>
                    <Text className="font-bold text-gray-900">{ticket.name}</Text>
                    <Text className="text-xs text-gray-500">Capacity: {ticket.capacity}</Text>
                  </View>
                  <Text className="text-lg font-bold text-green-700">${ticket.price}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Book Button (Placeholder until flow is implemented) */}
      <View className="border-t border-gray-100 p-4">
        <TouchableOpacity className="items-center rounded-xl bg-green-700 py-4 shadow-sm active:bg-green-800">
          <Text className="text-lg font-bold text-white">{t('events.bookNow')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
