import React from 'react';
import {View, ScrollView, TouchableOpacity} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Stack, useRouter} from 'expo-router';
import {Ionicons} from '@expo/vector-icons';
import {useTranslation} from 'react-i18next';
import {H3, Body} from '@/components';

export default function TermsAndConditions() {
  const {back} = useRouter();
  const {t} = useTranslation();

  return (
    <SafeAreaView className="flex-1 bg-white">
      <Stack.Screen options={{headerShown: false}} />
      <View className="flex-row items-center border-b border-gray-100 p-4">
        <TouchableOpacity onPress={back} className="mr-4 rounded-full bg-gray-50 p-2">
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <H3 className="text-xl text-black">Terms and Conditions</H3>
      </View>
      <ScrollView className="flex-1 p-6">
        <Body className="mb-4 text-base leading-6 text-gray-700">
          Welcome to VidaSana Wellness. By expecting to use our services, you agree to the following terms...
        </Body>
        <Body className="text-base italic text-gray-400">(Content to be populated)</Body>
      </ScrollView>
    </SafeAreaView>
  );
}
