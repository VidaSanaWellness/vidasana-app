import {ActivityIndicator, Image, Text, TouchableOpacity, View, Platform, Linking} from 'react-native';
import {AppleMaps, GoogleMaps} from 'expo-maps';
import {Feather, Ionicons} from '@expo/vector-icons';
import {SafeAreaView} from 'react-native-safe-area-context';
import {ScrollView} from 'react-native';
import {supabase} from '@/utils/supabase';
import {useLocalSearchParams, useRouter} from 'expo-router';
import {useMemo} from 'react';
import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
import {useTranslation} from 'react-i18next';
import {useAppStore} from '@/store';
import Toast from 'react-native-toast-message';

export default function UserServiceDetailsScreen() {
  const {id: idParam} = useLocalSearchParams();
  const {user} = useAppStore((s) => s.session!);
  const id = Array.isArray(idParam) ? idParam[0] : idParam;
  const {back} = useRouter();
  const {t, i18n} = useTranslation();
  const queryClient = useQueryClient();

  const {
    data: service,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['service', id],
    queryFn: async () => {
      const {data, error} = await supabase.rpc('get_service_by_id', {target_id: id});
      if (error) throw error;
      return data && data.length > 0 ? data[0] : null;
    },
  });

  const toggleBookmarkMutation = useMutation({
    mutationFn: async ({isBookmarked}: {isBookmarked: boolean}) => {
      if (isBookmarked) {
        const {error} = await supabase.from('bookmark').delete().eq('service', id).eq('user', user.id);
        if (error) throw error;
      } else {
        const {error} = await supabase.from('bookmark').insert({service: id, user: user.id});
        if (error) throw error;
      }
    },
    onMutate: async ({isBookmarked}) => {
      await queryClient.cancelQueries({queryKey: ['service', id]});
      const previousService = queryClient.getQueryData(['service', id]);
      queryClient.setQueryData(['service', id], (old: any) => ({...old, is_bookmarked: !isBookmarked}));
      return {previousService};
    },
    onError: (err, newTodo, context) => {
      if (context?.previousService) {
        queryClient.setQueryData(['service', id], context.previousService);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({queryKey: ['service', id]});
    },
  });

  const {title, description} = useMemo(() => {
    if (!service || !service.translations) return {title: service?.title || '', description: service?.description || ''};

    const translations = service.translations as any[];
    const translation =
      translations.find((tr) => tr.lang_code === i18n.language) || translations.find((tr) => tr.lang_code === 'en') || translations[0];

    return {
      title: translation?.title || 'Untitled Service',
      description: translation?.description || 'No description available',
    };
  }, [service, i18n.language]);

  // Capacity Logic
  const availableSeats = useMemo(() => {
    if (!service || service.capacity === null) return null;
    const total = service.capacity;
    const booked = service.booked_count || 0;
    return Math.max(0, total - booked);
  }, [service]);

  const imageUrl =
    service.images && service.images.length > 0 ? supabase.storage.from('images').getPublicUrl(service.images[0]).data.publicUrl : null;

  const MapComponent = Platform.OS === 'ios' ? AppleMaps.View : GoogleMaps.View;
  const mapMarkers = service.lat && service.lng ? [{id: service.id, title: title, coordinates: {latitude: service.lat, longitude: service.lng}}] : [];

  const isBookmarked = service.is_bookmarked || false;

  const openAddressOnMap = (lat: number, lng: number, label: string) => {
    const scheme = Platform.select({ios: 'maps:0,0?q=', android: 'geo:0,0?q='});
    const latLng = `${lat},${lng}`;
    const url = Platform.select({ios: `${scheme}${label}@${latLng}`, android: `${scheme}${latLng}(${label})`});
    if (url) Linking.openURL(url).catch((err) => Toast.show({type: 'error', text1: 'Error opening map', text2: err.message}));
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#15803d" />
      </View>
    );
  }

  if (!service || error) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <Text className="text-center text-gray-500">Service not found or an error occurred.</Text>
        <Text className="mt-2 text-center text-xs text-gray-400">{(error as any)?.message || 'Please check the service ID or try again.'}</Text>
        <TouchableOpacity onPress={() => back()} className="mt-4 rounded-full bg-gray-100 px-6 py-3">
          <Text>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

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

          {/* Bookmark Button (New Option A: Right Header) */}
          <TouchableOpacity
            onPress={() => {
              if (!toggleBookmarkMutation.isPending) {
                toggleBookmarkMutation.mutate({isBookmarked});
              }
            }}
            className="absolute right-4 top-4 rounded-full bg-black/30 p-2 backdrop-blur-md">
            <Ionicons name={isBookmarked ? 'bookmark' : 'bookmark-outline'} size={24} color={isBookmarked ? '#22c55e' : 'white'} />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View className="p-5 pb-10">
          <View className="mb-2 flex-row items-center justify-between">
            <Text className="flex-1 text-2xl font-bold text-gray-900">{title}</Text>
            {service.price !== null && (
              <View className="rounded-full bg-green-100 px-3 py-1">
                <Text className="font-bold text-green-700">${service.price}</Text>
              </View>
            )}
          </View>

          <View className="mb-6 flex-row items-center">
            <Feather name="clock" size={16} color="gray" />
            <Text className="ml-2 text-gray-600">
              {t('services.capacity')}: {availableSeats !== null ? `${availableSeats}/${service.capacity}` : service.capacity}
            </Text>
          </View>

          <View className="mb-6">
            <Text className="mb-2 text-lg font-bold text-gray-900">{t('services.about', 'About')}</Text>
            <Text className="leading-6 text-gray-600">{description}</Text>
          </View>

          {/* Map Box */}
          {service.lat && service.lng ? (
            <View className="mt-4">
              <Text className="mb-3 text-lg font-bold text-gray-900">Location</Text>
              <View className="relative h-48 w-full overflow-hidden rounded-2xl border border-gray-100">
                <MapComponent
                  style={{flex: 1}}
                  cameraPosition={{zoom: 15, coordinates: {latitude: service.lat, longitude: service.lng}}}
                  markers={mapMarkers}
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

                <TouchableOpacity
                  activeOpacity={0.8}
                  className="absolute bottom-0 left-0 right-0 top-0"
                  onPress={() => openAddressOnMap(service.lat, service.lng, title)}
                />
              </View>
            </View>
          ) : null}
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
