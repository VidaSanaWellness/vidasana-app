import {Stack} from 'expo-router';

export default function UserLayout() {
  return (
    <Stack screenOptions={{headerShown: false}}>
      <Stack.Screen name="index" />
      <Stack.Screen name="events/[id]" />
      <Stack.Screen name="services/[id]" />
    </Stack>
  );
}
