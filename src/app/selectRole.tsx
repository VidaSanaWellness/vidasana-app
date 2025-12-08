import {supabase} from '@/utils';
import {useAppStore} from '@/store';
import React, {useState} from 'react';
import Toast from 'react-native-toast-message';
import {useMutation} from '@tanstack/react-query';
import {SafeAreaView} from 'react-native-safe-area-context';
import Animated, {FadeInDown, FadeInUp} from 'react-native-reanimated';
import {TouchableOpacity, Text, ActivityIndicator, View, Pressable} from 'react-native';

type Role = 'USER' | 'PROVIDER';

const SelectRoleScreen = () => {
  const {user} = useAppStore((s) => s.session!);
  const [role, setRole] = useState<Role | ''>('');

  const {mutate, isPending} = useMutation({
    mutationKey: ['MUTATE'],
    mutationFn: async (role: Role) => {
      await supabase.auth.updateUser({data: {role}});
      await supabase.from('profile').update({role}).eq('user', user.id);
    },
    onError: (error) => Toast.show({type: 'error', text1: error?.message}),
  });

  return (
    <SafeAreaView className="flex-1 bg-white px-6">
      <View className="flex-1">
        <Animated.View entering={FadeInDown.delay(200)} className="mb-5 mt-16 items-center">
          <Text className="mb-2 text-center text-2xl font-bold text-black">How will you use VidaSana?</Text>
          <Text className="text-center text-base text-gray-500">Choose your role to continue</Text>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(400)} className="mt-5 gap-4">
          <TouchableOpacity
            onPress={() => setRole('USER')}
            className={`rounded-xl border p-5 ${role === 'USER' ? 'border-[#3E6065] bg-[#3E6065]' : 'border-gray-300 bg-gray-100'}`}>
            <Text className={`text-lg font-bold ${role === 'USER' ? 'text-white' : 'text-[#3E6065]'}`}>Join Events</Text>
            <Text className={`mt-1 text-sm ${role === 'USER' ? 'text-[#EAF4F2]' : 'text-gray-600'}`}>Discover and attend experiences</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setRole('PROVIDER')}
            className={`rounded-xl border p-5 ${role === 'PROVIDER' ? 'border-[#3E6065] bg-[#3E6065]' : 'border-gray-300 bg-gray-100'}`}>
            <Text className={`text-lg font-bold ${role === 'PROVIDER' ? 'text-white' : 'text-[#3E6065]'}`}>Host Events</Text>
            <Text className={`mt-1 text-sm ${role === 'PROVIDER' ? 'text-[#EAF4F2]' : 'text-gray-600'}`}>Create and manage your events</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>

      <Pressable
        disabled={!role}
        onPress={() => mutate(role as Role)}
        className={'h-14 items-center justify-center rounded-2xl bg-[#3E6065] shadow ' + (role ? 'opacity-100' : 'opacity-50')}>
        {isPending ? <ActivityIndicator color="#FFF" /> : <Text className="text-lg font-semibold text-white">Continue</Text>}
      </Pressable>
    </SafeAreaView>
  );
};

export default SelectRoleScreen;
