import {Stack} from 'expo-router';

export default function UserLayout() {
  return (
    <Stack screenOptions={{headerShown: false}}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="events/[id]" />
      <Stack.Screen name="services/[id]" />
      <Stack.Screen name="notifications" />
    </Stack>
  );
}
