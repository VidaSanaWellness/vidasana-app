import React, {useState} from 'react';
import {View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Image, Modal, Alert} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useLocalSearchParams, useRouter} from 'expo-router';
import {useForm, Controller, type FieldErrors} from 'react-hook-form';
import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
import {AntDesign, Feather} from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import Toast from 'react-native-toast-message';
import {supabase, uploadFile} from '@/utils/supabase';
import {Loader} from '@/components';
import {Enums} from '@/types';
import {useTranslation} from 'react-i18next';
import {ServiceFormValues, LanguageCode, UnifiedImage} from '@/types/service';
import {LANGUAGES, getDays} from '@/constants/service';

// Types

type WeekDay = Enums<'week_day'>;

export default function EditServiceScreen() {
  const router = useRouter();
  const {t} = useTranslation();
  const {id} = useLocalSearchParams<{id: string}>();
  const queryClient = useQueryClient();

  const [isTimePickerVisible, setTimePickerVisible] = useState(false);
  const [activeTimeField, setActiveTimeField] = useState<'start_at' | 'end_at' | null>(null);
  const [activeLanguage, setActiveLanguage] = useState<LanguageCode>('en');

  // Track initial images to calculate deletions
  const [initialImages, setInitialImages] = useState<UnifiedImage[]>([]);

  const {
    watch,
    reset,
    control,
    setValue,
    handleSubmit,
    formState: {errors},
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
    },
  });

  const selectedImages = watch('images');

  // 1. Fetch Categories
  const {data: categories} = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const {data, error} = await supabase.from('categories').select('*').eq('status', true);
      if (error) throw error;
      return data;
    },
  });

  // 2. Fetch Service Details & Pre-fill
  const {isLoading: isLoadingService} = useQuery({
    queryKey: ['service', id],
    queryFn: async () => {
      if (!id) throw new Error('No ID provided');
      const {data, error} = await supabase.from('services').select(`*, categories(*), service_translations(*)`).eq('id', id).single();

      if (error) throw error;

      // Transform Data for Form
      const loadedImages: UnifiedImage[] = (data.images || []).map((path: string) => ({
        id: path,
        path: path,
        type: 'existing',
        uri: supabase.storage.from('images').getPublicUrl(path).data.publicUrl,
      }));

      setInitialImages(loadedImages);

      // Helper to parse "HH:MM:SS" to Date
      const parseTime = (timeStr: string | null) => {
        if (!timeStr) return null;
        const d = new Date();
        const [h, m, s] = timeStr.split(':');
        d.setHours(parseInt(h), parseInt(m), parseInt(s || '0'));
        return d;
      };

      // Map translations
      const translationsMap: any = {
        en: {title: '', description: ''},
        es: {title: '', description: ''},
        fr: {title: '', description: ''},
      };

      if (data.service_translations && Array.isArray(data.service_translations)) {
        data.service_translations.forEach((t: any) => {
          if (translationsMap[t.lang_code]) {
            translationsMap[t.lang_code] = {
              title: t.title || '',
              description: t.description || '',
            };
          }
        });
      }

      reset({
        translations: translationsMap,
        category: data.category,
        price: data.price?.toString() ?? '',
        capacity: data.capacity?.toString() ?? '',
        start_at: parseTime(data.start_at),
        end_at: parseTime(data.end_at),
        week_day: (data.week_day as WeekDay[]) || [],
        images: loadedImages,
      });

      return data;
    },
    enabled: !!id,
  });

  // 3. Update Service Mutation
  const {mutate, isPending} = useMutation({
    mutationFn: async (data: ServiceFormValues) => {
      const {
        data: {user},
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Authenticated user required');

      // A. Upload New Images
      const finalImagePaths: string[] = [];

      // First, keep existing images that are still in the form
      for (const img of data.images) {
        if (img.type === 'existing' && img.path) {
          finalImagePaths.push(img.path);
        } else if (img.type === 'new' && img.file) {
          // Upload new
          const fileExt = img.file.uri.split('.').pop();
          const fileName = `${user.id}/${Date.now()}_${String(Math.random()).slice(2, 7)}.${fileExt}`;
          const {data: uploadData, error: uploadError} = await uploadFile(img.file, 'images', fileName);
          if (uploadError) throw uploadError;
          if (uploadData?.path) finalImagePaths.push(uploadData.path);
        }
      }

      // B. Update Database Record
      const {error: updateError} = await supabase
        .from('services')
        .update({
          // title/description removed
          category: data.category!,
          price: parseFloat(data.price),
          capacity: parseInt(data.capacity),
          start_at: data.start_at!.toLocaleTimeString('en-US', {hour12: false}),
          end_at: data.end_at!.toLocaleTimeString('en-US', {hour12: false}),
          week_day: data.week_day,
          images: finalImagePaths,
        })
        .eq('id', id as string);

      if (updateError) throw updateError;

      // C. Upsert Translations
      const translationUpserts = LANGUAGES.map((lang) => ({
        service_id: id as string,
        lang_code: lang.code,
        title: data.translations[lang.code].title,
        description: data.translations[lang.code].description,
      }));

      const {error: transError} = await supabase.from('service_translations').upsert(translationUpserts, {onConflict: 'service_id,lang_code'});

      if (transError) throw transError;

      // D. Delete Removed Images from Bucket (Cleanup)
      // Find paths present in initialImages but NOT in finalImagePaths
      const pathsToDelete = initialImages.filter((initImg) => initImg.path && !finalImagePaths.includes(initImg.path)).map((img) => img.path!);

      if (pathsToDelete.length > 0) {
        const {error: deleteError} = await supabase.storage.from('images').remove(pathsToDelete);
        if (deleteError) console.error('Failed to cleanup images:', deleteError);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['service', id]});
      queryClient.invalidateQueries({queryKey: ['services']});
      Toast.show({type: 'success', text1: 'Service Updated'});
      router.back();
    },
    onError: (err: any) => Toast.show({type: 'error', text1: 'Update Failed', text2: err.message}),
  });

  const onInvalid = (errors: FieldErrors<ServiceFormValues>) => {
    if (errors.translations) {
      for (const lang of LANGUAGES) {
        if (errors.translations[lang.code]?.title || errors.translations[lang.code]?.description) return setActiveLanguage(lang.code);
      }
    }
  };

  const pickImages = async (onChange: any) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      const MAX_SIZE = 5 * 1024 * 1024;
      const validNewImages: UnifiedImage[] = [];
      let rejected = 0;
      result.assets.forEach((asset) => {
        if (asset.fileSize && asset.fileSize <= MAX_SIZE) {
          validNewImages.push({id: asset.uri, type: 'new', uri: asset.uri, file: asset});
        } else {
          rejected++;
        }
      });
      if (rejected > 0) Toast.show({type: 'error', text1: `${rejected} images skipped (>5MB)`});
      onChange([...selectedImages, ...validNewImages]);
    }
  };

  const handleConfirmTime = (date: Date) => {
    if (activeTimeField) setValue(activeTimeField, date, {shouldValidate: true});
    setTimePickerVisible(false);
    setActiveTimeField(null);
  };

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
      {/* Header */}
      <View className="flex-row items-center border-b border-gray-100 p-4">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <Feather name="arrow-left" size={24} color="#374151" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900">{t('services.updateTitle')}</Text>
      </View>

      <ScrollView className="flex-1 p-4" showsVerticalScrollIndicator={false}>
        {/* Images */}
        <View className="mb-4">
          <Text className="mb-1 text-sm font-medium text-gray-700">{t('events.images')}</Text>
          <Controller
            control={control}
            name="images"
            rules={{validate: (val) => val.length > 0 || 'Required'}}
            render={({field: {onChange, value}, fieldState: {error}}) => (
              <>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2 flex-row">
                  {value?.map((img, index) => (
                    <View key={img.id || index} className="relative mr-2">
                      <Image source={{uri: img.uri}} className="h-24 w-24 rounded-lg bg-gray-100" />
                      <TouchableOpacity
                        onPress={() => onChange(value?.filter((_, i) => i !== index))}
                        className="absolute right-1 top-1 rounded-full bg-red-500 p-1">
                        <AntDesign name="close" size={12} color="white" />
                      </TouchableOpacity>
                    </View>
                  ))}
                  <TouchableOpacity
                    onPress={() => pickImages(onChange)}
                    className="h-24 w-24 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50">
                    <Feather name="camera" size={24} color="gray" />
                    <Text className="mt-1 text-xs text-gray-500">{t('events.addPhotos')}</Text>
                  </TouchableOpacity>
                </ScrollView>
                {error?.message && <Text className="mt-1 text-xs text-red-500">{error.message}</Text>}
              </>
            )}
          />
        </View>

        {/* Language Tabs */}
        <View className="mb-6 flex-row rounded-lg bg-gray-100 p-1">
          {LANGUAGES.map((lang, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => setActiveLanguage(lang.code)}
              className={`flex-1 items-center rounded-md py-2 ${activeLanguage === lang.code ? 'bg-white shadow-sm' : 'shadow-none'}`}>
              <Text className={`font-medium ${activeLanguage === lang.code ? 'text-green-700' : 'text-gray-500'}`}>{lang.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {LANGUAGES.map((lang) => (
          <View key={lang.code} style={{display: activeLanguage === lang.code ? 'flex' : 'none'}}>
            {/* Title (Multi-lang) */}
            <View className="mb-4">
              <Text className="mb-1 text-sm font-medium text-gray-700">
                {t('services.serviceTitle')} ({lang.label})
              </Text>
              <Controller
                control={control}
                rules={{required: t('validation.required')}}
                name={`translations.${lang.code}.title`}
                render={({field: {onChange, value}}) => (
                  <View>
                    <TextInput
                      className="rounded-lg border border-gray-300 px-4 py-3"
                      placeholder={t('services.serviceTitlePlaceholder')}
                      value={value}
                      onChangeText={onChange}
                    />
                    {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
                    {/* @ts-ignore */}
                    {errors.translations?.[lang.code]?.title && (
                      <Text className="mt-1 text-xs text-red-500">{errors.translations[lang.code]?.title?.message}</Text>
                    )}
                  </View>
                )}
              />
            </View>

            {/* Description (Multi-lang) */}
            <View className="mb-4">
              <Text className="mb-1 text-sm font-medium text-gray-700">
                {t('events.description')} ({lang.label})
              </Text>
              <Controller
                control={control}
                rules={{required: t('validation.required')}}
                name={`translations.${lang.code}.description`}
                render={({field: {onChange, value}}) => (
                  <View>
                    <TextInput
                      className="min-h-[100px] rounded-lg border border-gray-300 px-4 py-3 pb-4"
                      placeholder={t('events.descriptionPlaceholder')}
                      value={value}
                      multiline
                      textAlignVertical="top"
                      onChangeText={onChange}
                    />
                    {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
                    {/* @ts-ignore */}
                    {errors.translations?.[lang.code]?.description && (
                      <Text className="mt-1 text-xs text-red-500">{errors.translations[lang.code]?.description?.message}</Text>
                    )}
                  </View>
                )}
              />
            </View>
          </View>
        ))}

        {/* Category */}
        <View className="mb-4">
          <Text className="mb-1 text-sm font-medium text-gray-700">{t('events.category')}</Text>
          <Controller
            control={control}
            name="category"
            rules={{required: 'Category is required'}}
            render={({field: {onChange, value}, fieldState: {error}}) => (
              <>
                <View className="flex-row flex-wrap gap-2">
                  {categories?.map((cat) => {
                    const isSelected = value === cat.id;
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        onPress={() => onChange(cat.id)}
                        className={`rounded-full border px-4 py-2 ${isSelected ? 'border-green-700 bg-green-700' : 'border-gray-300 bg-white'}`}>
                        <Text className={isSelected ? 'text-white' : 'text-gray-700'}>{cat.name}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {error?.message && <Text className="mt-1 text-xs text-red-500">{error.message}</Text>}
              </>
            )}
          />
        </View>

        {/* Price & Capacity */}
        <View className="mb-4 flex-row justify-between gap-4">
          <View className="flex-1">
            <Text className="mb-1 text-sm font-medium text-gray-700">{t('events.price')}</Text>
            <Controller
              control={control}
              rules={{required: t('validation.required')}}
              name="price"
              render={({field: {onChange, value}, fieldState: {error}}) => (
                <>
                  <View className="flex-row items-center rounded-lg border border-gray-300 bg-white px-3">
                    <Text className="mr-1 text-gray-500">$</Text>
                    <TextInput className="flex-1 py-3" keyboardType="numeric" value={value} onChangeText={onChange} />
                  </View>
                  {error?.message && <Text className="mt-1 text-xs text-red-500">{error.message}</Text>}
                </>
              )}
            />
          </View>
          <View className="flex-1">
            <Text className="mb-1 text-sm font-medium text-gray-700">{t('events.capacity')}</Text>
            <Controller
              control={control}
              rules={{required: t('validation.required')}}
              name="capacity"
              render={({field: {onChange, value}, fieldState: {error}}) => (
                <>
                  <TextInput
                    value={value}
                    keyboardType="numeric"
                    onChangeText={onChange}
                    className="rounded-lg border border-gray-300 bg-white p-3"
                  />
                  {error?.message && <Text className="mt-1 text-xs text-red-500">{error.message}</Text>}
                </>
              )}
            />
          </View>
        </View>

        {/* Time */}
        <View className="mb-4 flex-row justify-between gap-4">
          {['start_at', 'end_at'].map((key) => (
            <View key={key} className="flex-1">
              <Text className="mb-1 text-sm font-medium text-gray-700">{key === 'start_at' ? t('events.startTime') : t('events.endTime')}</Text>
              <Controller
                control={control}
                name={key as any}
                rules={{required: 'Required'}}
                render={({field: {value}, fieldState: {error}}) => (
                  <TouchableOpacity
                    onPress={() => {
                      setActiveTimeField(key as any);
                      setTimePickerVisible(true);
                    }}
                    className="flex-row items-center justify-between rounded-lg border border-gray-300 bg-white p-3">
                    <Text className={value ? 'text-black' : 'text-gray-400'}>
                      {value instanceof Date
                        ? value.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})
                        : key === 'start_at'
                          ? t('events.selectStart')
                          : t('events.selectEnd')}
                    </Text>
                    <Feather name="clock" size={18} color="gray" />
                  </TouchableOpacity>
                )}
              />
            </View>
          ))}
        </View>

        {/* Days */}
        <View className="mb-6">
          <Text className="mb-2 text-sm font-medium text-gray-700">{t('services.availableDays')}</Text>
          <Controller
            name="week_day"
            control={control}
            rules={{validate: (val) => val.length > 0 || 'Required'}}
            render={({field: {value}, fieldState: {error}}) => (
              <>
                <View className="flex-row flex-wrap justify-between">
                  {getDays(t).map((day) => {
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

        <TouchableOpacity
          disabled={isPending}
          onPress={handleSubmit((data) => mutate(data), onInvalid)}
          className="mb-10 items-center rounded-lg bg-green-700 p-4">
          <Text className="text-lg font-bold text-white">{t('services.updateButton')}</Text>
        </TouchableOpacity>
      </ScrollView>
      <DateTimePickerModal mode="time" isVisible={isTimePickerVisible} onConfirm={handleConfirmTime} onCancel={() => setTimePickerVisible(false)} />
      <Loader visible={isLoadingService || isPending} />
    </SafeAreaView>
  );
}
