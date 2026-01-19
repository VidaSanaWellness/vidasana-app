import React, {useEffect, useState} from 'react';
import {View, Text, FlatList, TouchableOpacity, Image, Linking, RefreshControl} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {supabase} from '@/utils/supabase';
import {Ionicons} from '@expo/vector-icons';
import {useTranslation} from 'react-i18next';
import {useAppStore} from '@/store';
import {useRouter, Link} from 'expo-router';

type Booking = {
  id: string;
  created_at: string;
  status: string;
  total_price?: number;
  price?: number;
  unit_price?: number;
  quantity?: number;
  appointed?: string;
  service?: {
    title: string;
    images: string[];
  };
  event?: {
    title: string;
    start_at: string;
    images: string[];
  };
  type: 'service' | 'event';
};

export default function BookingsScreen() {
  const {user} = useAppStore((s) => s.session!);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const {t} = useTranslation();
  const router = useRouter(); // Added useRouter hook

  const fetchBookings = async () => {
    try {
      setLoading(true);
      if (!user) return;

      // Fetch Service Bookings
      const {data: serviceBookings, error: serviceError} = await supabase
        .from('services_booking')
        .select(
          `
          id, created_at, status, price, appointed,
          services (
            images,
            service_translations (title)
          )
        `
        )
        .eq('user', user.id)
        .order('created_at', {ascending: false});

      if (serviceError) throw serviceError;

      // Fetch Event Bookings
      const {data: eventBookings, error: eventError} = await supabase
        .from('event_booking')
        .select(
          `
          id, created_at, unit_price, total_price, quantity,
          events (
            start_at, 
            images,
            event_translations (title)
          )
        `
        )
        .eq('user', user.id)
        .order('created_at', {ascending: false});

      if (eventError) throw eventError;

      // Combine and Sort
      const combined: Booking[] = [
        ...(serviceBookings || []).map((b: any) => ({
          ...b,
          type: 'service' as const,
          service: {
            images: b.services?.images,
            title: b.services?.service_translations?.[0]?.title || 'Service',
          },
        })),
        ...(eventBookings || []).map((b: any) => ({
          ...b,
          type: 'event' as const,
          event: {
            start_at: b.events?.start_at,
            images: b.events?.images,
            title: b.events?.event_translations?.[0]?.title || 'Event',
          },
        })),
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setBookings(combined);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [user]);

  const handleContactSupport = (bookingId: string) => {
    const subject = `Support Request for Booking #${bookingId.substring(0, 8)}`;
    Linking.openURL(`mailto:support@vidasana.com?subject=${encodeURIComponent(subject)}`);
  };

  const renderItem = ({item}: {item: Booking}) => {
    const title = item.type === 'service' ? item.service?.title : item.event?.title;
    const image = item.type === 'service' ? item.service?.images?.[0] : item.event?.images?.[0];
    const date = item.type === 'service' ? item.appointed : item.event?.start_at;
    const price = item.type === 'service' ? item.price : item.total_price;

    return (
      <Link href={`/(user)/receipt/${item.id}`} asChild>
        <TouchableOpacity className="mb-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <View className="flex-row">
            {image ? (
              <Image
                source={{uri: supabase.storage.from('images').getPublicUrl(image).data.publicUrl}}
                className="h-20 w-20 rounded-lg bg-gray-200"
              />
            ) : (
              <View className="h-20 w-20 items-center justify-center rounded-lg bg-gray-200">
                <Ionicons name="calendar" size={24} color="gray" />
              </View>
            )}

            <View className="ml-4 flex-1 justify-between">
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="font-nunito-bold text-gray-900" numberOfLines={1}>
                    {title || 'Unknown Booking'}
                  </Text>
                  <Text className="font-nunito text-xs text-gray-500">{date ? new Date(date).toLocaleDateString() : 'Date TBD'}</Text>
                </View>
                <View className={`rounded-full px-2 py-1 ${item.status === 'booked' || !item.status ? 'bg-primary/10' : 'bg-gray-100'}`}>
                  <Text className={`font-nunito-bold text-xs ${item.status === 'booked' || !item.status ? 'text-primary' : 'text-gray-500'}`}>
                    {item.status || 'Booked'}
                  </Text>
                </View>
              </View>
              <View className="flex-row items-center justify-between">
                <Text className="font-nunito-bold text-primary">${price}</Text>
                <View className="flex-row justify-end">
                  <TouchableOpacity onPress={() => handleContactSupport(item.id)} className="flex-row items-center">
                    <Ionicons name="help-buoy-outline" size={16} color="#4B5563" />
                    <Text className="ml-1 font-nunito text-sm font-medium text-gray-600">Contact Support</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Link>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <View className="border-b border-gray-50 px-6 py-4">
        <Text className="text-2xl font-bold text-gray-900">My Bookings</Text>
      </View>
      <FlatList
        data={bookings}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{padding: 20}}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchBookings} />}
        ListEmptyComponent={
          !loading ? (
            <View className="mt-20 items-center">
              <Ionicons name="calendar-outline" size={64} color="#E5E7EB" />
              <Text className="mt-4 text-gray-500">No bookings yet.</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}
