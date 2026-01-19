import {View} from 'react-native';
import {useTranslation} from 'react-i18next';
import {Display} from '@/components/Typography';

export default function NotificationsScreen() {
  const {t} = useTranslation();

  return (
    <View className="flex-1 items-center justify-center bg-white">
      <Display className="text-gray-400">{t('common.comingSoon')}</Display>
    </View>
  );
}
