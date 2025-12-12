import {createMaterialTopTabNavigator} from '@react-navigation/material-top-tabs';
import {withLayoutContext} from 'expo-router';
import {SafeAreaView} from 'react-native-safe-area-context';

const {Navigator} = createMaterialTopTabNavigator();

export const MaterialTopTabs = withLayoutContext(Navigator);

export default function TopTabsLayout() {
  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-white">
      <MaterialTopTabs
        screenOptions={{
          tabBarLabelStyle: {fontWeight: 'bold', textTransform: 'capitalize'},
          tabBarIndicatorStyle: {backgroundColor: '#15803d', height: 3}, // Green-700
          tabBarActiveTintColor: '#15803d',
          tabBarInactiveTintColor: '#6B7280',
          tabBarStyle: {elevation: 0, shadowOpacity: 0, borderBottomWidth: 1, borderBottomColor: '#f3f4f6'},
        }}>
        <MaterialTopTabs.Screen name="services" options={{title: 'Services'}} />
        <MaterialTopTabs.Screen name="events" options={{title: 'Events'}} />
      </MaterialTopTabs>
    </SafeAreaView>
  );
}
