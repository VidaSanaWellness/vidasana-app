import {Link} from 'expo-router';
import {supabase} from '@/utils/supabase';
import {Feather} from '@expo/vector-icons';
import {useQuery} from '@tanstack/react-query';
import {ActivityIndicator, FlatList, Image, Pressable, RefreshControl, Text, View} from 'react-native';
import {useTranslation} from 'react-i18next';

export default function UserServicesScreen() {
  const {t, i18n} = useTranslation();

  const {
    data: services,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['user_services', i18n.language],
    queryFn: async () => {
      // Fetch ALL active services
      const {data, error} = await supabase
        .from('services')
        .select(
          `*, 
           service_translations(*),
           provider:provider(id)`
        ) // Just to have provider info if needed
        .eq('active', true) // Filter by active only
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
    const imageUrl = item.images && item.images.length > 0 ? supabase.storage.from('images').getPublicUrl(item.images[0]).data.publicUrl : null;

    return (
      <Link href={`/(user)/services/${item.id}`} asChild>
        <Pressable className="mb-4 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <View className="flex-row">
            <View className="h-32 w-32 bg-gray-200">
              {imageUrl ? (
                <Image source={{uri: imageUrl}} className="h-full w-full" resizeMode="cover" />
              ) : (
                <View className="h-full w-full items-center justify-center">
                  <Feather name="image" size={24} color="#9CA3AF" />
                </View>
              )}
            </View>

            <View className="flex-1 justify-between p-3">
              <View>
                <View className="mb-1 flex-row items-start justify-between">
                  <Text className="flex-1 text-lg font-bold text-gray-900" numberOfLines={1}>
                    {item.title}
                  </Text>
                  {item.price && <Text className="text-sm font-semibold text-green-700">${item.price}</Text>}
                </View>
                <Text className="mb-2 text-xs text-gray-500" numberOfLines={2}>
                  {item.description}
                </Text>
              </View>

              <View className="flex-row items-center">
                <Feather name="clock" size={12} color="gray" />
                <Text className="ml-1 text-xs text-gray-500">{t('services.viewDetails', 'View Details')}</Text>
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
                  <Feather name="search" size={40} color="#D1D5DB" />
                </View>
                <Text className="text-lg font-bold text-gray-900">{t('services.noServices', 'No services found')}</Text>
              </View>
            )}
          />
        )}
      </View>
    </View>
  );
}
