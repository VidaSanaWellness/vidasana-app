import {Link} from 'expo-router';
import {supabase} from '@/utils/supabase';
import {Feather} from '@expo/vector-icons';
import {useQuery} from '@tanstack/react-query';
import {ActivityIndicator, FlatList, Image, Pressable, RefreshControl, Text, View} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useAppStore} from '@/store';

export default function ServicesScreen() {
  const {t, i18n} = useTranslation();
  const {user} = useAppStore((s) => s.session!);

  const {
    data: services,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['services', i18n.language],
    queryFn: async () => {
      const {data, error} = await supabase
        .from('services')
        .select('*, service_translations(*)')
        .eq('provider', user.id)
        .order('created_at', {ascending: false});

      if (error) throw error;

      return data.map((service) => {
        const translation =
          service.service_translations.find((t: any) => t.lang_code === i18n.language) ||
          service.service_translations.find((t: any) => t.lang_code === 'en') ||
          service.service_translations[0];

        return {
          ...service,
          title: translation?.title || 'Untitled Service',
          description: translation?.description || 'No description available',
        };
      });
    },
  });

  const renderItem = ({item}: {item: any}) => {
    // Get first image or placeholder
    const imageUrl = item.images && item.images.length > 0 ? supabase.storage.from('images').getPublicUrl(item.images[0]).data.publicUrl : null;

    return (
      <Link href={`/(provider)/services/${item.id}`} asChild>
        <Pressable className={`mb-4 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm ${!item.active ? 'opacity-50' : ''}`}>
          <View className="flex-row">
            {/* Image (Left Side) */}
            <View className="aspect-square w-32 bg-gray-200">
              {imageUrl ? (
                <Image source={{uri: imageUrl}} className="h-full w-full" resizeMode="cover" />
              ) : (
                <View className="h-full w-full items-center justify-center">
                  <Feather name="image" size={24} color="#9CA3AF" />
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
                  <Text className="text-sm font-semibold text-green-700">${item.price}</Text>
                </View>
                <Text className="mb-2 text-xs text-gray-500" numberOfLines={2}>
                  {item.description}
                </Text>
              </View>

              <View>
                {/* Time */}
                <View className="mb-1 flex-row items-center">
                  <Feather name="clock" size={12} color="#6B7280" />
                  <Text className="ml-1 text-xs text-gray-600">
                    {item.start_at?.slice(0, 5)} - {item.end_at?.slice(0, 5)}
                  </Text>
                </View>

                {/* Weekdays - Simple pills */}
                <View className="flex-row flex-wrap gap-1">
                  {['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((day) => {
                    const isActive = item.week_day.includes(day);
                    if (!isActive) return null;
                    return (
                      <View key={day} className="h-5 items-center justify-center rounded-full bg-green-100 px-2">
                        <Text className="text-[10px] font-bold uppercase text-green-800">{day.slice(0, 1)}</Text>
                      </View>
                    );
                  })}
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
            data={services}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{paddingBottom: 100}}
            refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
            ListEmptyComponent={() => (
              <View className="mt-20 items-center justify-center">
                <View className="mb-4 h-24 w-24 items-center justify-center rounded-full bg-gray-50">
                  <Feather name="briefcase" size={40} color="#D1D5DB" />
                </View>
                <Text className="mb-2 text-lg font-bold text-gray-900">{t('services.noServices')}</Text>
                <Text className="mb-6 text-center text-gray-500">{t('services.noServicesSubtitle')}</Text>
              </View>
            )}
          />
        )}
      </View>

      {/* FAB */}
      <Link href="/(provider)/services/create" asChild>
        <Pressable className="absolute bottom-6 h-14 w-14 items-center justify-center self-center rounded-full bg-green-700 shadow-lg">
          <Feather name="plus" size={30} color="white" />
        </Pressable>
      </Link>
    </View>
  );
}
