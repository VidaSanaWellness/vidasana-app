import React from 'react';
import {View, Text} from 'react-native';
import {useTranslation} from 'react-i18next';

export default function NotificationsScreen() {
  const {t} = useTranslation();

  return (
    <View className="flex-1 items-center justify-center bg-white">
      <Text className="text-lg font-bold text-gray-500">{t('common.comingSoon')}</Text>
    </View>
  );
}
