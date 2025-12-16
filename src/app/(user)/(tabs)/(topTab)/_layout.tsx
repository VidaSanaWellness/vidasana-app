import {withLayoutContext} from 'expo-router';
import {SafeAreaView} from 'react-native-safe-area-context';
import {createMaterialTopTabNavigator} from '@react-navigation/material-top-tabs';
import {useTranslation} from 'react-i18next';

const {Navigator} = createMaterialTopTabNavigator();

export const MaterialTopTabs = withLayoutContext(Navigator);

export default function TopTabsLayout() {
  const {t} = useTranslation();
  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-white">
      <MaterialTopTabs
        screenOptions={{
          tabBarActiveTintColor: '#15803d',
          tabBarInactiveTintColor: '#6B7280',
          tabBarIndicatorStyle: {backgroundColor: '#15803d', height: 3},
          tabBarLabelStyle: {fontWeight: 'bold', textTransform: 'capitalize'},
          tabBarStyle: {elevation: 0, shadowOpacity: 0, borderBottomWidth: 1, borderBottomColor: '#f3f4f6'},
        }}>
        <MaterialTopTabs.Screen name="index" options={{title: t('services.title', 'Services')}} />
        <MaterialTopTabs.Screen name="events" options={{title: t('events.title', 'Events')}} />
      </MaterialTopTabs>
    </SafeAreaView>
  );
}
