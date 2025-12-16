import {Feather, Ionicons} from '@expo/vector-icons';
import {supabase} from '@/utils/supabase';
import {useQuery} from '@tanstack/react-query';
import {Link, useLocalSearchParams, useRouter} from 'expo-router';
import {ActivityIndicator, Image, Text, TouchableOpacity, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useTranslation} from 'react-i18next';
import {ScrollView} from 'react-native';

export default function UserServiceDetailsScreen() {
  const {id: idParam} = useLocalSearchParams();
  const id = Array.isArray(idParam) ? idParam[0] : idParam;
  const {back} = useRouter();
  const {t, i18n} = useTranslation();

  const {data: service, isLoading} = useQuery({
    queryKey: ['service', id, i18n.language],
    queryFn: async () => {
      const {data, error} = await supabase.from('services').select(`*, service_translations(*), provider:provider(id)`).eq('id', id).single();

      if (error) throw error;

      const translation =
        data.service_translations.find((tr: any) => tr.lang_code === i18n.language) ||
        data.service_translations.find((tr: any) => tr.lang_code === 'en') ||
        data.service_translations[0];

      return {
        ...data,
        title: translation?.title || 'Untitled Service',
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

  if (!service) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <Text>Service not found</Text>
      </View>
    );
  }

  const imageUrl =
    service.images && service.images.length > 0 ? supabase.storage.from('images').getPublicUrl(service.images[0]).data.publicUrl : null;

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
          <TouchableOpacity onPress={() => back()} className="absolute left-4 top-4 rounded-full bg-black/30 p-2 backdrop-blur-md">
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View className="p-5">
          <View className="mb-2 flex-row items-center justify-between">
            <Text className="flex-1 text-2xl font-bold text-gray-900">{service.title}</Text>
            <View className="rounded-full bg-green-100 px-3 py-1">
              <Text className="font-bold text-green-700">${service.price}</Text>
            </View>
          </View>

          <View className="mb-6 flex-row items-center">
            <Feather name="clock" size={16} color="gray" />
            <Text className="ml-2 text-gray-600">
              {service.duration} min • {t('services.capacity')}: {service.capacity}
            </Text>
          </View>

          <View className="mb-6">
            <Text className="mb-2 text-lg font-bold text-gray-900">{t('services.about', 'About')}</Text>
            <Text className="leading-6 text-gray-600">{service.description}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Book Button */}
      <View className="border-t border-gray-100 p-4">
        <TouchableOpacity className="items-center rounded-xl bg-green-700 py-4 shadow-sm active:bg-green-800">
          <Text className="text-lg font-bold text-white">{t('services.bookNow', 'Book Now')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
