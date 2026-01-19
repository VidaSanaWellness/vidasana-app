import {Feather, Ionicons} from '@expo/vector-icons';
import {supabase} from '@/utils/supabase';
import {useQuery} from '@tanstack/react-query';
import {Link, useLocalSearchParams, useRouter} from 'expo-router';
import {ActivityIndicator, ScrollView, Text, TouchableOpacity, View} from 'react-native';
import MapView, {Marker, PROVIDER_GOOGLE} from 'react-native-maps';
import {useTranslation} from 'react-i18next';
import {SafeAreaView} from 'react-native-safe-area-context';
import {ImageCarousel} from '@/components';

export default function EventDetailsScreen() {
  const {id: idParam} = useLocalSearchParams();
  const id = Array.isArray(idParam) ? idParam[0] : idParam;
  const {back} = useRouter();
  const {t, i18n} = useTranslation();

  const {data: event, isLoading} = useQuery({
    queryKey: ['event', id, i18n.language],
    queryFn: async () => {
      // 1. Fetch Event with Translations and Tickets
      const {data, error} = await supabase
        .from('events')
        .select('*, event_translations(*), event_ticket_types(*), categories(*)')
        .eq('id', id)
        .single();

      if (error) throw error;

      // 2. Resolve Translation (Fallback Logic)
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
      };
    },
  });

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#00594f" />
      </View>
    );
  }

  if (!event) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <Text className="font-nunito text-gray-500">Event not found</Text>
      </View>
    );
  }

  const imageUrl = event.images && event.images.length > 0 ? supabase.storage.from('images').getPublicUrl(event.images[0]).data.publicUrl : null;

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Header Image Carousel */}
        <View className="relative aspect-square w-full bg-gray-200">
          <ImageCarousel images={event?.images} aspectRatio="square" />

          {/* Back Button */}
          <TouchableOpacity onPress={() => back()} className="absolute left-4 top-4 rounded-full bg-black/30 p-2 backdrop-blur-md">
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>

          {/* Edit Button */}
          <Link href={`/(provider)/events/edit/${id}`} asChild>
            <TouchableOpacity className="absolute right-4 top-4 rounded-full bg-black/30 p-2 backdrop-blur-md">
              <Feather name="edit-2" size={20} color="white" />
            </TouchableOpacity>
          </Link>
        </View>

        {/* Content */}
        <View className="p-5">
          {/* Category Badge */}
          {event.categories && (
            <View className="bg-primary/10 mb-3 self-start rounded-full px-3 py-1">
              <Text className="font-nunito-bold text-primary text-xs">{event.categories.name}</Text>
            </View>
          )}

          {/* Title */}
          <Text className="font-nunito-bold mb-2 text-2xl text-gray-900">{event.title}</Text>

          {/* Date & Time */}
          <View className="mb-6 rounded-xl bg-gray-50 p-4">
            <View className="mb-3 flex-row items-center">
              <View className="bg-primary/10 mr-3 rounded-full p-2">
                <Feather name="calendar" size={20} color="#00594f" />
              </View>
              <View>
                <Text className="font-nunito text-xs text-gray-500">{t('events.date')}</Text>
                <Text className="font-nunito-bold text-gray-900">
                  {new Date(event.start_at).toLocaleDateString(undefined, {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </Text>
              </View>
            </View>

            <View className="flex-row items-center">
              <View className="bg-primary/10 mr-3 rounded-full p-2">
                <Feather name="clock" size={20} color="#00594f" />
              </View>
              <View>
                <Text className="font-nunito text-xs text-gray-500">{t('events.time')}</Text>
                <Text className="font-nunito-bold text-gray-900">
                  {new Date(event.start_at).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})} -{' '}
                  {new Date(event.end_at).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                </Text>
              </View>
            </View>

            {event.book_till && (
              <View className="mt-3 border-t border-gray-200 pt-3">
                <Text className="font-nunito text-xs font-medium text-red-500">
                  {t('events.bookingDeadline')}: {new Date(event.book_till).toLocaleDateString()}
                </Text>
              </View>
            )}
          </View>

          {/* Description */}
          <View className="mb-6">
            <Text className="font-nunito-bold mb-2 text-lg text-gray-900">{t('events.aboutEvent')}</Text>
            <Text className="font-nunito leading-6 text-gray-600">{event.description}</Text>
          </View>

          {/* Location Map */}
          {event.lat && event.lng ? (
            <View className="mb-6">
              <Text className="font-nunito-bold mb-2 text-lg text-gray-900">{t('events.location')}</Text>
              <View className="h-48 w-full overflow-hidden rounded-xl border border-gray-200">
                <MapView
                  style={{flex: 1}}
                  provider={PROVIDER_GOOGLE}
                  initialRegion={{
                    latitude: event.lat,
                    longitude: event.lng,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                  }}
                  scrollEnabled={false}
                  zoomEnabled={false}
                  pitchEnabled={false}
                  rotateEnabled={false}>
                  <Marker coordinate={{latitude: event.lat, longitude: event.lng}} title={event.title} />
                </MapView>
              </View>
            </View>
          ) : null}

          {/* Tickets */}
          {event.event_ticket_types && event.event_ticket_types.length > 0 && (
            <View className="mb-6">
              <Text className="font-nunito-bold mb-3 text-lg text-gray-900">{t('events.tickets')}</Text>
              {event.event_ticket_types.map((ticket: any) => (
                <View key={ticket.id} className="mb-3 flex-row items-center justify-between rounded-xl border border-gray-200 p-4">
                  <View>
                    <Text className="font-nunito-bold text-gray-900">{ticket.name}</Text>
                    <Text className="font-nunito text-xs text-gray-500">Capacity: {ticket.capacity}</Text>
                  </View>
                  <Text className="font-nunito-bold text-primary text-lg">${ticket.price}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
