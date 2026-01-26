import React, {useEffect, useState} from 'react';
import {View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert, RefreshControl} from 'react-native';
import {Stack, Link} from 'expo-router';
import {supabase} from '@/utils';
import {useAppStore} from '@/store';
import {Ionicons} from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';

export default function PaymentSetupScreen() {
  const {user} = useAppStore((s) => s.session!);
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [status, setStatus] = useState<{
    isConnected: boolean;
    details_submitted?: boolean;
    charges_enabled?: boolean;
    payouts_enabled?: boolean;
  } | null>(null);

  useEffect(() => {
    checkStatus();
  }, []);

  const invokeFunction = (action: string) => supabase.functions.invoke('stripe-connect', {body: {action}});

  const checkStatus = async () => {
    console.log('PaymentSetup: checkStatus started');
    try {
      setCheckingStatus(true);
      if (!user) {
        console.log('PaymentSetup: No user found');
        return setCheckingStatus(false);
      }

      console.log('PaymentSetup: Invoking stripe-connect (check_status)');
      const {data, error} = await invokeFunction('check_status');
      console.log('PaymentSetup: Invoke result', {data, error});

      if (error) throw error;
      setStatus(data);

      // AUTOMATIC TRANSITION: Onboarding -> Pending (Under Review)
      if (data?.details_submitted) {
        const {data: profile} = await supabase.from('profile').select('status').eq('id', user.id).single();
        // checking logic: if not active, move to pending
        if (profile?.status !== 'active' && profile?.status !== 'pending') {
          await supabase.from('profile').update({status: 'pending'}).eq('id', user.id);
        }
      }
    } catch (e: any) {
      console.log('PaymentSetup: Error checking status:', e);
      // Fallback: just check if stripe ID exists in DB if function fails (e.g. not deployed yet)
      const {data: provider} = await supabase.from('provider').select('stripe').eq('id', user.id).single();
      setStatus({isConnected: !!provider?.stripe, details_submitted: false}); // Safest fallback
    } finally {
      console.log('PaymentSetup: checkStatus finished');
      setCheckingStatus(false);
    }
  };

  const handleConnect = async () => {
    try {
      setLoading(true);
      const {data, error} = await invokeFunction('create_account_link');

      if (error) throw error;
      if (!data?.url) throw new Error('No URL returned');

      // Open the onboarding flow
      const result = await WebBrowser.openAuthSessionAsync(data.url, 'vidasana://stripe-connect/return');

      // Refresh status when they come back
      if (result.type === 'success' || result.type === 'dismiss') {
        checkStatus();
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLoginLink = async () => {
    try {
      setLoading(true);
      const {data, error} = await supabase.functions.invoke('stripe-connect', {body: {action: 'create_login_link'}});

      if (error) throw error;
      if (!data?.url) throw new Error('No URL returned');

      await WebBrowser.openBrowserAsync(data.url);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-white">
      <Stack.Screen options={{title: 'Payout Setup', headerBackTitle: 'Settings'}} />

      <ScrollView
        className="flex-1 p-6"
        contentContainerStyle={{flexGrow: 1, justifyContent: 'center'}}
        refreshControl={<RefreshControl refreshing={checkingStatus} onRefresh={checkStatus} />}>
        <View className="mb-8 mt-4 items-center">
          <View className="mb-4 h-20 w-20 items-center justify-center rounded-full bg-primary/10">
            <Ionicons name="card-outline" size={40} color="#00594f" />
          </View>
          <Text className="font-nunito-bold text-2xl text-gray-900">Get Paid with Stripe</Text>
          <Text className="mt-2 text-center font-nunito text-gray-500">
            Connect your bank account to receive payouts from your bookings instantly.
          </Text>
        </View>

        {checkingStatus ? (
          <ActivityIndicator size="large" color="#00594f" />
        ) : (
          <View>
            {/* 1. NOT CONNECTED -> Connect Button */}
            {!status?.isConnected && (
              <View>
                <TouchableOpacity
                  onPress={handleConnect}
                  disabled={loading}
                  className="flex-row items-center justify-center rounded-xl bg-primary py-4 shadow-sm">
                  {loading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <>
                      <Text className="mr-2 font-nunito-bold text-lg text-white">Connect Stripe</Text>
                      <Ionicons name="arrow-forward" size={20} color="white" />
                    </>
                  )}
                </TouchableOpacity>
                <Text className="mt-4 text-center font-nunito text-xs text-gray-400">
                  You will be redirected to completely secure onboarding hosted by Stripe.
                </Text>
              </View>
            )}

            {/* 2. CONNECTED BUT INCOMPLETE -> Continue Setup */}
            {status?.isConnected && !status?.details_submitted && (
              <View className="items-center">
                <View className="mb-4 flex-row items-center rounded-xl border border-yellow-200 bg-yellow-50 p-4">
                  <Ionicons name="warning-outline" size={24} color="#ca8a04" />
                  <View className="ml-3 flex-1">
                    <Text className="font-nunito-bold text-yellow-800">Setup Incomplete</Text>
                    <Text className="font-nunito text-xs text-yellow-700">You need to provide more information to start receiving payouts.</Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={handleConnect}
                  disabled={loading}
                  className="w-full flex-row items-center justify-center rounded-xl bg-primary py-3 shadow-sm">
                  {loading ? <ActivityIndicator color="white" /> : <Text className="font-nunito-bold text-white">Complete Setup</Text>}
                </TouchableOpacity>
              </View>
            )}

            {/* 3. FULLY ACTIVE -> Manage Dashboard */}
            {status?.isConnected && status?.details_submitted && (
              <View>
                <View className="mb-6 flex-row items-center rounded-xl border border-sage/30 bg-sage/20 p-4">
                  <Ionicons name="checkmark-circle" size={24} color="#00594f" />
                  <View className="ml-3">
                    <Text className="font-nunito-bold text-gray-800">Stripe Connected</Text>
                    <Text className="font-nunito text-xs text-gray-600">Your account is ready to receive payouts.</Text>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={handleLoginLink}
                  disabled={loading}
                  className="mb-4 w-full flex-row items-center justify-center rounded-xl bg-gray-100 py-3">
                  {loading ? (
                    <ActivityIndicator color="black" />
                  ) : (
                    <>
                      <Text className="mr-2 font-nunito-bold text-gray-800">Manage Payouts</Text>
                      <Ionicons name="open-outline" size={18} color="black" />
                    </>
                  )}
                </TouchableOpacity>

                <Link href="/" replace asChild>
                  <TouchableOpacity className="mb-4 w-full flex-row items-center justify-center rounded-xl bg-primary py-3 shadow-sm">
                    <Text className="mr-2 font-nunito-bold text-white">Go Home</Text>
                    <Ionicons name="home-outline" size={18} color="white" />
                  </TouchableOpacity>
                </Link>
                <Text className="text-center font-nunito text-xs text-gray-400">View your balance and edit bank details on Stripe.</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
