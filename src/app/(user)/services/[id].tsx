import {ActivityIndicator, Image, Text, TouchableOpacity, View, Platform, Linking, Modal, TextInput, KeyboardAvoidingView,ScrollView} from 'react-native';
import MapView, {Marker, PROVIDER_GOOGLE} from 'react-native-maps';
import {Feather, Ionicons} from '@expo/vector-icons';
import {SafeAreaView} from 'react-native-safe-area-context';
import {supabase} from '@/utils/supabase';
import {Link, useLocalSearchParams, useRouter} from 'expo-router';
import {useState} from 'react';
import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
import {useTranslation} from 'react-i18next';
import {useAppStore} from '@/store';
import Toast from 'react-native-toast-message';
import {Avatar, LikeButton, ImageCarousel} from '@/components';
import {Rating} from 'react-native-ratings';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import {stripe} from '@/utils/stripe';
import {useStripe} from '@stripe/stripe-react-native';

export default function UserServiceDetailsScreen() {
  const {id: idParam} = useLocalSearchParams();
  const {user} = useAppStore((s) => s.session!);
  const id = Array.isArray(idParam) ? idParam[0] : idParam;
  const {back} = useRouter();
  const {t, i18n} = useTranslation();
  const queryClient = useQueryClient();
  const {initPaymentSheet, presentPaymentSheet} = useStripe();

  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [ratingInput, setRatingInput] = useState(0);
  const [commentInput, setCommentInput] = useState('');
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);
  const [isBookingLoading, setBookingLoading] = useState(false);

  const handleBooking = async (date: Date) => {
    setDatePickerVisible(false);
    setBookingLoading(true);
    try {
      // 0. Validate Week Day
      const weekDays = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
      const selectedDayIndex = date.getDay();
      const selectedDay = weekDays[selectedDayIndex];

      if (service?.week_day && !service.week_day.includes(selectedDay as any)) {
        Toast.show({
          type: 'error',
          text1: 'Unavailable on this day',
          text2: `Available days: ${service.week_day.map((d: string) => d.toUpperCase()).join(', ')}`,
        });
        setBookingLoading(false);
        return;
      }

      // 1. Fetch Payment Intent & Keys (Production)
      const {paymentIntent, ephemeralKey, customer} = await stripe.fetchPaymentSheetParams({serviceId: id});

      // 2. Initialize Payment Sheet
      const {error: initError} = await initPaymentSheet({
        customerId: customer,
        merchantDisplayName: 'VidaSana Wellness',
        paymentIntentClientSecret: paymentIntent,
        customerEphemeralKeySecret: ephemeralKey,
        defaultBillingDetails: {email: user.email, name: user.user_metadata?.full_name || 'User'},
      });

      if (initError) {
        console.error(initError);
        Toast.show({type: 'error', text1: 'Payment Init Failed', text2: initError.message});
        setBookingLoading(false);
        return;
      }

      // 3. Present Payment Sheet
      const {error: presentError} = await presentPaymentSheet();

      if (presentError) {
        if (presentError.code === 'Canceled') {
          // User canceled, no error toast needed usually, or maybe a info one
          console.log('Payment canceled');
        } else {
          Toast.show({type: 'error', text1: 'Payment Failed', text2: presentError.message});
        }
      } else {
        // Success

        // 4a. Create Payment Record (to get a valid UUID)
        const {data: paymentData, error: paymentError} = await supabase
          .from('payments')
          .insert({currency: 'usd', status: 'succeeded', amount: service?.price || 0})
          .select()
          .single();

        if (paymentError) {
          console.error('Payment record creation failed:', paymentError);
          return Toast.show({type: 'error', text1: 'Database Error', text2: 'Could not record payment'});
        }

        // 4b. Create Booking Record linked to Payment
        const {error: bookingError} = await supabase.from('services_booking').insert({
          service: id,
          status: 'booked',
          price: service?.price || 0,
          payment_id: paymentData.id,
          appointed: date.toISOString(),
        });

        if (bookingError) {
          console.error('Booking creation failed:', bookingError);
          console.log('Stripe Payment Intent:', paymentIntent); // fallback log
          Toast.show({text2: 'Please contact support with ID: ' + paymentIntent});
        } else {
          Toast.show({type: 'success', text1: 'Booking Confirmed!', text2: 'Payment successful'});
          // Navigate to bookings or success screen
          // router.replace('/(user)/bookings'); // Example navigation
        }
      }
    } catch (error: any) {
      console.error(error);
      Toast.show({type: 'error', text1: 'Error', text2: error.message});
    } finally {
      setBookingLoading(false);
    }
  };

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

  const {title, description} = (() => {
    const translations = service?.translations as any[];
    const translation =
      translations?.find((tr) => tr.lang_code === i18n.language) || translations?.find((tr) => tr.lang_code === 'en') || translations?.[0];
    return {title: translation?.title, description: translation?.description};
  })();

  // Capacity Logic
  const availableSeats = (() => {
    if (!service || service.capacity === null) return null;
    const total = service.capacity;
    const booked = service.booked_count || 0;
    return Math.max(0, total - booked);
  })();

  // Format Available Days
  const availableDaysText = (() => {
    if (!service || !service.week_day) return 'All Days';
    if (service.week_day.length === 7) return 'Every Day';

    const orderedDays = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    // Sort days
    const sortedDays = service.week_day.sort((a: string, b: string) => orderedDays.indexOf(a) - orderedDays.indexOf(b));

    return sortedDays.map((d: string) => d.charAt(0).toUpperCase() + d.slice(1)).join(', ');
  })();

  const imageUrl =
    service?.images && service.images.length > 0 ? supabase.storage.from('images').getPublicUrl(service.images[0]).data.publicUrl : null;

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
        {/* Header Image Carousel */}
        <View className="relative aspect-square w-full bg-gray-200">
          <ImageCarousel images={service?.images} aspectRatio="square" />

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
            <View className="flex-1 pr-4">
              <View className="flex-row items-center">
                {/* Provider Image - Clickable */}

                <Link href={`/(user)/provider/${(service.provider as any).id}`}>
                  <Avatar size={52} name="Test" className="h-full w-full" uri={''} />
                </Link>

                <View className="ml-3 flex-1">
                  <Text className="font-nunito-bold text-2xl text-gray-900">{title}</Text>
                  <View className="mt-1 flex-row items-center gap-1">
                    <Ionicons name="star" size={16} color="#F59E0B" />
                    <Text className="font-nunito-bold text-gray-900">{ratingSummary?.avg_rating?.toFixed(1) || '0.0'}</Text>
                    <Text className="font-nunito text-gray-500">({ratingSummary?.count || 0} reviews)</Text>
                  </View>
                </View>
              </View>
            </View>

            {service.price !== null && (
              <View className="rounded-full bg-primary/10 px-3 py-1">
                <Text className="font-nunito-bold text-primary">${service.price}</Text>
              </View>
            )}
          </View>

          <View className="mb-6 flex-row items-center">
            <Feather name="clock" size={16} color="gray" />
            <Text className="ml-2 font-nunito text-gray-600">
              {t('services.capacity')}: {availableSeats !== null ? `${availableSeats}/${service.capacity}` : service.capacity}
            </Text>
          </View>

          {/* Available Days */}
          <View className="mb-6 flex-row items-center">
            <Ionicons name="calendar-outline" size={16} color="gray" />
            <Text className="ml-2 text-gray-600">{availableDaysText}</Text>
          </View>

          <View className="mb-6">
            <Text className="mb-2 font-nunito-bold text-lg text-gray-900">{t('services.about', 'About')}</Text>
            <Text className="font-nunito leading-6 text-gray-600">{description}</Text>
          </View>

          {/* Map Box */}
          {service.lat && service.lng ? (
            <View className="mt-4">
              <Text className="mb-3 font-nunito-bold text-lg text-gray-900">Location</Text>
              <View className="relative h-48 w-full overflow-hidden rounded-2xl border border-gray-100">
                <MapView
                  provider={PROVIDER_GOOGLE}
                  style={{flex: 1}}
                  initialRegion={{
                    latitude: service.lat,
                    longitude: service.lng,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                  }}
                  scrollEnabled={false}
                  zoomEnabled={false}
                  pitchEnabled={false}
                  rotateEnabled={false}>
                  <Marker coordinate={{latitude: service.lat, longitude: service.lng}} title={title} pinColor="#00594f" />
                </MapView>

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
              <Text className="font-nunito-bold text-lg text-gray-900">Reviews</Text>
              <TouchableOpacity onPress={() => setReviewModalVisible(true)}>
                <Text className="font-nunito-bold text-primary">Write a Review</Text>
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
                      <Text className="font-nunito-bold text-gray-900">{review.user_name || 'Anonymous'}</Text>
                    </View>
                    <View className="flex-row items-center">
                      <Ionicons name="star" size={14} color="#F59E0B" />
                      <Text className="ml-1 text-xs font-bold text-gray-900">{review.rating}</Text>
                    </View>
                  </View>
                  {review.comment && <Text className="font-nunito text-gray-600">{review.comment}</Text>}
                </View>
              ))
            ) : (
              <Text className="font-nunito italic text-gray-500">No reviews yet. Be the first!</Text>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Book Button */}
      <View className="border-t border-gray-100 p-4">
        <Link href={`/(user)/booking/${id}`} asChild>
          <TouchableOpacity
            disabled={!service.active}
            className={`items-center rounded-xl py-4 shadow-sm ${!service.active ? 'bg-gray-300' : 'bg-primary active:opacity-90'}`}>
            <Text className="font-nunito-bold text-lg text-white">
              {service.active ? t('services.book_now', 'Book Now') : t('services.unavailable', 'Unavailable')}
            </Text>
          </TouchableOpacity>
        </Link>
      </View>

      <DateTimePickerModal
        isVisible={isDatePickerVisible}
        mode="date"
        onConfirm={handleBooking}
        onCancel={() => setDatePickerVisible(false)}
        minimumDate={new Date(Date.now() + 24 * 60 * 60 * 1000)}
        maximumDate={new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)}
      />

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
