import {AntDesign, Feather, Ionicons} from '@expo/vector-icons';
import {SafeAreaView} from 'react-native-safe-area-context';
import {supabase, uploadFile} from '@/utils/supabase';
import {useAppStore} from '@/store';
import {useForm, Controller, type FieldErrors} from 'react-hook-form';
import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
import {useRouter} from 'expo-router';
import {View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Image} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import React, {useState} from 'react';
import Toast from 'react-native-toast-message';
import {ServiceFormValues, LanguageCode, UnifiedImage, WeekDay} from '@/types/service';
import {LANGUAGES, getDays} from '@/constants/service';
import {useTranslation} from 'react-i18next';
import LocationPickerModal from '@/components/modals/LocationPickerModal';

export default function CreateServiceScreen() {
  const router = useRouter();
  const {t} = useTranslation();
  const queryClient = useQueryClient();
  const [isTimePickerVisible, setTimePickerVisible] = useState(false);
  const [isLocationPickerVisible, setLocationPickerVisible] = useState(false);
  const [activeTimeField, setActiveTimeField] = useState<'start_at' | 'end_at' | null>(null);
  const [activeLanguage, setActiveLanguage] = useState<LanguageCode>('en');

  const {
    watch,
    control,
    setValue,
    handleSubmit,
    formState: {errors, isSubmitting},
  } = useForm<ServiceFormValues>({
    defaultValues: {
      translations: {
        en: {title: '', description: ''},
        es: {title: '', description: ''},
        fr: {title: '', description: ''},
      },
      category: null,
      price: '',
      capacity: '',
      start_at: null,
      end_at: null,
      week_day: [],
      images: [],
      lat: null,
      lng: null,
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
    mutationFn: async (data: ServiceFormValues) => {
      // 1. Get Current User
      const {user} = useAppStore.getState().session!;
      if (!user) throw new Error('User not authenticated');

      // 2. Upload Images
      const uploadedImagePaths: string[] = [];
      for (const image of data.images) {
        if (image.type === 'new' && image.file) {
          const fileExt = image.uri.split('.').pop();
          const fileName = `${user.id}/${Date.now()}_${String(Math.random()).slice(2, 7)}.${fileExt}`;
          const {data: uploadData, error: uploadError} = await uploadFile(image.file, 'images', fileName);

          if (uploadError) throw uploadError;
          if (uploadData?.path) uploadedImagePaths.push(uploadData.path);
        }
      }

      // 3. Insert Service (Base Data)
      const createPayload: any = {
        capacity: parseInt(data.capacity),
        category: data.category!,
        // title and description removed from here
        end_at: data.end_at!.toLocaleTimeString('en-US', {hour12: false}),
        price: parseFloat(data.price),
        start_at: data.start_at!.toLocaleTimeString('en-US', {hour12: false}),
        week_day: data.week_day,
        location: data.lat && data.lng ? `POINT(${data.lng} ${data.lat})` : null,
      };

      if (uploadedImagePaths.length > 0) createPayload.images = uploadedImagePaths;

      const {data: serviceData, error: insertError} = await supabase.from('services').insert(createPayload).select().single();

      if (insertError) throw insertError;
      if (!serviceData) throw new Error('Failed to create service');

      // 4. Insert Translations
      const translationInserts = LANGUAGES.map((lang) => ({
        service_id: serviceData.id,
        lang_code: lang.code,
        title: data.translations[lang.code].title,
        description: data.translations[lang.code].description,
      }));

      const {error: translationError} = await supabase.from('service_translations').insert(translationInserts);

      if (translationError) {
        // Optional: rollback service creation if translation fails?
        // For now, just throw error
        throw translationError;
      }
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

  const onInvalid = (errors: FieldErrors<ServiceFormValues>) => {
    if (errors.translations) {
      for (const lang of LANGUAGES) {
        if (errors.translations[lang.code]?.title || errors.translations[lang.code]?.description) {
          return setActiveLanguage(lang.code);
        }
      }
    }
  };

  const onSubmit = (data: ServiceFormValues) => createServiceMutation.mutate(data);

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
        const newImages: UnifiedImage[] = validImages.map((asset) => ({
          id: asset.uri,
          type: 'new',
          uri: asset.uri,
          file: asset,
        }));
        setValue('images', [...currentImages, ...newImages], {shouldValidate: true});
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
    if (activeTimeField) setValue(activeTimeField, date, {shouldValidate: true});
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
          <Text className="font-nunito-bold text-2xl text-gray-900">{t('services.createTitle')}</Text>
        </View>

        {/* Language Tabs */}
        <View className="mb-6 flex-row rounded-lg bg-gray-100 p-1">
          {LANGUAGES.map((lang, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => setActiveLanguage(lang.code)}
              className={`flex-1 items-center rounded-md py-2 ${activeLanguage === lang.code ? 'bg-white shadow-sm' : 'shadow-none'}`}>
              <Text className={`font-nunito-bold ${activeLanguage === lang.code ? 'text-primary' : 'text-gray-500'}`}>{lang.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {LANGUAGES.map((lang) => (
          <View key={lang.code} style={{display: activeLanguage === lang.code ? 'flex' : 'none'}}>
            {/* Title (Multi-lang) */}
            <View className="mb-4">
              <Text className="mb-1 font-nunito-bold text-sm text-gray-700">
                {t('services.serviceTitle')} ({lang.label})
              </Text>
              <Controller
                control={control}
                rules={{required: t('validation.required')}}
                name={`translations.${lang.code}.title`}
                render={({field: {onChange, value}}) => (
                  <View>
                    <TextInput
                      className="rounded-lg border border-gray-300 bg-white p-3 font-nunito"
                      placeholder={t('services.serviceTitlePlaceholder')}
                      value={value}
                      onChangeText={onChange}
                    />
                    {errors.translations?.[lang.code]?.title && (
                      <Text className="mt-1 font-nunito text-xs text-red-500">{errors.translations[lang.code]?.title?.message}</Text>
                    )}
                  </View>
                )}
              />
            </View>

            {/* Description (Multi-lang) */}
            <View className="mb-4">
              <Text className="mb-1 font-nunito-bold text-sm text-gray-700">
                {t('events.description')} ({lang.label})
              </Text>
              <Controller
                control={control}
                rules={{required: t('validation.required')}}
                name={`translations.${lang.code}.description`}
                render={({field: {onChange, value}}) => (
                  <View>
                    <TextInput
                      className="min-h-[100px] rounded-lg border border-gray-300 bg-white p-3 font-nunito"
                      placeholder={t('events.descriptionPlaceholder')}
                      value={value}
                      multiline
                      textAlignVertical="top"
                      onChangeText={onChange}
                    />
                    {errors.translations?.[lang.code]?.description && (
                      <Text className="mt-1 font-nunito text-xs text-red-500">{errors.translations[lang.code]?.description?.message}</Text>
                    )}
                  </View>
                )}
              />
            </View>
          </View>
        ))}
        {/* Images */}
        <View className="mb-4">
          <Text className="mb-1 font-nunito-bold text-sm text-gray-700">{t('events.images')}</Text>
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
              <Text className="mt-1 font-nunito text-xs text-gray-500">{t('events.addPhotos')}</Text>
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

        {/* Category */}
        <View className="mb-4">
          <Text className="mb-1 font-nunito-bold text-sm text-gray-700">{t('events.category')}</Text>
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
                    className={`rounded-full border px-4 py-2 ${isSelected ? 'border-primary bg-primary' : 'border-gray-300 bg-white'}`}>
                    <Text className={`font-nunito-bold ${isSelected ? 'text-white' : 'text-gray-700'}`}>{cat.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
          <Controller control={control} name="category" rules={{required: 'Category is required'}} render={() => <></>} />
          {errors.category && <Text className="mt-1 text-xs text-red-500">{errors.category.message}</Text>}
        </View>

        {/* Location Selection */}
        <View className="mb-6">
          <Text className="mb-1 font-nunito-bold text-sm text-gray-700">Location</Text>
          <View className="flex-row items-center justify-between rounded-lg border border-gray-300 bg-white p-3">
            <View className="flex-row items-center">
              <View className={`h-8 w-8 items-center justify-center rounded-full ${watch('lat') ? 'bg-primary/10' : 'bg-gray-100'}`}>
                <Feather name="map-pin" size={16} color={watch('lat') ? '#00594f' : 'gray'} />
              </View>
              <Text className={`ml-3 font-nunito text-sm ${watch('lat') ? 'font-bold text-primary' : 'text-gray-500'}`}>
                {watch('lat') ? 'Location Selected' : 'No location selected'}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setLocationPickerVisible(true)} className="rounded-md bg-primary/10 px-3 py-1.5">
              <Text className="font-nunito-bold text-xs text-primary">{watch('lat') ? 'Change' : 'Pick on Map'}</Text>
            </TouchableOpacity>
          </View>
          {errors.lat && <Text className="mt-1 text-xs text-red-500">Location is required</Text>}
        </View>

        {/* Price & Capacity Row */}
        <View className="mb-4 flex-row justify-between gap-4">
          <View className="flex-1">
            <Text className="mb-1 font-nunito-bold text-sm text-gray-700">{t('events.price')}</Text>
            <Controller
              control={control}
              rules={{required: t('validation.required')}}
              name="price"
              render={({field: {onChange, value}}) => (
                <View className="flex-row items-center rounded-lg border border-gray-300 bg-white px-3">
                  <Text className="mr-1 font-nunito text-gray-500">$</Text>
                  <TextInput className="flex-1 py-3 font-nunito" placeholder="0.00" keyboardType="numeric" value={value} onChangeText={onChange} />
                </View>
              )}
            />
            {errors.price && <Text className="mt-1 font-nunito text-xs text-red-500">{errors.price.message}</Text>}
          </View>

          <View className="flex-1">
            <Text className="mb-1 font-nunito-bold text-sm text-gray-700">{t('events.capacity')}</Text>
            <Controller
              control={control}
              rules={{required: t('validation.required')}}
              name="capacity"
              render={({field: {onChange, value}}) => (
                <TextInput
                  className="rounded-lg border border-gray-300 bg-white p-3 font-nunito"
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
            <Text className="mb-1 font-nunito-bold text-sm text-gray-700">{t('events.startTime')}</Text>
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
                    <Text className={`font-nunito ${value ? 'text-gray-900' : 'text-gray-400'}`}>
                      {value?.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'}) || t('events.selectStart')}
                    </Text>
                    <Feather name="clock" size={18} color="gray" />
                  </TouchableOpacity>
                  {error?.message && <Text className="mt-1 text-xs text-red-500">{error?.message}</Text>}
                </View>
              )}
            />
          </View>

          <View className="flex-1">
            <Text className="mb-1 font-nunito-bold text-sm text-gray-700">{t('events.endTime')}</Text>
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
                    <Text className={`font-nunito ${value ? 'text-gray-900' : 'text-gray-400'}`}>
                      {value?.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'}) || t('events.selectEnd')}
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
          <Text className="mb-2 font-nunito-bold text-sm text-gray-700">{t('services.availableDays')}</Text>

          <Controller
            name="week_day"
            control={control}
            rules={{validate: (val) => val.length > 0 || 'Select at least one day'}}
            render={({field: {value}, fieldState: {error}}) => (
              <>
                <View className="flex-row flex-wrap justify-between">
                  {getDays(t).map((day) => {
                    const isSelected = value?.includes(day.value);
                    return (
                      <TouchableOpacity
                        key={day.value}
                        onPress={() => toggleWeekDay(day.value)}
                        className={`mb-2 h-10 w-10 items-center justify-center rounded-full ${isSelected ? 'bg-primary' : 'bg-gray-100'}`}>
                        <Text className={`font-nunito-bold text-xs ${isSelected ? 'text-white' : 'text-gray-600'}`}>{day.label}</Text>
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
          onPress={handleSubmit(onSubmit, onInvalid)}
          disabled={createServiceMutation.isPending || isSubmitting}
          className={`mb-10 items-center rounded-lg p-4 ${createServiceMutation.isPending ? 'bg-gray-400' : 'bg-primary'}`}>
          {createServiceMutation.isPending ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="font-nunito-bold text-lg text-white">{t('services.createButton')}</Text>
          )}
        </TouchableOpacity>

        {/* Modals */}
        <LocationPickerModal
          visible={isLocationPickerVisible}
          onClose={() => setLocationPickerVisible(false)}
          onConfirm={(loc) => {
            setValue('lat', loc.lat);
            setValue('lng', loc.lng);
          }}
          initialLocation={watch('lat') && watch('lng') ? {lat: watch('lat')!, lng: watch('lng')!} : null}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
