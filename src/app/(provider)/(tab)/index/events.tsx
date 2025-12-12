import {Link} from 'expo-router';
// import {CreateEvent} from '@/components'; // Assuming we'll have a CreateEvent
import {supabase} from '@/utils/supabase';
import {Feather} from '@expo/vector-icons';
import {useQuery} from '@tanstack/react-query';
import {ActivityIndicator, FlatList, Image, Pressable, Text, View} from 'react-native';

export default function EventsScreen() {
  const {data: events, isLoading} = useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const {
        data: {user},
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const {data, error} = await supabase.from('events').select('*').eq('provider', user.id).order('created_at', {ascending: false});

      if (error) throw error;
      return data;
    },
  });

  const renderItem = ({item}: {item: any}) => {
    // Get first image or placeholder
    const imageUrl = item.images && item.images.length > 0 ? supabase.storage.from('images').getPublicUrl(item.images[0]).data.publicUrl : null;

    return (
      <Link href={`/(provider)/events/${item.id}`} asChild>
        <Pressable className="mb-4 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <View className="flex-row">
            {/* Image (Left Side) - Keeping consistent 32x32 size */}
            <View className="h-32 w-32 bg-gray-200">
              {imageUrl ? (
                <Image source={{uri: imageUrl}} className="h-full w-full" resizeMode="cover" />
              ) : (
                <View className="h-full w-full items-center justify-center">
                  <Feather name="calendar" size={24} color="#9CA3AF" />
                </View>
              )}
            </View>

            {/* Content (Right Side) */}
            <View className="flex-1 justify-between p-3">
              <View>
                <View className="mb-1 flex-row items-start justify-between">
                  <Text className="flex-1 text-lg font-bold text-gray-900" numberOfLines={1}>
                    {item.title}
                  </Text>
                  {/* Events might have price or be free */}
                  {/* <Text className="text-sm font-semibold text-green-700">${item.price || 0}</Text> */}
                </View>
                <Text className="mb-2 text-xs text-gray-500" numberOfLines={2}>
                  {item.description}
                </Text>
              </View>

              <View>
                {/* Date/Time */}
                <View className="mb-1 flex-row items-center">
                  <Feather name="clock" size={12} color="#6B7280" />
                  <Text className="ml-1 text-xs text-gray-600">
                    {item.start_at} - {item.end_at}
                  </Text>
                </View>
                {/* We could add Date here if available in your schema */}
              </View>
            </View>
          </View>
        </Pressable>
      </Link>
    );
  };

  return (
    <View className="flex-1 bg-white">
      <View className="flex-1 px-4 pt-2">
        {isLoading ? (
          <ActivityIndicator size="large" color="#15803d" className="mt-10" />
        ) : (
          <FlatList
            data={events}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{paddingBottom: 100}}
            ListEmptyComponent={() => (
              <View className="mt-20 items-center justify-center">
                <View className="mb-4 h-24 w-24 items-center justify-center rounded-full bg-gray-50">
                  <Feather name="calendar" size={40} color="#D1D5DB" />
                </View>
                <Text className="mb-2 text-lg font-bold text-gray-900">No Events Yet</Text>
                <Text className="mb-6 text-center text-gray-500">Create your first event to get started.</Text>
              </View>
            )}
          />
        )}
      </View>

      {/* FAB */}
      <Link href="/(provider)/events/create" asChild>
        <Pressable className="absolute bottom-6 h-14 w-14 items-center justify-center self-center rounded-full bg-green-700 shadow-lg">
          <Feather name="plus" size={30} color="white" />
        </Pressable>
      </Link>
    </View>
  );
}
