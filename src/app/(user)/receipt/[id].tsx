import React, { useState} from 'react';
import {View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, SafeAreaView} from 'react-native';
import {useLocalSearchParams, useRouter} from 'expo-router';
import {Ionicons, Feather} from '@expo/vector-icons';
import {supabase} from '@/utils';
import {useQuery} from '@tanstack/react-query';
import QRCode from 'react-native-qrcode-svg';
import dayjs from 'dayjs';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as Clipboard from 'expo-clipboard';
import Toast from 'react-native-toast-message';

export default function ReceiptScreen() {
  const {id} = useLocalSearchParams<{id: string}>();
  const router = useRouter();
  const [isMenuVisible, setIsMenuVisible] = useState(false);

  // Fetch Booking Details with Joins
  const {data: booking, isLoading} = useQuery({
    queryKey: ['booking-receipt', id],
    queryFn: async () => {
      const {data, error} = await supabase
        .from('services_booking')
        .select(
          `
            *,
            service:services (
                *,
                provider:provider (*)
            ),
            payment:payments (*)
        `
        )
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const generateHtml = () => {
    if (!booking) return '';
    return `
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
        </head>
        <body style="text-align: center;">
          <h1 style="font-size: 50px; font-family: Helvetica Neue; font-weight: normal;">
            VidaSana Wellness Receipt
          </h1>
          <h3 style="color: #666; font-family: Helvetica Neue;">
            booking ID: ${booking.id.split('-')[0]}
          </h3>
          <p>
            Service: ${(booking.service as any)?.translations?.[0]?.title || 'Service'} <br />
            Provider: ${booking.service?.provider?.name || 'Provider'} <br />
            Date: ${dayjs(booking.appointed).format('MMM D, YYYY | h:mm A')} <br />
            Amount: $${booking.price} <br />
            Status: ${booking.payment?.status || 'Unpaid'} <br />
            Transaction ID: ${booking.payment?.id || 'N/A'}
          </p>
        </body>
      </html>
    `;
  };

  const handlePrint = async () => {
    try {
      await Print.printAsync({
        html: generateHtml(),
      });
      setIsMenuVisible(false);
    } catch (e) {
      Alert.alert('Error', 'Failed to print receipt');
    }
  };

  const handleShare = async () => {
    try {
      const {uri} = await Print.printToFileAsync({html: generateHtml()});
      await Sharing.shareAsync(uri, {UTI: '.pdf', mimeType: 'application/pdf'});
      setIsMenuVisible(false);
    } catch (e) {
      Alert.alert('Error', 'Failed to share receipt');
    }
  };

  const handleDownload = async () => {
    // On mobile, "Download" is often just "Share/Save to Files"
    handleShare();
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#15803d" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View className="relative z-50 flex-row items-center justify-between p-4">
        <TouchableOpacity onPress={() => router.back()} className="rounded-full bg-gray-100 p-2">
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <Text className="text-xl font-bold">E-Receipt</Text>
        <TouchableOpacity onPress={() => setIsMenuVisible(!isMenuVisible)} className="rounded-full bg-gray-100 p-2">
          <Feather name="more-horizontal" size={24} color="black" />
        </TouchableOpacity>

        {/* Dropdown Menu */}
        {isMenuVisible && (
          <View className="absolute right-4 top-16 z-50 w-48 rounded-xl border border-gray-100 bg-white p-1 shadow-lg" style={{elevation: 5}}>
            <TouchableOpacity onPress={handleShare} className="flex-row items-center p-3 hover:bg-gray-50">
              <Feather name="send" size={18} color="#333" className="mr-3" />
              <Text className="ml-2 font-medium text-gray-700">Share E-Receipt</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDownload} className="flex-row items-center border-t border-gray-50 p-3">
              <Feather name="download" size={18} color="#333" className="mr-3" />
              <Text className="ml-2 font-medium text-gray-700">Download E-Receipt</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handlePrint} className="flex-row items-center border-t border-gray-50 p-3">
              <Feather name="printer" size={18} color="#333" className="mr-3" />
              <Text className="ml-2 font-medium text-gray-700">Print</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <ScrollView className="mt-4 flex-1 px-4" showsVerticalScrollIndicator={false}>
        {/* QR Code Section */}
        <View className="mb-8 items-center py-6">
          <QRCode value={booking?.id || 'invalid'} size={180} />
          <Text className="mt-4 font-medium tracking-widest text-gray-500">{booking?.id.split('-')[0]}</Text>
        </View>

        {/* Ticket Details Card */}
        <View className="mb-6 rounded-3xl bg-gray-50 p-6">
          <View className="mb-4 flex-row justify-between">
            <Text className="font-nunito text-gray-500">Services</Text>
            <Text className="font-nunito-bold text-gray-900">{(booking?.service as any)?.translations?.[0]?.title}</Text>
          </View>
          <View className="mb-4 flex-row justify-between">
            <Text className="font-nunito text-gray-500">Category</Text>
            <Text className="font-nunito-bold text-gray-900">{(booking?.service as any)?.category?.name || 'Wellness'}</Text>
          </View>
          <View className="mb-4 flex-row justify-between">
            <Text className="font-nunito text-gray-500">Provider</Text>
            <Text className="font-nunito-bold text-gray-900">{(booking?.service as any)?.provider?.name}</Text>
          </View>
          <View className="mb-4 flex-row justify-between">
            <Text className="font-nunito text-gray-500">Date & Time</Text>
            <Text className="font-nunito-bold text-gray-900">{dayjs(booking?.appointed).format('MMM D, YYYY | h:mm A')}</Text>
          </View>
          {/* Promo & Working Hours Removed as requested */}
        </View>

        {/* Payment Details Card */}
        <View className="mb-8 rounded-3xl bg-gray-50 p-6">
          <View className="mb-6 flex-row items-center justify-between">
            <Text className="font-nunito font-medium text-gray-500">Payment Details</Text>
            <Ionicons name="chevron-down" size={20} color="#9ca3af" />
          </View>

          <View className="mb-4 flex-row justify-between">
            <Text className="font-nunito text-gray-500">Amount</Text>
            <Text className="font-nunito-bold text-gray-900">${booking?.price}</Text>
          </View>
          {/* Promo Removed */}
          <View className="mb-4 flex-row justify-between">
            <Text className="font-nunito text-gray-500">Payment Methods</Text>
            <Text className="font-nunito-bold text-gray-900">Card ending ****</Text>
          </View>
          <View className="mb-4 flex-row justify-between">
            <Text className="font-nunito text-gray-500">Date</Text>
            <Text className="font-nunito-bold text-gray-900">{dayjs(booking?.payment?.created_at).format('MMM D, YYYY | h:mm:ss A')}</Text>
          </View>
          <View className="mb-4 flex-row justify-between">
            <Text className="font-nunito text-gray-500">Transaction ID</Text>
            <TouchableOpacity
              className="flex-row items-center"
              onPress={async () => {
                if (booking?.payment?.id) {
                  await Clipboard.setStringAsync(booking.payment.id);
                  Toast.show({type: 'success', text1: 'Copied!', text2: 'Transaction ID copied to clipboard'});
                }
              }}>
              <Text className="mr-2 max-w-[150px] font-nunito-bold text-xs text-gray-900" numberOfLines={1} ellipsizeMode="tail">
                {booking?.payment?.id || 'N/A'}
              </Text>
              <Ionicons name="copy-outline" size={16} color="#00594f" />
            </TouchableOpacity>
          </View>
          <View className="mt-2 flex-row items-center justify-between">
            <Text className="font-nunito text-gray-500">Status</Text>
            <View className="rounded-lg bg-sage/20 px-3 py-1">
              <Text className="font-nunito-bold text-xs capitalize text-sage">{booking?.payment?.status || 'Unknown'}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
