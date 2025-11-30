import {Link, Tabs} from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{headerShown: false}}>
      <Tabs.Screen name="index" options={{title: 'Tab One'}} />
      <Tabs.Screen name="two" options={{title: 'Tab Two'}} />
    </Tabs>
  );
}
