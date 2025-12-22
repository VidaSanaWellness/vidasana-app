import {Stack} from 'expo-router';

export default function RootLayout() {
  return (
    <Stack screenOptions={{headerShown: false}}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="events/create" />
      <Stack.Screen name="events/[id]" />
      <Stack.Screen name="events/edit/[id]" />
      <Stack.Screen name="services/create" />
      <Stack.Screen name="services/[id]" />
      <Stack.Screen name="services/edit/[id]" />
    </Stack>
  );
}
