import {Link} from 'expo-router';
import {supabase} from '@/utils/supabase';
import {Feather} from '@expo/vector-icons';
import {useQuery} from '@tanstack/react-query';
import {ActivityIndicator, FlatList, Image, Pressable, RefreshControl, Text, View} from 'react-native';
import {useTranslation} from 'react-i18next';

export default function UserEventsScreen() {
  const {t, i18n} = useTranslation();
  const {
    data: events,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['user_events', i18n.language],
    queryFn: async () => {
      // Fetch ALL events (optionally filter by date > now?)
      const {data, error} = await supabase
        .from('events')
        .select('*, event_translations(*)')
        // .gt('start_at', new Date().toISOString()) // Optional: Only future events
        .order('start_at', {ascending: true}); // Sort by start date

      if (error) throw error;

      return data.map((event) => {
        const translation =
          event.event_translations.find((t: any) => t.lang_code === i18n.language) ||
          event.event_translations.find((t: any) => t.lang_code === 'en') ||
          event.event_translations[0];

        return {
          ...event,
          title: translation?.title || 'Untitled Event',
          description: translation?.description || 'No description available',
        };
      });
    },
  });

  const renderItem = ({item}: {item: any}) => {
    // Get first image or placeholder
    const imageUrl = item.images && item.images.length > 0 ? supabase.storage.from('images').getPublicUrl(item.images[0]).data.publicUrl : null;

    return (
      <Link href={`/(user)/events/${item.id}`} asChild>
        <Pressable className="mb-4 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <View className="flex-row">
            {/* Image (Left Side) - Keeping consistent 32x32 size */}
            <View className="h-32 w-32 bg-gray-200">
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

  return (
    <View className="flex-1 bg-white">
      <View className="flex-1 px-4 pt-2">
        {isLoading ? (
          <ActivityIndicator size="large" color="#15803d" className="mt-10" />
        ) : (
          <FlatList
            data={events}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{paddingBottom: 100}}
            refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
            ListEmptyComponent={() => (
              <View className="mt-20 items-center justify-center">
                <View className="mb-4 h-24 w-24 items-center justify-center rounded-full bg-gray-50">
                  <Feather name="calendar" size={40} color="#D1D5DB" />
                </View>
                <Text className="mb-2 text-lg font-bold text-gray-900">{t('events.noEvents')}</Text>
                <Text className="mb-6 text-center text-gray-500">{t('events.noEventsSubtitle')}</Text>
              </View>
            )}
          />
        )}
      </View>
    </View>
  );
}
