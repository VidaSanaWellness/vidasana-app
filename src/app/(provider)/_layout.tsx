import {Stack} from 'expo-router';

export default function RootLayout() {
  return (
    <Stack screenOptions={{headerShown: false}}>
      <Stack.Screen name="(tab)" />
      <Stack.Screen name="create/events" />
      <Stack.Screen name="create/services" />
    </Stack>
  );
}
