import React, {useState} from 'react';
import {StyleSheet, View, TouchableOpacity, Dimensions, Alert, ActivityIndicator} from 'react-native';
import {CameraView, useCameraPermissions} from 'expo-camera';
import {useRouter} from 'expo-router';
import {Ionicons} from '@expo/vector-icons';
import {SafeAreaView} from 'react-native-safe-area-context';
import {H3, Body, Caption} from '@/components';
import {supabase} from '@/utils';
import {useAppStore} from '@/store';
import Toast from 'react-native-toast-message';
import {useTranslation} from 'react-i18next';

const {width} = Dimensions.get('window');
const SCAN_SIZE = width * 0.7;

export default function QRScannerScreen() {
  const router = useRouter();
  const {t} = useTranslation();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const {user} = useAppStore((s) => s.session!);

  if (!permission) {
    // Camera permissions are still loading
    return <View className="flex-1 bg-black" />;
  }

  if (!permission.granted) {
    // Camera permissions are not granted yet
    return (
      <View className="flex-1 items-center justify-center bg-white px-8">
        <View className="mb-6 h-20 w-20 items-center justify-center rounded-full bg-red-50">
          <Ionicons name="videocam-off-outline" size={40} color="#DC2626" />
        </View>
        <H3 className="mb-2 text-center text-gray-900">{t('scanner.cameraPermissionTitle')}</H3>
        <Body className="mb-8 text-center text-gray-500">{t('scanner.cameraPermissionMessage')}</Body>
        <TouchableOpacity onPress={requestPermission} className="w-full rounded-xl bg-primary py-4">
          <Body className="text-center font-nunito-bold text-base text-white">{t('scanner.grantPermission')}</Body>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()} className="mt-4 w-full py-4">
          <Body className="text-center font-nunito-bold text-base text-gray-500">{t('common.cancel')}</Body>
        </TouchableOpacity>
      </View>
    );
  }

  const handleBarCodeScanned = async ({data}: {data: string}) => {
    if (scanned || loading) return;

    setScanned(true);
    setLoading(true);

    try {
      const bookingId = data.trim();
      console.log('Scanned Booking ID:', bookingId);

      if (bookingId.length < 10) {
        throw new Error('Invalid QR Code format');
      }

      // Define a Booking Helper Type locally or import it if available
      type BookingResult = {
        id: string;
        status: string;
        providerId: string;
        userName: string;
        type: 'service' | 'event';
        table: 'services_booking' | 'event_booking';
      };

      let result: BookingResult | null = null;

      // 1. Try Service Booking
      const {data: serviceBooking, error: serviceError} = await supabase
        .from('services_booking')
        .select(
          `
          id,
          status,
          service:services!inner(provider),
          user:profile(name)
        `
        )
        .eq('id', bookingId)
        .maybeSingle();

      if (serviceBooking) {
        result = {
          id: serviceBooking.id,
          status: serviceBooking.status,
          // @ts-ignore: Supabase types for joins can be tricky, safe to ignore here or cast
          providerId: serviceBooking.service?.provider,
          // @ts-ignore
          userName: serviceBooking.user?.name || 'Client',
          type: 'service',
          table: 'services_booking',
        };
      }

      // 2. Try Event Booking if not found
      if (!result) {
        const {data: eventBooking, error: eventError} = await supabase
          .from('event_booking')
          .select(`id, status, event:events!inner(provider), user:profile(name)`)
          .eq('id', bookingId)
          .maybeSingle();

        if (eventBooking) {
          result = {
            id: eventBooking.id,
            status: eventBooking.status,
            // @ts-ignore
            providerId: eventBooking.event?.provider,
            // @ts-ignore
            userName: eventBooking.user?.name || 'Client',
            type: 'event',
            table: 'event_booking',
          };
        }
      }

      if (!result) {
        throw new Error('Booking not found in Service or Event records');
      }

      // Check Ownership
      if (result.providerId !== user?.id) {
        throw new Error('This booking belongs to another service provider.');
      }

      // Check Status
      if (result.status === 'completed') {
        return Alert.alert('Already Completed', `This booking for ${result.userName} has already been marked as completed.`, [
          {text: 'OK', onPress: () => setScanned(false)},
        ]);
      }

      if (result.status === 'cancel') {
        return Alert.alert('Cancelled Booking', `This booking was cancelled.`, [{text: 'OK', onPress: () => setScanned(false)}]);
      }

      // Mark as Completed
      const {error: updateError} = await supabase.from(result.table).update({status: 'completed'}).eq('id', bookingId);

      if (updateError) throw updateError;

      // Success
      Toast.show({
        type: 'success',
        text1: 'Check-in Successful',
        text2: `${result.userName} has been verified for ${result.type}.`,
      });

      Alert.alert('Success!', `Checked in ${result.userName}`, [
        {text: 'Scan Another', onPress: () => setScanned(false)},
        {text: 'Done', onPress: () => router.back(), style: 'cancel'},
      ]);
    } catch (err: any) {
      Alert.alert('Scan Failed', err.message || 'Could not verify booking.', [{text: 'Try Again', onPress: () => setScanned(false)}]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-black">
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
      />

      <SafeAreaView className="flex-1 justify-between p-6">
        {/* Header */}
        <View className="flex-row items-center justify-between">
          <TouchableOpacity onPress={() => router.back()} className="h-10 w-10 items-center justify-center rounded-full bg-black/40 backdrop-blur-md">
            <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>
          <View className="rounded-full bg-black/40 px-4 py-2 backdrop-blur-md">
            <Caption className="font-nunito-bold text-white">{t('scanner.title')}</Caption>
          </View>
          <View className="w-10" />
        </View>

        {/* Scanner Overlay */}
        <View className="flex-1 items-center justify-center">
          <View className="relative items-center justify-center">
            {/* Corners */}
            <View className="absolute left-0 top-0 h-8 w-8 rounded-tl-xl border-l-4 border-t-4 border-primary" />
            <View className="absolute right-0 top-0 h-8 w-8 rounded-tr-xl border-r-4 border-t-4 border-primary" />
            <View className="absolute bottom-0 left-0 h-8 w-8 rounded-bl-xl border-b-4 border-l-4 border-primary" />
            <View className="absolute bottom-0 right-0 h-8 w-8 rounded-br-xl border-b-4 border-r-4 border-primary" />

            {/* Box */}
            <View style={{width: SCAN_SIZE, height: SCAN_SIZE}} className="items-center justify-center bg-transparent">
              {loading && <ActivityIndicator size="large" color="#00594f" />}
            </View>
          </View>

          <Body className="mt-8 text-center text-white/80 shadow-sm">{t('scanner.instruction')}</Body>
        </View>

        {/* Footer spacer */}
        <View className="h-10" />
      </SafeAreaView>
    </View>
  );
}
