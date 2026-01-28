import {Link, usePathname, useSegments} from 'expo-router';
import {View} from 'react-native';
import {H3, Body} from '@/components';

export default function NotFoundScreen() {
  const path = usePathname();
  const segments = useSegments();

  console.log('🚀 ~ NotFoundScreen ~ path:', path, segments);
  return (
    <View className="flex-1 items-center justify-center p-5">
      <H3 className="text-xl font-bold">{"This screen doesn't exist."}</H3>
      <Link href="/auth" className="mt-4 pt-4">
        <Body className="text-base text-[#2e78b7]">Go to home screen!</Body>
      </Link>
    </View>
  );
}
