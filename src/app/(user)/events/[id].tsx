import {Feather, Ionicons} from '@expo/vector-icons';
import {supabase} from '@/utils/supabase';
import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
import {useLocalSearchParams, useRouter} from 'expo-router';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  Platform,
  Linking,
  RefreshControl,
  Modal,
  TextInput,
  KeyboardAvoidingView,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useTranslation} from 'react-i18next';
import MapView, {Marker, PROVIDER_GOOGLE} from 'react-native-maps';
import {useAppStore} from '@/store';
import {LikeButton, ImageCarousel} from '@/components';
import {Rating} from 'react-native-ratings';
import Toast from 'react-native-toast-message';
import {useState} from 'react';

export default function UserEventDetailsScreen() {
  const {id: idParam} = useLocalSearchParams();
  const id = Array.isArray(idParam) ? idParam[0] : idParam;
  const {back} = useRouter();
  const {t, i18n} = useTranslation();
  const {user} = useAppStore((s) => s.session!);
  const queryClient = useQueryClient();

  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [ratingInput, setRatingInput] = useState(0);
  const [commentInput, setCommentInput] = useState('');

  const {
    data: event,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
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

  // Fetch Rating Summary
  const {data: ratingSummary} = useQuery({
    queryKey: ['event_rating_summary', id],
    queryFn: async () => {
      const {data, error} = await supabase.rpc('get_event_rating_summary', {target_event_id: id});
      if (error) throw error;
      return data && data.length > 0 ? data[0] : {avg_rating: 0, count: 0};
    },
    enabled: !!id,
  });

  // Fetch Reviews
  const {data: reviews} = useQuery({
    queryKey: ['event_reviews', id],
    queryFn: async () => {
      const {data, error} = await supabase.rpc('get_event_reviews', {target_event_id: id});
      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
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
        .from('event_reviews')
        .upsert({event_id: id, user_id: user.id, rating: ratingInput, comment: commentInput}, {onConflict: 'event_id, user_id'});
      if (error) throw error;
    },
    onSuccess: () => {
      setReviewModalVisible(false);
      Toast.show({type: 'success', text1: 'Review submitted'});
      queryClient.invalidateQueries({queryKey: ['event_reviews', id]});
      queryClient.invalidateQueries({queryKey: ['event_rating_summary', id]});
    },
    onError: (err: any) => {
      console.log('🚀 ~ UserEventDetailsScreen ~ err:', err);
      Toast.show({type: 'error', text1: 'Failed to submit review', text2: err.message});
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
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#15803d" />}>
        {/* Header Image Carousel */}
        <View className="relative aspect-square w-full bg-gray-200">
          <ImageCarousel images={event?.images} aspectRatio="square" />

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
        <View className="p-5 pb-10">
          {/* Title & Rating */}
          <View className="mb-4">
            {event.categories && (
              <View className="mb-2 self-start rounded-full bg-green-100 px-3 py-1">
                <Text className="text-xs font-semibold text-green-700">{event.categories.name}</Text>
              </View>
            )}
            <Text className="mb-1 text-2xl font-bold text-gray-900">{event.title}</Text>

            <View className="flex-row items-center gap-1">
              <Ionicons name="star" size={16} color="#F59E0B" />
              <Text className="font-bold text-gray-900">{ratingSummary?.avg_rating?.toFixed(1) || '0.0'}</Text>
              <Text className="text-gray-500">({ratingSummary?.count || 0} reviews)</Text>
            </View>
          </View>

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
          </View>

          {/* Location Map */}
          {event.lat && event.lng ? (
            <View className="mb-6">
              <Text className="mb-2 text-lg font-bold text-gray-900">{t('events.location')}</Text>
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

          {/* Reviews Section */}
          <View className="mt-4">
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

      {/* Book Button (Placeholder until flow is implemented) */}
      <View className="border-t border-gray-100 p-4">
        <TouchableOpacity className="items-center rounded-xl bg-green-700 py-4 shadow-sm active:bg-green-800">
          <Text className="text-lg font-bold text-white">{t('events.bookNow')}</Text>
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
