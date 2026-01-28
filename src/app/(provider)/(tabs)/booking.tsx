import {View, SectionList, TouchableOpacity, Image, ActivityIndicator, RefreshControl, Linking} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import {supabase} from '@/utils/supabase';
import {useAppStore} from '@/store';
import dayjs from 'dayjs';
import {Ionicons, Feather} from '@expo/vector-icons';
import {useTranslation} from 'react-i18next';
import {H2, Body, Caption} from '@/components';

export default function ProviderBookingsScreen() {
  const {user} = useAppStore((s) => s.session!);
  const {t, i18n} = useTranslation();
  const queryClient = useQueryClient();

  const {
    data: bookings,
    error,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['provider-bookings', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const {data, error} = await supabase
        .from('services_booking')
        .select(
          `
          id,
          appointed,
          status,
          price,
          service:services!inner (
            id,
            images,
            provider,
            translations:service_translations(title, lang_code)
          ),
          user:profile (
            id,
            name,
            image,
            phone
          )
        `
        )
        .eq('service.provider', user.id)
        .order('appointed', {ascending: true}); // Show upcoming first

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Group bookings by day
  const sections = (() => {
    if (!bookings) return [];

    const groups: {[key: string]: any[]} = {};

    bookings.forEach((booking) => {
      // appointed is likely an ISO string or date string
      const dateKey = dayjs(booking.appointed).format('YYYY-MM-DD');

      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(booking);
    });

    return Object.keys(groups)
      .sort() // Sort dates ascending
      .map((dateKey) => ({
        title: dateKey,
        data: groups[dateKey],
      }));
  })();

  const renderSectionHeader = ({section: {title}}: any) => {
    const date = dayjs(title);
    let headerText = date.format('dddd, D MMMM');

    const today = dayjs();
    const tomorrow = dayjs().add(1, 'day');

    if (date.isSame(today, 'day')) headerText = 'Today';
    else if (date.isSame(tomorrow, 'day')) headerText = 'Tomorrow';

    return (
      <View className="mt-2 bg-gray-100 px-5 py-3">
        <Body className="font-nunito-bold text-sm uppercase tracking-wide text-gray-500">{headerText}</Body>
      </View>
    );
  };

  const renderItem = ({item}: {item: any}) => {
    // Get correct translation for title
    const translations = item.service?.translations || [];
    const translation =
      translations.find((tr: any) => tr.lang_code === i18n.language) || translations.find((tr: any) => tr.lang_code === 'en') || translations[0];
    const serviceTitle = translation?.title || 'Service';

    // User Image
    const userImage = item.user?.image ? {uri: supabase.storage.from('avatars').getPublicUrl(item.user.image).data.publicUrl} : null;

    return (
      <View className="flex-row items-center border-b border-gray-100 bg-white p-4">
        {/* Time Column */}
        <View className="mr-3 w-16 items-center justify-center border-r border-gray-100 pr-3">
          <Body className="font-nunito-bold text-lg text-gray-900">{dayjs(item.appointed).format('h:mm')}</Body>
          <Caption className="font-nunito font-semibold text-gray-500">{dayjs(item.appointed).format('A')}</Caption>
        </View>

        {/* User Avatar */}
        <View className="mr-4">
          {userImage ? (
            <Image source={userImage} className="h-12 w-12 rounded-full bg-gray-200" />
          ) : (
            <View className="h-12 w-12 items-center justify-center rounded-full bg-gray-200">
              <Feather name="user" size={20} color="gray" />
            </View>
          )}
        </View>

        {/* Content */}
        <View className="flex-1">
          <Body className="font-nunito-bold text-base text-gray-900" numberOfLines={1}>
            {item.user?.name || 'Unknown User'}
          </Body>
          <Caption className="mt-0.5 text-gray-500" numberOfLines={1}>
            {serviceTitle}
          </Caption>
          <View className="mt-1 flex-row items-center">
            <View className={`rounded-full px-2 py-0.5 ${item.status === 'booked' ? 'bg-sage/20' : 'bg-gray-100'}`}>
              <Caption className={`font-nunito-bold capitalize ${item.status === 'booked' ? 'text-sage' : 'text-gray-600'}`}>{item.status}</Caption>
            </View>
            <Caption className="ml-3 font-medium text-gray-400">ID: {item.id.substring(0, 6)}</Caption>
          </View>
        </View>

        {/* Price/Action */}
        <View className="items-end">
          <Body className="font-nunito-bold text-base text-gray-900">${item.price}</Body>
          <TouchableOpacity
            className="mt-2 rounded-full bg-gray-50 p-2"
            onPress={() => {
              if (item.user?.phone) {
                Linking.openURL(`tel:${item.user.phone}`);
              } else {
                // Fallback or alert if no phone
                console.warn('No phone number available');
              }
            }}>
            <Ionicons name="call-outline" size={18} color="gray" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (isLoading && !isRefetching) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#00594f" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <View className="flex-row items-center justify-between border-b border-gray-100 px-5 py-4">
        <H2 className="text-gray-900">Bookings</H2>
      </View>

      {bookings && bookings.length > 0 ? (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          stickySectionHeadersEnabled={false} // Clean look
          refreshControl={<RefreshControl refreshing={isLoading || isRefetching} onRefresh={refetch} tintColor="#00594f" />}
          contentContainerStyle={{paddingBottom: 20}}
        />
      ) : (
        <View className="flex-1 items-center justify-center p-10">
          <View className="mb-4 h-20 w-20 items-center justify-center rounded-full bg-gray-100">
            <Feather name="calendar" size={32} color="gray" />
          </View>
          <Body className="text-center font-nunito-bold text-lg text-gray-900">No Bookings Yet</Body>
          <Body className="mt-2 text-center text-gray-500">Your future bookings will appear here grouped by date.</Body>
          <TouchableOpacity onPress={() => refetch()} className="mt-6 rounded-full bg-primary px-6 py-3">
            <Body className="font-nunito-bold text-white">Refresh</Body>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}
