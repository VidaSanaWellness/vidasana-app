import React from 'react';
import {View, Linking} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Ionicons} from '@expo/vector-icons';
import {Display, Subtitle, Button} from '@/components';
import {supabase} from '@/utils/supabase';
import {useLocalSearchParams} from 'expo-router';

export default function ContactSupportScreen() {
  const {reason} = useLocalSearchParams();

  const isRejected = reason === 'reject';
  const isDeleted = reason === 'delete';

  const title = isRejected ? 'Account Rejected' : isDeleted ? 'Account Suspended' : 'Contact Support';
  const message = isRejected
    ? 'Your account application was not approved. Please contact support for more details.'
    : 'Your account has been suspended. Please contact support to resolve this issue.';

  const handleContact = () => {
    Linking.openURL('mailto:support@vidasana.com');
  };

  return (
    <SafeAreaView className="flex-1 items-center justify-center bg-white p-6">
      <View className="mb-8 items-center">
        <View className="mb-6 h-24 w-24 items-center justify-center rounded-full bg-red-50">
          <Ionicons name="alert-circle-outline" size={48} color="#DC2626" />
        </View>
        <Display align="center" className="mb-2 text-red-600">
          {title}
        </Display>
        <Subtitle align="center">{message}</Subtitle>
      </View>

      <View className="w-full">
        <Button label="Contact Support" onPress={handleContact} fullWidth className="mb-4" />
        <Button label="Log Out" variant="outline" onPress={() => supabase.auth.signOut()} fullWidth />
      </View>
    </SafeAreaView>
  );
}
