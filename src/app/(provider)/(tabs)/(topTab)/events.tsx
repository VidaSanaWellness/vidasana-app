import {Link} from 'expo-router';
import {supabase} from '@/utils/supabase';
import {Feather} from '@expo/vector-icons';
import {useQuery} from '@tanstack/react-query';
import {ActivityIndicator, FlatList, Pressable, RefreshControl, View} from 'react-native';
import {useAppStore} from '@/store';
import {useTranslation} from 'react-i18next';
import {H3, Body, EventCard} from '@/components';

export default function EventsScreen() {
  const {t, i18n} = useTranslation();
  const {
    data: events,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['events', i18n.language],
    queryFn: async () => {
      const {user} = useAppStore.getState().session!;
      if (!user) throw new Error('Not authenticated');

      const {data, error} = await supabase
        .from('events')
        .select('*, event_translations(*)')
        .eq('provider', user.id)
        .eq('delete', false)
        .order('created_at', {ascending: false});

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
    return (
      <EventCard
        id={item.id}
        title={item.title}
        description={item.description}
        price={null} // Events price logic might vary, passing null or item.price if available
        images={item.images}
        startAt={item.start_at}
        variant="provider"
        rating={item.rating || 0}
      />
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
                <H3 className="mb-2 text-lg text-gray-900">{t('events.noEvents')}</H3>
                <Body className="mb-6 text-center text-gray-500">{t('events.noEventsSubtitle')}</Body>
              </View>
            )}
          />
        )}
      </View>

      {/* FAB */}
      <Link href="/(provider)/events/create" asChild>
        <Pressable className="absolute bottom-6 h-14 w-14 items-center justify-center self-center rounded-full bg-green-700 shadow-lg">
          <Feather name="plus" size={30} color="white" />
        </Pressable>
      </Link>
    </View>
  );
}
