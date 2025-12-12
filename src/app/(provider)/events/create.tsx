import {AntDesign, Feather, Ionicons} from '@expo/vector-icons';
import {SafeAreaView} from 'react-native-safe-area-context';
import {supabase, uploadFile} from '@/utils/supabase';
import {Tables} from '@/types';
import {useForm, Controller} from 'react-hook-form';
import {useQuery, useMutation} from '@tanstack/react-query';
import {useRouter} from 'expo-router';
import {View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Image, Alert} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import React, {useState} from 'react';
import Toast from 'react-native-toast-message';

// Types
type Category = Tables<'categories'>;

type TicketType = {
  name: string;
  price: string;
  capacity: string;
};

type FormValues = {
  title: string;
  description: string;
  category: number | null;
  start_at: Date | null;
  end_at: Date | null;
  book_till: Date | null;
  images: ImagePicker.ImagePickerAsset[];
  ticket_types: TicketType[];
};

export default function CreateEventScreen() {
  const router = useRouter();
  const [isTimePickerVisible, setTimePickerVisible] = useState(false);
  const [activeTimeField, setActiveTimeField] = useState<'start_at' | 'end_at' | 'book_till' | null>(null);
  const [datePickerMode, setDatePickerMode] = useState<'date' | 'time' | 'datetime'>('datetime');

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
      start_at: null,
      end_at: null,
      book_till: null,
      images: [],
      ticket_types: [{name: 'General', price: '', capacity: ''}], // Start with one default
    },
  });

  const selectedImages = watch('images');
  const ticketTypes = watch('ticket_types');

  // Fetch Categories
  const {data: categories, isLoading: isLoadingCategories} = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const {data, error} = await supabase.from('categories').select('*').eq('status', true);
      if (error) throw error;
      return data;
    },
  });

  // Create Event Mutation
  const createEventMutation = useMutation({
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
        if (uploadData?.path) {
          uploadedImagePaths.push(uploadData.path);
        }
      }

      // 3. Insert Event
      const {data: eventData, error: insertError} = await supabase
        .from('events')
        .insert({
          title: data.title,
          description: data.description,
          category: data.category!,
          start_at: data.start_at!.toISOString(),
          end_at: data.end_at!.toISOString(),
          book_till: data.book_till ? data.book_till.toISOString() : null,
          images: uploadedImagePaths,
          provider: user.id,
          status: 'active', // Default status? Since schema has status string.
        })
        .select()
        .single();

      if (insertError) throw insertError;
      if (!eventData) throw new Error('Failed to create event record');

      // 4. Insert Ticket Types
      if (data.ticket_types.length > 0) {
        const ticketsToInsert = data.ticket_types.map((ticket) => ({
          event_id: eventData.id,
          name: ticket.name,
          price: parseFloat(ticket.price) || 0,
          capacity: parseInt(ticket.capacity),
        }));

        const {error: ticketsError} = await supabase.from('event_ticket_types').insert(ticketsToInsert);
        if (ticketsError) {
          // Ideally we would rollback event here, but for MVP we'll just throw
          throw new Error(`Event created but tickets failed: ${ticketsError.message}`);
        }
      }
    },
    onSuccess: () => {
      Toast.show({type: 'success', text1: 'Success', text2: 'Event created successfully!'});
      router.back();
    },
    onError: (error: any) => {
      console.error(error);
      Toast.show({type: 'error', text1: 'Error', text2: error.message || 'Failed to create event'});
    },
  });

  const onSubmit = (data: FormValues) => createEventMutation.mutate(data);

  // --- Helpers ---

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

      if (rejectedCount > 0) Toast.show({type: 'error', text1: 'File too large', text2: `${rejectedCount} image(s) skipped (>5MB).`});

      if (validImages.length > 0) {
        setValue('images', [...(selectedImages || []), ...validImages], {shouldValidate: true});
      }
    }
  };

  const removeImage = (index: number) => {
    const current = watch('images');
    setValue(
      'images',
      current.filter((_, i) => i !== index),
      {shouldValidate: true}
    );
  };

  const openDatePicker = (field: 'start_at' | 'end_at' | 'book_till') => {
    setActiveTimeField(field);
    setDatePickerMode(field === 'book_till' ? 'date' : 'datetime');
    setTimePickerVisible(true);
  };

  const handleConfirmDate = (date: Date) => {
    if (activeTimeField) {
      setValue(activeTimeField, date, {shouldValidate: true});
    }
    setTimePickerVisible(false);
    setActiveTimeField(null);
  };

  // Ticket Management
  const addTicketType = () => {
    const current = watch('ticket_types');
    setValue('ticket_types', [...current, {name: '', price: '', capacity: ''}]);
  };

  const removeTicketType = (index: number) => {
    const current = watch('ticket_types');
    if (current.length > 1) {
      setValue(
        'ticket_types',
        current.filter((_, i) => i !== index)
      );
    } else {
      Toast.show({type: 'info', text1: 'Required', text2: 'You must have at least one ticket type.'});
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <DateTimePickerModal
        isVisible={!!isTimePickerVisible}
        mode={datePickerMode}
        onConfirm={handleConfirmDate}
        onCancel={() => setTimePickerVisible(false)}
      />

      <ScrollView className="flex-1 p-4" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="mb-6 flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-4 rounded-full bg-gray-100 p-2">
            <Ionicons name="arrow-back" size={24} color="black" />
          </TouchableOpacity>
          <Text className="text-2xl font-bold text-gray-900">Create New Event</Text>
        </View>

        {/* Title */}
        <View className="mb-4">
          <Text className="mb-1 text-sm font-medium text-gray-700">Event Title</Text>
          <Controller
            control={control}
            rules={{required: 'Title is required'}}
            name="title"
            render={({field: {onChange, value}}) => (
              <TextInput
                className="rounded-lg border border-gray-300 bg-white p-3"
                placeholder="e.g. Summer Music Festival"
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
            {selectedImages?.map((img, index) => (
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
            rules={{validate: (val) => val?.length > 0 || 'At least one image is required'}}
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
                placeholder="About the event..."
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

        {/* Date & Time */}
        <View className="mb-4 flex-row gap-4">
          <View className="flex-1">
            <Text className="mb-1 text-sm font-medium text-gray-700">Start Time</Text>
            <TouchableOpacity onPress={() => openDatePicker('start_at')} className="rounded-lg border border-gray-300 bg-white p-3">
              <Text className={watch('start_at') ? 'text-gray-900' : 'text-gray-400'}>
                {watch('start_at') ? watch('start_at')?.toLocaleString() : 'Select Start'}
              </Text>
            </TouchableOpacity>
            <Controller control={control} name="start_at" rules={{required: 'Start time is required'}} render={() => <></>} />
            {errors.start_at && <Text className="mt-1 text-xs text-red-500">{errors.start_at.message}</Text>}
          </View>
          <View className="flex-1">
            <Text className="mb-1 text-sm font-medium text-gray-700">End Time</Text>
            <TouchableOpacity onPress={() => openDatePicker('end_at')} className="rounded-lg border border-gray-300 bg-white p-3">
              <Text className={watch('end_at') ? 'text-gray-900' : 'text-gray-400'}>
                {watch('end_at') ? watch('end_at')?.toLocaleString() : 'Select End'}
              </Text>
            </TouchableOpacity>
            <Controller control={control} name="end_at" rules={{required: 'End time is required'}} render={() => <></>} />
            {errors.end_at && <Text className="mt-1 text-xs text-red-500">{errors.end_at.message}</Text>}
          </View>
        </View>

        {/* Booking Deadline */}
        <View className="mb-4">
          <Text className="mb-1 text-sm font-medium text-gray-700">Booking Deadline (Book Till)</Text>
          <TouchableOpacity onPress={() => openDatePicker('book_till')} className="rounded-lg border border-gray-300 bg-white p-3">
            <Text className={watch('book_till') ? 'text-gray-900' : 'text-gray-400'}>
              {watch('book_till') ? watch('book_till')?.toLocaleDateString() : 'Select Booking Deadline'}
            </Text>
          </TouchableOpacity>
          <Controller control={control} name="book_till" rules={{required: 'Booking deadline is required'}} render={() => <></>} />
          {errors.book_till && <Text className="mt-1 text-xs text-red-500">{errors.book_till.message}</Text>}
        </View>

        {/* Ticket Types */}
        <View className="mb-6">
          <View className="mb-2 flex-row items-center justify-between">
            <Text className="text-sm font-medium text-gray-700">Ticket Types</Text>
          </View>

          {ticketTypes.map((ticket, index) => (
            <View key={index} className="mb-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
              <View className="mb-2 flex-row items-center justify-between">
                <Text className="text-xs font-bold uppercase text-gray-500">Ticket #{index + 1}</Text>
                {ticketTypes.length > 1 && (
                  <TouchableOpacity onPress={() => removeTicketType(index)}>
                    <Feather name="trash-2" size={16} color="#ef4444" />
                  </TouchableOpacity>
                )}
              </View>

              <View className="mb-2">
                <Controller
                  control={control}
                  name={`ticket_types.${index}.name`}
                  rules={{required: 'Ticket name is required'}}
                  render={({field: {onChange, value}}) => (
                    <TextInput
                      className="rounded-lg border border-gray-300 bg-white p-3"
                      placeholder="Ticket Name (e.g. VIP)"
                      value={value}
                      onChangeText={onChange}
                    />
                  )}
                />
                {/* @ts-ignore - Dynamic error access */}
                {errors.ticket_types?.[index]?.name && <Text className="mt-1 text-xs text-red-500">Name is required</Text>}
              </View>

              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Controller
                    control={control}
                    name={`ticket_types.${index}.price`}
                    render={({field: {onChange, value}}) => (
                      <View className="flex-row items-center rounded-lg border border-gray-300 bg-white px-3">
                        <Text className="mr-1 text-gray-500">$</Text>
                        <TextInput className="flex-1 py-3" placeholder="Price" keyboardType="numeric" value={value} onChangeText={onChange} />
                      </View>
                    )}
                  />
                </View>
                <View className="flex-1">
                  <Controller
                    control={control}
                    name={`ticket_types.${index}.capacity`}
                    rules={{required: 'Required', min: 1}}
                    render={({field: {onChange, value}}) => (
                      <TextInput
                        className="rounded-lg border border-gray-300 bg-white p-3"
                        placeholder="Capacity"
                        keyboardType="numeric"
                        value={value}
                        onChangeText={onChange}
                      />
                    )}
                  />
                  {/* @ts-ignore */}
                  {errors.ticket_types?.[index]?.capacity && <Text className="mt-1 text-xs text-red-500">Required</Text>}
                </View>
              </View>
            </View>
          ))}

          <TouchableOpacity
            onPress={addTicketType}
            className="mt-2 flex-row items-center justify-center rounded-lg border border-dashed border-green-700 bg-green-50 p-3">
            <Feather name="plus" size={18} color="#15803d" />
            <Text className="ml-2 font-medium text-green-700">Add Another Ticket Type</Text>
          </TouchableOpacity>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          onPress={handleSubmit(onSubmit)}
          disabled={createEventMutation.isPending || isSubmitting}
          className={`mb-10 items-center rounded-lg p-4 ${createEventMutation.isPending ? 'bg-gray-400' : 'bg-green-700'}`}>
          {createEventMutation.isPending ? <ActivityIndicator color="white" /> : <Text className="text-lg font-bold text-white">Create Event</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
