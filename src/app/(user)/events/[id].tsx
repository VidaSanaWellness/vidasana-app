import {Feather, Ionicons} from '@expo/vector-icons';
import {supabase} from '@/utils/supabase';
import {useQuery} from '@tanstack/react-query';
import {Link, useLocalSearchParams, useRouter} from 'expo-router';
import {ActivityIndicator, Image, ScrollView, Text, TouchableOpacity, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useTranslation} from 'react-i18next';

export default function UserEventDetailsScreen() {
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
      };
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
                <Text className="text-xs text-gray-500">{t('events.date', 'Date')}</Text>
                <Text className="font-semibold text-gray-900">
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
              <View className="mr-3 rounded-full bg-green-100 p-2">
                <Feather name="clock" size={20} color="#15803d" />
              </View>
              <View>
                <Text className="text-xs text-gray-500">{t('events.time', 'Time')}</Text>
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
            <Text className="mb-2 text-lg font-bold text-gray-900">{t('events.aboutEvent', 'About Event')}</Text>
            <Text className="leading-6 text-gray-600">{event.description}</Text>
          </View>

          {/* Tickets */}
          {event.event_ticket_types && event.event_ticket_types.length > 0 && (
            <View className="mb-6">
              <Text className="mb-3 text-lg font-bold text-gray-900">{t('events.tickets', 'Tickets')}</Text>
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
          <Text className="text-lg font-bold text-white">{t('events.bookNow', 'Book Tickets')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
