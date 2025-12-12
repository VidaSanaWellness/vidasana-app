import {AntDesign, Feather, Ionicons} from '@expo/vector-icons';
import {SafeAreaView} from 'react-native-safe-area-context';
import {supabase, uploadFile} from '@/utils/supabase';
import {Tables} from '@/types';
import {useForm, Controller} from 'react-hook-form';
import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
import {useRouter} from 'expo-router';
import {View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Image, Alert} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import React, {useState} from 'react';
import Toast from 'react-native-toast-message';

// Types
type Category = Tables<'categories'>;
type WeekDay = 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat';

type FormValues = {
  title: string;
  description: string;
  category: number | null;
  price: string;
  capacity: string;
  start_at: Date | null;
  end_at: Date | null;
  week_day: WeekDay[];
  images: ImagePicker.ImagePickerAsset[];
};

const DAYS: {label: string; value: WeekDay}[] = [
  {label: 'Mon', value: 'mon'},
  {label: 'Tue', value: 'tue'},
  {label: 'Wed', value: 'wed'},
  {label: 'Thu', value: 'thu'},
  {label: 'Fri', value: 'fri'},
  {label: 'Sat', value: 'sat'},
  {label: 'Sun', value: 'sun'},
];

export default function CreateServiceScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isTimePickerVisible, setTimePickerVisible] = useState(false);
  const [activeTimeField, setActiveTimeField] = useState<'start_at' | 'end_at' | null>(null);

  const {
    watch,
    control,
    setValue,
    handleSubmit,
    formState: {errors, isSubmitting},
  } = useForm<FormValues>({
    defaultValues: {
      title: '',
      description: '',
      category: null,
      price: '',
      capacity: '',
      start_at: null,
      end_at: null,
      week_day: [],
      images: [],
    },
  });

  const selectedImages = watch('images');

  // Fetch Categories
  const {data: categories, isLoading: isLoadingCategories} = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const {data, error} = await supabase.from('categories').select('*').eq('status', true);
      if (error) throw error;
      return data;
    },
  });

  // Create Service Mutation
  const createServiceMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      // 1. Get Current User
      const {
        data: {user},
      } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // 2. Upload Images
      const uploadedImagePaths: string[] = [];
      for (const image of data.images) {
        const fileExt = image.uri.split('.').pop();
        const fileName = `${user.id}/${Date.now()}_${String(Math.random()).slice(2, 7)}.${fileExt}`;
        const {data: uploadData, error: uploadError} = await uploadFile(image, 'images', fileName);

        if (uploadError) throw uploadError;
        if (uploadData?.path) uploadedImagePaths.push(uploadData.path);
      }

      const createPayload: any = {
        capacity: parseInt(data.capacity),
        category: data.category!,
        description: data.description,
        end_at: data.end_at!.toLocaleTimeString('en-US', {hour12: false}),
        price: parseFloat(data.price),
        start_at: data.start_at!.toLocaleTimeString('en-US', {hour12: false}),
        title: data.title,
        week_day: data.week_day,
      };

      if (uploadedImagePaths.length > 0) createPayload.images = uploadedImagePaths;

      const {error: insertError} = await supabase.from('services').insert(createPayload);

      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['services']});
      Toast.show({type: 'success', text1: 'Success', text2: 'Service created successfully!'});
      router.back();
    },
    onError: (error: any) => {
      console.error(error);
      Toast.show({type: 'error', text1: 'Error', text2: error.message || 'Failed to create service'});
    },
  });

  const onSubmit = (data: FormValues) => createServiceMutation.mutate(data);

  // Image Picker Logic
  const pickImages = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      const MAX_SIZE = 5 * 1024 * 1024; // 5MB
      const validImages: ImagePicker.ImagePickerAsset[] = [];
      let rejectedCount = 0;

      result.assets.forEach((asset) => {
        if (asset.fileSize && asset.fileSize <= MAX_SIZE) {
          validImages.push(asset);
        } else {
          rejectedCount++;
        }
      });

      if (rejectedCount > 0)
        Toast.show({type: 'error', text1: 'File too large', text2: `${rejectedCount} image(s) exceeded the 5MB limit and were skipped.`});

      if (validImages.length > 0) {
        const currentImages = watch('images');
        setValue('images', [...currentImages, ...validImages], {shouldValidate: true});
      }
    }
  };

  const removeImage = (index: number) => {
    const currentImages = watch('images');
    setValue(
      'images',
      currentImages.filter((_, i) => i !== index)
    );
  };

  // Time Picker Logic
  const handleConfirmTime = (date: Date) => {
    if (activeTimeField) {
      setValue(activeTimeField, date, {shouldValidate: true});
    }
    setTimePickerVisible(false);
    setActiveTimeField(null);
  };

  // Weekday Logic
  const toggleWeekDay = (day: WeekDay) => {
    const current = watch('week_day');
    if (current.includes(day)) {
      setValue(
        'week_day',
        current.filter((d) => d !== day),
        {shouldValidate: true}
      );
    } else {
      setValue('week_day', [...current, day], {shouldValidate: true});
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <DateTimePickerModal mode="time" onConfirm={handleConfirmTime} isVisible={!!isTimePickerVisible} onCancel={() => setTimePickerVisible(false)} />

      <ScrollView className="flex-1 p-4" showsVerticalScrollIndicator={false}>
        <View className="mb-6 flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-4 rounded-full bg-gray-100 p-2">
            <Ionicons name="arrow-back" size={24} color="black" />
          </TouchableOpacity>
          <Text className="text-2xl font-bold text-gray-900">Create New Service</Text>
        </View>

        {/* Title */}
        <View className="mb-4">
          <Text className="mb-1 text-sm font-medium text-gray-700">Service Title</Text>
          <Controller
            control={control}
            rules={{required: 'Title is required'}}
            name="title"
            render={({field: {onChange, value}}) => (
              <TextInput
                className="rounded-lg border border-gray-300 bg-white p-3"
                placeholder="e.g. Yoga Class"
                value={value}
                onChangeText={onChange}
              />
            )}
          />
          {errors.title && <Text className="mt-1 text-xs text-red-500">{errors.title.message}</Text>}
        </View>

        {/* Images */}
        <View className="mb-4">
          <Text className="mb-1 text-sm font-medium text-gray-700">Images</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2 flex-row">
            {selectedImages.map((img, index) => (
              <View key={index} className="relative mr-2">
                <Image source={{uri: img.uri}} className="h-24 w-24 rounded-lg" />
                <TouchableOpacity onPress={() => removeImage(index)} className="absolute right-1 top-1 rounded-full bg-red-500 p-1">
                  <AntDesign name="close" size={12} color="white" />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity
              onPress={pickImages}
              className="h-24 w-24 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50">
              <Feather name="camera" size={24} color="gray" />
              <Text className="mt-1 text-xs text-gray-500">Add Photos</Text>
            </TouchableOpacity>
          </ScrollView>
          <Controller
            control={control}
            name="images"
            rules={{validate: (val) => val.length > 0 || 'At least one image is required'}}
            render={() => <></>}
          />
          {errors.images && <Text className="mt-1 text-xs text-red-500">{errors.images.message}</Text>}
        </View>

        {/* Description */}
        <View className="mb-4">
          <Text className="mb-1 text-sm font-medium text-gray-700">Description</Text>
          <Controller
            control={control}
            rules={{required: 'Description is required'}}
            name="description"
            render={({field: {onChange, value}}) => (
              <TextInput
                className="h-24 rounded-lg border border-gray-300 bg-white p-3"
                placeholder="Describe your service..."
                multiline
                textAlignVertical="top"
                value={value}
                onChangeText={onChange}
              />
            )}
          />
          {errors.description && <Text className="mt-1 text-xs text-red-500">{errors.description.message}</Text>}
        </View>

        {/* Category */}
        <View className="mb-4">
          <Text className="mb-1 text-sm font-medium text-gray-700">Category</Text>
          {isLoadingCategories ? (
            <ActivityIndicator size="small" />
          ) : (
            <View className="flex-row flex-wrap gap-2">
              {categories?.map((cat) => {
                const isSelected = watch('category') === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => setValue('category', cat.id, {shouldValidate: true})}
                    className={`rounded-full border px-4 py-2 ${isSelected ? 'border-green-700 bg-green-700' : 'border-gray-300 bg-white'}`}>
                    <Text className={isSelected ? 'text-white' : 'text-gray-700'}>{cat.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
          <Controller control={control} name="category" rules={{required: 'Category is required'}} render={() => <></>} />
          {errors.category && <Text className="mt-1 text-xs text-red-500">{errors.category.message}</Text>}
        </View>

        {/* Price & Capacity Row */}
        <View className="mb-4 flex-row justify-between gap-4">
          <View className="flex-1">
            <Text className="mb-1 text-sm font-medium text-gray-700">Price</Text>
            <Controller
              control={control}
              rules={{required: 'Price is required'}}
              name="price"
              render={({field: {onChange, value}}) => (
                <View className="flex-row items-center rounded-lg border border-gray-300 bg-white px-3">
                  <Text className="mr-1 text-gray-500">$</Text>
                  <TextInput className="flex-1 py-3" placeholder="0.00" keyboardType="numeric" value={value} onChangeText={onChange} />
                </View>
              )}
            />
            {errors.price && <Text className="mt-1 text-xs text-red-500">{errors.price.message}</Text>}
          </View>

          <View className="flex-1">
            <Text className="mb-1 text-sm font-medium text-gray-700">Capacity</Text>
            <Controller
              control={control}
              rules={{required: 'Capacity is required'}}
              name="capacity"
              render={({field: {onChange, value}}) => (
                <TextInput
                  className="rounded-lg border border-gray-300 bg-white p-3"
                  placeholder="e.g. 10"
                  keyboardType="numeric"
                  value={value}
                  onChangeText={onChange}
                />
              )}
            />
            {errors.capacity && <Text className="mt-1 text-xs text-red-500">{errors.capacity.message}</Text>}
          </View>
        </View>

        {/* Time Row */}
        <View className="mb-4 flex-row justify-between gap-4">
          <View className="flex-1">
            <Text className="mb-1 text-sm font-medium text-gray-700">Start Time</Text>
            <Controller
              control={control}
              name="start_at"
              rules={{required: 'Start time required'}}
              render={({field: {value}, fieldState: {error}}) => (
                <View className="flex-1">
                  <TouchableOpacity
                    onPress={() => {
                      setActiveTimeField('start_at');
                      setTimePickerVisible(true);
                    }}
                    className="flex-row items-center justify-between rounded-lg border border-gray-300 bg-white p-3">
                    <Text className={value ? 'text-black' : 'text-gray-400'}>
                      {value?.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'}) || 'Select'}
                    </Text>
                    <Feather name="clock" size={18} color="gray" />
                  </TouchableOpacity>
                  {error?.message && <Text className="mt-1 text-xs text-red-500">{error?.message}</Text>}
                </View>
              )}
            />
          </View>

          <View className="flex-1">
            <Text className="mb-1 text-sm font-medium text-gray-700">End Time</Text>
            <Controller
              control={control}
              name="end_at"
              rules={{required: 'End time required'}}
              render={({field: {value}, fieldState: {error}}) => (
                <View className="flex-1">
                  <TouchableOpacity
                    onPress={() => {
                      setActiveTimeField('end_at');
                      setTimePickerVisible(true);
                    }}
                    className="flex-row items-center justify-between rounded-lg border border-gray-300 bg-white p-3">
                    <Text className={value ? 'text-black' : 'text-gray-400'}>
                      {value?.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'}) || 'Select'}
                    </Text>
                    <Feather name="clock" size={18} color="gray" />
                  </TouchableOpacity>
                  {error?.message && <Text className="mt-1 text-xs text-red-500">{error?.message}</Text>}
                </View>
              )}
            />
          </View>
        </View>

        {/* Week Days */}
        <View className="mb-6">
          <Text className="mb-2 text-sm font-medium text-gray-700">Available Days</Text>

          <Controller
            name="week_day"
            control={control}
            rules={{validate: (val) => val.length > 0 || 'Select at least one day'}}
            render={({field: {value}, fieldState: {error}}) => (
              <>
                <View className="flex-row flex-wrap justify-between">
                  {DAYS.map((day) => {
                    const isSelected = value?.includes(day.value);
                    return (
                      <TouchableOpacity
                        key={day.value}
                        onPress={() => toggleWeekDay(day.value)}
                        className={`mb-2 h-10 w-10 items-center justify-center rounded-full ${isSelected ? 'bg-green-700' : 'bg-gray-100'}`}>
                        <Text className={`text-xs font-medium ${isSelected ? 'text-white' : 'text-gray-600'}`}>{day.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {error?.message && <Text className="mt-1 text-xs text-red-500">{error?.message}</Text>}
              </>
            )}
          />
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          onPress={handleSubmit(onSubmit)}
          disabled={createServiceMutation.isPending || isSubmitting}
          className={`mb-10 items-center rounded-lg p-4 ${createServiceMutation.isPending ? 'bg-gray-400' : 'bg-green-700'}`}>
          {createServiceMutation.isPending ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-lg font-bold text-white">Create Service</Text>
          )}
        </TouchableOpacity>

        {/* Modals */}
      </ScrollView>
    </SafeAreaView>
  );
}
