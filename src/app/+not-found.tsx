import {Link, usePathname, useSegments} from 'expo-router';
import {Text, View} from 'react-native';

export default function NotFoundScreen() {
  const path = usePathname();
  const segments = useSegments();

  console.log('🚀 ~ NotFoundScreen ~ path:', path, segments);
  return (
    <View className="flex-1 items-center justify-center p-5">
      <Text className="text-xl font-bold">{"This screen doesn't exist."}</Text>
      <Link href="/" className="mt-4 pt-4">
        <Text className="text-base text-[#2e78b7]">Go to home screen!</Text>
      </Link>
    </View>
  );
}
