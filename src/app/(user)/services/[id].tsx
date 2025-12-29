import {
  ActivityIndicator,
  Image,
  Text,
  TouchableOpacity,
  View,
  Platform,
  Linking,
  Modal,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
} from 'react-native';
import {AppleMaps, GoogleMaps} from 'expo-maps';
import {Feather, Ionicons} from '@expo/vector-icons';
import {SafeAreaView} from 'react-native-safe-area-context';
import {ScrollView} from 'react-native';
import {supabase} from '@/utils/supabase';
import {useLocalSearchParams, useRouter} from 'expo-router';
import {useMemo, useState} from 'react';
import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
import {useTranslation} from 'react-i18next';
import {useAppStore} from '@/store';
import Toast from 'react-native-toast-message';
import {LikeButton} from '@/components';
import {Rating} from 'react-native-ratings';

export default function UserServiceDetailsScreen() {
  const {id: idParam} = useLocalSearchParams();
  const {user} = useAppStore((s) => s.session!);
  const id = Array.isArray(idParam) ? idParam[0] : idParam;
  const {back} = useRouter();
  const {t, i18n} = useTranslation();
  const queryClient = useQueryClient();

  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [ratingInput, setRatingInput] = useState(0);
  const [commentInput, setCommentInput] = useState('');

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

  // Fetch Rating Summary
  const {data: ratingSummary} = useQuery({
    queryKey: ['service_rating_summary', id],
    queryFn: async () => {
      const {data, error} = await supabase.rpc('get_service_rating_summary', {target_service_id: id});
      if (error) throw error;
      return data && data.length > 0 ? data[0] : {avg_rating: 0, count: 0};
    },
    enabled: !!id,
  });

  // Fetch Reviews
  const {data: reviews} = useQuery({
    queryKey: ['service_reviews', id],
    queryFn: async () => {
      const {data, error} = await supabase.rpc('get_service_reviews', {target_service_id: id});
      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
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
      queryClient.invalidateQueries({queryKey: ['liked-items']});
    },
  });

  // Submit Review Mutation
  const submitReviewMutation = useMutation({
    mutationFn: async () => {
      if (ratingInput === 0) {
        throw new Error('Please select a rating (at least 1 star)');
      }
      const {error} = await supabase
        .from('service_reviews')
        .upsert({service_id: id, user_id: user.id, rating: ratingInput, comment: commentInput}, {onConflict: 'service_id, user_id'});
      if (error) throw error;
    },
    onSuccess: () => {
      setReviewModalVisible(false);
      Toast.show({type: 'success', text1: 'Review submitted'});
      queryClient.invalidateQueries({queryKey: ['service_reviews', id]});
      queryClient.invalidateQueries({queryKey: ['service_rating_summary', id]});
    },
    onError: (err: any) => {
      console.log('🚀 ~ UserServiceDetailsScreen ~ err:', err);
      Toast.show({type: 'error', text1: 'Failed to submit review', text2: err.message});
    },
  });

  const {title, description} = useMemo(() => {
    const translations = service?.translations as any[];
    const translation =
      translations?.find((tr) => tr.lang_code === i18n.language) || translations?.find((tr) => tr.lang_code === 'en') || translations?.[0];
    return {title: translation?.title, description: translation?.description};
  }, [service, i18n.language]);

  // Capacity Logic
  const availableSeats = useMemo(() => {
    if (!service || service.capacity === null) return null;
    const total = service.capacity;
    const booked = service.booked_count || 0;
    return Math.max(0, total - booked);
  }, [service]);

  const imageUrl =
    service?.images && service.images.length > 0 ? supabase.storage.from('images').getPublicUrl(service.images[0]).data.publicUrl : null;

  const MapComponent = Platform.OS === 'ios' ? AppleMaps.View : GoogleMaps.View;
  const mapMarkers =
    service?.lat && service?.lng ? [{id: service.id, title: title, coordinates: {latitude: service.lat, longitude: service.lng}}] : [];

  const isBookmarked = service?.is_bookmarked || false;

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

          {/* Like Button */}
          <View className="absolute right-4 top-4">
            <LikeButton
              isLiked={isBookmarked}
              onToggle={() => {
                if (!toggleBookmarkMutation.isPending) {
                  toggleBookmarkMutation.mutate({isBookmarked});
                }
              }}
              isLoading={toggleBookmarkMutation.isPending}
            />
          </View>
        </View>

        {/* Content */}
        <View className="p-5 pb-10">
          <View className="mb-2 flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-2xl font-bold text-gray-900">{title}</Text>
              <View className="mt-1 flex-row items-center gap-1">
                <Ionicons name="star" size={16} color="#F59E0B" />
                <Text className="font-bold text-gray-900">{ratingSummary?.avg_rating?.toFixed(1) || '0.0'}</Text>
                <Text className="text-gray-500">({ratingSummary?.count || 0} reviews)</Text>
              </View>
            </View>

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

          {/* Reviews Section */}
          <View className="mt-8">
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="text-lg font-bold text-gray-900">Reviews</Text>
              <TouchableOpacity onPress={() => setReviewModalVisible(true)}>
                <Text className="font-semibold text-green-700">Write a Review</Text>
              </TouchableOpacity>
            </View>

            {/* Review List */}
            {reviews && reviews.length > 0 ? (
              reviews.map((review) => (
                <View key={review.id} className="mb-4 rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <View className="mb-2 flex-row items-center justify-between">
                    <View className="flex-row items-center gap-2">
                      {review.user_image ? (
                        <Image
                          source={{uri: supabase.storage.from('avatars').getPublicUrl(review.user_image).data.publicUrl}}
                          className="h-8 w-8 rounded-full"
                        />
                      ) : (
                        <View className="h-8 w-8 items-center justify-center rounded-full bg-gray-300">
                          <Feather name="user" size={16} color="white" />
                        </View>
                      )}
                      <Text className="font-semibold text-gray-900">{review.user_name || 'Anonymous'}</Text>
                    </View>
                    <View className="flex-row items-center">
                      <Ionicons name="star" size={14} color="#F59E0B" />
                      <Text className="ml-1 text-xs font-bold text-gray-900">{review.rating}</Text>
                    </View>
                  </View>
                  {review.comment && <Text className="text-gray-600">{review.comment}</Text>}
                </View>
              ))
            ) : (
              <Text className="italic text-gray-500">No reviews yet. Be the first!</Text>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Book Button */}
      <View className="border-t border-gray-100 p-4">
        <TouchableOpacity className="items-center rounded-xl bg-green-700 py-4 shadow-sm active:bg-green-800">
          <Text className="text-lg font-bold text-white">{t('services.bookNow', 'Book Now')}</Text>
        </TouchableOpacity>
      </View>

      {/* Review Modal */}
      <Modal visible={reviewModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 justify-end bg-black/50">
          <View className="rounded-t-3xl bg-white p-6 pb-12">
            <View className="mb-6 flex-row items-center justify-between">
              <Text className="text-xl font-bold">Write a Review</Text>
              <TouchableOpacity onPress={() => setReviewModalVisible(false)}>
                <Feather name="x" size={24} color="black" />
              </TouchableOpacity>
            </View>

            <View className="mb-6 items-center">
              <Rating
                type="star"
                ratingCount={5}
                imageSize={40}
                startingValue={ratingInput}
                onFinishRating={setRatingInput}
                style={{paddingVertical: 10}}
              />
            </View>

            <Text className="mb-2 font-semibold text-gray-700">Comment</Text>
            <TextInput
              className="mb-6 rounded-xl border border-gray-200 bg-gray-50 p-4 text-gray-900"
              multiline
              numberOfLines={4}
              placeholder="Share your experience..."
              value={commentInput}
              onChangeText={setCommentInput}
              style={{minHeight: 100, textAlignVertical: 'top'}}
            />

            <TouchableOpacity
              onPress={() => submitReviewMutation.mutate()}
              disabled={submitReviewMutation.isPending}
              className={`items-center rounded-xl py-4 ${submitReviewMutation.isPending ? 'bg-gray-400' : 'bg-green-700'}`}>
              {submitReviewMutation.isPending ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-lg font-bold text-white">Submit Review</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
