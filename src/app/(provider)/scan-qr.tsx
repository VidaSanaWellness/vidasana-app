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
      // Assuming QR code contains just the UUID of the booking
      // Ideally format is: "booking:<uuid>" or just "<uuid>"
      // We will try to clean it if it has prefixes, but for now assuming direct UUID
      const bookingId = data.trim();

      console.log('Scanned Booking ID:', bookingId);

      // Validate UUID format roughly
      if (bookingId.length < 10) {
        throw new Error('Invalid QR Code format');
      }

      // Verify booking ownership and status
      const {data: booking, error} = await supabase
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
        .single();

      if (error || !booking) {
        console.error('Lookup error:', error);
        throw new Error('Booking not found');
      }

      // Check if this booking belongs to the current provider
      // @ts-ignore
      if (booking.service?.provider !== user?.id) throw new Error('This booking belongs to another service provider.');

      if (booking.status === 'completed')
        return Alert.alert('Already Completed', `This booking for ${booking.user?.name || 'Client'} has already been marked as completed.`, [
          {text: 'OK', onPress: () => setScanned(false)},
        ]);

      if (booking.status === 'cancel')
        return Alert.alert('Cancelled Booking', `This booking was cancelled.`, [{text: 'OK', onPress: () => setScanned(false)}]);

      // Mark as completed/checked-in
      const {error: updateError} = await supabase
        .from('services_booking')
        .update({status: 'completed'}) // Or 'checked_in' if you prefer
        .eq('id', bookingId);

      if (updateError) throw updateError;

      // Success
      Toast.show({
        type: 'success',
        text1: 'Check-in Successful',
        text2: `${booking.user?.name || 'Client'} has been verified.`,
      });

      // Navigate back after short delay or stay to scan more?
      // Usually better to ask or just reset
      Alert.alert('Success!', `Checked in ${booking.user?.name || 'Client'}`, [
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
