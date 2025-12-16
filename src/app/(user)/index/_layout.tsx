import {Tabs} from 'expo-router';
import {useColorScheme} from 'nativewind';
import {AntDesign, Feather} from '@expo/vector-icons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

const ACTIVE_LIGHT = '#2d5016';
const ACTIVE_DARK = '#7dd87d';
const INACTIVE_LIGHT = '#8a8a8a';
const INACTIVE_DARK = '#9CA3AF';

const BASE_TAB_BAR_HEIGHT = 80;

export default function TabLayout() {
  const {colorScheme} = useColorScheme();
  const isDark = colorScheme === 'dark';

  const {bottom} = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: isDark ? ACTIVE_LIGHT : ACTIVE_DARK,
        tabBarInactiveTintColor: isDark ? INACTIVE_DARK : INACTIVE_LIGHT,
        tabBarStyle: {paddingTop: 12, alignItems: 'center', height: BASE_TAB_BAR_HEIGHT, backgroundColor: colorScheme === 'dark' ? '#000' : '#fff'},
      }}>
      <Tabs.Screen name="index" options={{title: 'Home', tabBarIcon: ({color}) => <Feather name="home" size={24} color={color} />}} />
      <Tabs.Screen name="booking" options={{tabBarIcon: ({color}) => <Feather name="inbox" size={24} color={color} />}} />
      <Tabs.Screen name="setting" options={{tabBarIcon: ({color}) => <Feather name="settings" size={24} color={color} />}} />
    </Tabs>
  );
}
