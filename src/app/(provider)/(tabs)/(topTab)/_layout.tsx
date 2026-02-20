import {withLayoutContext} from 'expo-router';
import {SafeAreaView} from 'react-native-safe-area-context';
import {createMaterialTopTabNavigator} from '@react-navigation/material-top-tabs';

const {Navigator} = createMaterialTopTabNavigator();

export const MaterialTopTabs = withLayoutContext(Navigator);

export default function TopTabsLayout() {
  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-white">
      <MaterialTopTabs
        screenOptions={{
          tabBarActiveTintColor: '#2d5016',
          tabBarInactiveTintColor: '#6B7280',
          tabBarIndicatorStyle: {backgroundColor: '#2d5016', height: 3},
          tabBarLabelStyle: {fontWeight: 'bold', textTransform: 'capitalize'},
          tabBarStyle: {elevation: 0, shadowOpacity: 0, borderBottomWidth: 1, borderBottomColor: '#f3f4f6'},
        }}>
        <MaterialTopTabs.Screen name="index" options={{title: 'Services'}} />
        <MaterialTopTabs.Screen name="events" options={{title: 'Events'}} />
      </MaterialTopTabs>
    </SafeAreaView>
  );
}
