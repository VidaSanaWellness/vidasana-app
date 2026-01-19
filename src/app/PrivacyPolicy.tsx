import React from 'react';
import {View, Text, ScrollView, TouchableOpacity} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Stack, useRouter} from 'expo-router';
import {Ionicons} from '@expo/vector-icons';
import {useTranslation} from 'react-i18next';

export default function PrivacyPolicy() {
  const {back} = useRouter();
  const {t} = useTranslation();

  return (
    <SafeAreaView className="flex-1 bg-white">
      <Stack.Screen options={{headerShown: false}} />
      <View className="flex-row items-center border-b border-gray-100 p-4">
        <TouchableOpacity onPress={back} className="mr-4 rounded-full bg-gray-50 p-2">
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <Text className="font-nunito-bold text-xl text-black">Privacy Policy</Text>
      </View>
      <ScrollView className="flex-1 p-6">
        <Text className="font-nunito mb-4 text-base leading-6 text-gray-700">
          Your privacy is important to us. This policy explains how we handle your data...
        </Text>
        <Text className="font-nunito text-base italic text-gray-400">(Content to be populated)</Text>
      </ScrollView>
    </SafeAreaView>
  );
}
