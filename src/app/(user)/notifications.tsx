import {View, TouchableOpacity} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useRouter} from 'expo-router';
import {Feather} from '@expo/vector-icons';
import {Display} from '@/components';
import {useTranslation} from 'react-i18next';
import {H2} from '@/components';

export default function NotificationsScreen() {
  const {t} = useTranslation();
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <View className="flex-row items-center border-b border-gray-100 px-4 pb-4 pt-2">
        <TouchableOpacity onPress={() => router.back()} className="mr-4 rounded-full bg-gray-50 p-2">
          <Feather name="arrow-left" size={24} color="black" />
        </TouchableOpacity>
        <H2 className="text-gray-900">{t('notifications.title', 'Notifications')}</H2>
      </View>

      <View className="flex-1 items-center justify-center">
        <Display className="text-gray-400">{t('common.comingSoon')}</Display>
      </View>
    </SafeAreaView>
  );
}
