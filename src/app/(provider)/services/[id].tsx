import React, {useState} from 'react';
import {View, Text, ScrollView, Image, TouchableOpacity, Alert, ActivityIndicator, Modal, Pressable} from 'react-native';
import {useLocalSearchParams, useRouter, Link} from 'expo-router';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
import {Feather} from '@expo/vector-icons';
import {supabase} from '@/utils/supabase';
import Toast from 'react-native-toast-message';

export default function ServiceDetailsScreen() {
  const {id} = useLocalSearchParams<{id: string}>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const {top} = useSafeAreaInsets();
  const [menuVisible, setMenuVisible] = useState(false);

  // Fetch Service Details
  const {
    error,
    isLoading,
    data: service,
  } = useQuery({
    queryKey: ['service', id],
    queryFn: async () => {
      const {data, error} = await supabase.from('services').select(`*, categories (name)`).eq('id', id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Toggle Status Mutation
  const toggleStatusMutation = useMutation({
    mutationFn: async (active: boolean) => {
      const {error} = await supabase
        .from('services')
        .update({active})
        .eq('id', id as string);
      if (error) throw error;
    },
    onSuccess: (_, newStatus) => {
      queryClient.invalidateQueries({queryKey: ['services']});
      queryClient.invalidateQueries({queryKey: ['service', id]});
      Toast.show({type: 'success', text1: newStatus ? 'Service enabled' : 'Service disabled'});
      setMenuVisible(false);
    },
    onError: (err: any) => {
      Toast.show({type: 'error', text1: 'Update failed', text2: err.message});
    },
  });

  const handleToggleStatus = () => {
    setMenuVisible(false);
    const isActive = service?.active;
    Alert.alert(
      isActive ? 'Disable Service' : 'Enable Service',
      isActive
        ? 'Are you sure you want to disable this service? Clients will no longer be able to book it.'
        : 'Are you sure you want to enable this service?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: isActive ? 'Disable' : 'Enable',
          style: isActive ? 'destructive' : 'default',
          onPress: () => toggleStatusMutation.mutate(!isActive),
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#15803d" />
      </View>
    );
  }

  if (error || !service) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white p-4">
        <Text className="mb-4 text-red-500">Failed to load service details.</Text>
        <TouchableOpacity onPress={() => router.back()} className="rounded-lg bg-gray-200 px-4 py-2">
          <Text>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // Generate Image URL (use first image for now, can be carousel later)
  const imageUrl =
    service.images && service.images.length > 0 ? supabase.storage.from('images').getPublicUrl(service.images[0]).data.publicUrl : null;

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View className="relative z-10 flex-row items-center justify-between border-b border-gray-100 px-4 py-3">
        <TouchableOpacity onPress={() => router.back()} className="-ml-2 p-2">
          <Feather name="arrow-left" size={24} color="black" />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setMenuVisible(true)} className="-mr-2 p-2">
          <Feather name="more-vertical" size={24} color="black" />
        </TouchableOpacity>

        {/* Custom Menu Modal/Popup */}
        <Modal transparent visible={menuVisible} animationType="fade" onRequestClose={() => setMenuVisible(false)}>
          <Pressable className="flex-1 bg-black/10" onPress={() => setMenuVisible(false)}>
            <View
              style={{marginTop: top + 60}}
              className="absolute right-4 w-40 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-lg">
              <Link href={`/(provider)/services/edit/${id}`} asChild onPress={() => setMenuVisible(false)}>
                <Pressable className="flex-row items-center border-b border-gray-50 px-4 py-3 active:bg-gray-50">
                  <Feather name="edit-2" size={16} color="#374151" />
                  <Text className="ml-3 text-gray-700">Edit</Text>
                </Pressable>
              </Link>

              <Pressable onPress={handleToggleStatus} className="flex-row items-center px-4 py-3 active:bg-gray-50">
                <Feather name={service.active ? 'slash' : 'check-circle'} size={16} color={service.active ? '#EF4444' : '#10B981'} />
                <Text className={`ml-3 ${service.active ? 'text-red-600' : 'text-green-600'}`}>{service.active ? 'Disable' : 'Enable'}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Modal>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Valid Image */}
        <View className="h-64 w-full bg-gray-100">
          {imageUrl ? (
            <Image source={{uri: imageUrl}} className="h-full w-full" resizeMode="cover" />
          ) : (
            <View className="flex-1 items-center justify-center">
              <Feather name="image" size={48} color="#D1D5DB" />
            </View>
          )}
        </View>

        <View className="p-5 pb-20">
          {/* Category & Status */}
          <View className="mb-2 flex-row items-center justify-between">
            <View className="rounded-full bg-green-100 px-3 py-1">
              <Text className="text-xs font-bold uppercase text-green-700">{service.categories?.name || 'Service'}</Text>
            </View>
            <View className={`flex-row items-center rounded-full px-2 py-1 ${service.active ? 'bg-green-100' : 'bg-red-100'}`}>
              <View className={`mr-1.5 h-2 w-2 rounded-full ${service.active ? 'bg-green-500' : 'bg-red-500'}`} />
              <Text className={`text-xs font-medium ${service.active ? 'text-green-700' : 'text-red-700'}`}>
                {service.active ? 'Active' : 'Disabled'}
              </Text>
            </View>
          </View>

          {/* Title & Price */}
          <View className="mb-4 flex-row items-start justify-between">
            <Text className="mr-2 flex-1 text-2xl font-bold text-gray-900">{service.title}</Text>
            <Text className="text-2xl font-bold text-green-700">${service.price}</Text>
          </View>

          {/* Details Row */}
          <View className="mb-6 flex-row justify-between rounded-xl bg-gray-50 p-4">
            <View className="flex-1 items-center border-r border-gray-200">
              <Feather name="clock" size={20} color="#4B5563" className="mb-1" />
              <Text className="mb-1 text-xs text-gray-500">Duration</Text>
              <Text className="font-semibold text-gray-900">
                {service.start_at?.slice(0, 5)} - {service.end_at?.slice(0, 5)}
              </Text>
            </View>
            <View className="flex-1 items-center">
              <Feather name="users" size={20} color="#4B5563" className="mb-1" />
              <Text className="mb-1 text-xs text-gray-500">Capacity</Text>
              <Text className="font-semibold text-gray-900">{service.capacity} People</Text>
            </View>
          </View>

          {/* Description */}
          <Text className="mb-2 text-lg font-bold text-gray-900">About Service</Text>
          <Text className="mb-6 leading-6 text-gray-600">{service.description || 'No description provided.'}</Text>

          {/* Schedule */}
          <Text className="mb-3 text-lg font-bold text-gray-900">Schedule</Text>
          <View className="flex-row flex-wrap gap-2">
            {['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((day) => {
              const isActive = service.week_day?.includes(day);
              return (
                <View key={day} className={`h-10 w-10 items-center justify-center rounded-full ${isActive ? 'bg-green-700' : 'bg-gray-100'}`}>
                  <Text className={`text-xs font-bold uppercase ${isActive ? 'text-white' : 'text-gray-400'}`}>{day.slice(0, 3)}</Text>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
