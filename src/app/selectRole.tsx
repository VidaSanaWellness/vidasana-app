import {useAppStore} from '@/store';
import {Loader} from '@/components';
import {Ionicons} from '@expo/vector-icons';
import {supabase, uploadFile} from '@/utils';
import Toast from 'react-native-toast-message';
import React, {useEffect, useState} from 'react';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useMutation, useQueryClient} from '@tanstack/react-query';
import Animated, {FadeInDown, FadeInUp} from 'react-native-reanimated';
import {getDocumentAsync, DocumentPickerAsset} from 'expo-document-picker';
import {TouchableOpacity, Text, View, Pressable, BackHandler, Image, TextInput} from 'react-native';

type Role = 'user' | 'provider';

const SelectRoleScreen = () => {
  const query = useQueryClient();
  const user = useAppStore((s) => s.session?.user!);

  const [US, setUs] = useState(false);
  const [page, setPage] = useState(0);
  const [stripe, setStripe] = useState('');
  const [role, setRole] = useState<Role | ''>('');
  const [document, setDocument] = useState<DocumentPickerAsset | null>(null);

  const reset = () => {
    setPage(0);
    setRole('');
    setDocument(null);
    return true;
  };

  useEffect(() => {
    if (role === 'provider') setPage(1);
    const backHandler = BackHandler.addEventListener('hardwareBackPress', reset);
    // supabase.auth.updateUser({data: {role: 'admin'}});
    return () => backHandler.remove();
  }, [role]);

  const pickPdf = async () => {
    try {
      const result = await getDocumentAsync({copyToCacheDirectory: false, type: 'application/pdf', multiple: false});
      if (result.canceled) return;
      setDocument(result.assets[0]);
    } catch (error) {
      Toast.show({type: 'error', text2: error?.message || 'Error while getting doc file.'});
    }
  };

  const {mutate, isPending} = useMutation({
    mutationKey: ['MUTATE'],
    mutationFn: async (role: Role) => {
      const {error} = await supabase.auth.updateUser({data: {role}});
      if (error) throw error;
      const profile = await supabase.from('profile').update({role}).eq('id', user?.id).select();
      if (profile.error) throw profile.error;
      await query.invalidateQueries({queryKey: ['PROFILE']});
      if (role === 'provider') {
        const file = await uploadFile(document!, 'provider_docs', `${user?.id}/${document?.name}`);
        if (file.error) throw file.error;
        const {error} = await supabase.from('provider').insert({US, stripe, document: file.data?.path});
        if (error) throw error;
      }
    },
    onError: (error) => {
      console.log('🚀 ~ SelectRoleScreen ~ error:', error);
      Toast.show({type: 'error', text1: error?.message});
    },
  });

  const enable = role === 'user' || (role === 'provider' && document && stripe);

  return (
    <SafeAreaView className="flex-1 bg-white px-6">
      {!page ? (
        <Animated.View entering={FadeInDown.delay(500)}>
          <View className="mb-5 mt-16 items-center">
            <Text className="mb-2 text-center text-2xl font-bold text-black">How will you use VidaSana?</Text>
            <Text className="text-center text-base text-gray-500">Choose your role to continue</Text>
          </View>

          <View className="mt-5 gap-4">
            <TouchableOpacity
              onPress={() => setRole('user')}
              className={`rounded-xl border p-5 ${role === 'user' ? 'border-[#3E6065] bg-[#3E6065]' : 'border-gray-300 bg-gray-100'}`}>
              <Text className={`text-lg font-bold ${role === 'user' ? 'text-white' : 'text-[#3E6065]'}`}>Join Events</Text>
              <Text className={`mt-1 text-sm ${role === 'user' ? 'text-[#EAF4F2]' : 'text-gray-600'}`}>Discover and attend experiences</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setRole('provider')}
              className={`rounded-xl border p-5 ${role === 'provider' ? 'border-[#3E6065] bg-[#3E6065]' : 'border-gray-300 bg-gray-100'}`}>
              <Text className={`text-lg font-bold ${role === 'provider' ? 'text-white' : 'text-[#3E6065]'}`}>Host Events</Text>
              <Text className={`mt-1 text-sm ${role === 'provider' ? 'text-[#EAF4F2]' : 'text-gray-600'}`}>Create and manage your events</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      ) : (
        <Animated.View entering={FadeInDown.delay(500)} exiting={FadeInUp.delay(500)}>
          <View className="m-2 flex-row items-center justify-between">
            <Pressable onPress={reset}>
              <Ionicons name="arrow-back" size={24} color="#000" />
            </Pressable>
            <Text className="text-center text-2xl font-bold text-black">Provider Details</Text>
            <View className="w-6" />
          </View>

          <View className="mb-5 items-center">
            <Pressable
              onPress={() => pickPdf()}
              className="mb-1 mt-10 h-48 w-full items-center justify-center overflow-hidden rounded-lg bg-gray-200">
              <Ionicons size={52} color="#4B5563" name={document ? 'document-lock-outline' : 'cloud-upload-outline'} />
            </Pressable>
            <View className="flex-row items-center gap-3">
              <View className="flex-1 gap-3">
                <Text className="text-sm text-red-500">Note: File upload for IRS forms: W-9 (U.S.) or W-8BEN/W-8BEN-E (non-U.S.)</Text>
                <Pressable onPress={() => setUs((e) => !e)} className="my-4 flex-row items-center">
                  <View className="mr-2 h-5 w-5 items-center justify-center rounded border-2 border-black">
                    <View className={`h-2.5 w-2.5 rounded-sm ${US ? 'bg-[#E03C31]' : ''}`} />
                  </View>
                  <Text>Check if you are US resident</Text>
                </Pressable>
              </View>
            </View>

            <Text className="mt-4 w-full">Stripe Account ID:</Text>
            <View className={`mt-2 w-full rounded-xl border bg-gray-100 ${false ? 'border-red-300 bg-red-100' : 'border-transparent'}`}>
              <TextInput
                value={stripe}
                keyboardType="phone-pad"
                onChangeText={setStripe}
                placeholderTextColor="#999"
                placeholder="Stripe Account ID"
                className="m-0 h-14 px-4 text-base leading-5 text-black"
              />
            </View>
          </View>
          <Image />
        </Animated.View>
      )}
      <Pressable
        disabled={!enable}
        onPress={() => mutate(role as Role)}
        className={'mt-auto h-14 items-center justify-center rounded-2xl bg-[#3E6065] shadow ' + (enable ? 'opacity-100' : 'opacity-50')}>
        <Text className="text-lg font-semibold text-white">Continue</Text>
      </Pressable>
      <Loader visible={isPending} />
    </SafeAreaView>
  );
};

export default SelectRoleScreen;
