import {AntDesign, Feather, Ionicons} from '@expo/vector-icons';
import {SafeAreaView} from 'react-native-safe-area-context';
import {supabase, uploadFile} from '@/utils/supabase';
import {Tables} from '@/types';
import {useForm, Controller} from 'react-hook-form';
import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
import {useRouter} from 'expo-router';
import {View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Image, Alert} from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import React, {useState} from 'react';
import Toast from 'react-native-toast-message';
import {ImagePickerAsset, launchImageLibraryAsync, MediaTypeOptions} from 'expo-image-picker';
import {useTranslation} from 'react-i18next';
import LocationPickerModal from '@/components/modals/LocationPickerModal';
import {AppleMaps, GoogleMaps} from 'expo-maps';
import {Platform} from 'react-native';

import {EventFormValues, EventUnifiedImage, LanguageCode} from '@/types/events';
import {LANGUAGES} from '@/constants/events';

// Types
type Category = Tables<'categories'>;

export default function CreateEventScreen() {
  const {back} = useRouter();
  const {t} = useTranslation();
  const queryClient = useQueryClient();
  const [isTimePickerVisible, setTimePickerVisible] = useState(false);
  const [activeTimeField, setActiveTimeField] = useState<'start_at' | 'end_at' | 'book_till' | null>(null);
  const [datePickerMode, setDatePickerMode] = useState<'date' | 'time' | 'datetime'>('datetime');
  const [activeLanguage, setActiveLanguage] = useState<LanguageCode>('en');
  const [isLocationPickerVisible, setLocationPickerVisible] = useState(false);
  const MapComponent = Platform.OS === 'ios' ? AppleMaps.View : GoogleMaps.View;

  const {
    watch,
    control,
    setValue,
    handleSubmit,
    formState: {errors, isSubmitting},
  } = useForm<EventFormValues>({
    defaultValues: {
      translations: {
        en: {title: '', description: ''},
        es: {title: '', description: ''},
        fr: {title: '', description: ''},
      },
      category: null,
      start_at: null,
      end_at: null,
      book_till: null,
      images: [],
      ticket_types: [{name: 'General', price: '', capacity: ''}], // Start with one default
      lat: null,
      lng: null,
    },
  });

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
  const {mutate, isPending} = useMutation({
    mutationFn: async (data: EventFormValues) => {
      // 1. Get Current User
      const {
        data: {user},
      } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // 2. Upload Images
      const uploadedImagePaths: string[] = [];
      for (const image of data.images) {
        if (image.type === 'new' && image.file) {
          const fileExt = image.uri.split('.').pop();
          const fileName = `${user.id}/${Date.now()}_${String(Math.random()).slice(2, 7)}.${fileExt}`;
          const {data: uploadData, error: uploadError} = await uploadFile(image.file, 'images', fileName);

          if (uploadError) throw uploadError;
          if (uploadData?.path) {
            uploadedImagePaths.push(uploadData.path);
          }
        }
      }

      // 3. Insert Event (Base Data)
      const {data: eventData, error: insertError} = await supabase
        .from('events')
        .insert({
          // title and description removed
          category: data.category!,
          start_at: data.start_at!.toISOString(),
          end_at: data.end_at!.toISOString(),
          book_till: data.book_till ? data.book_till.toISOString() : null,
          images: uploadedImagePaths,
          provider: user.id,
          active: true,
          location: data.lat && data.lng ? `POINT(${data.lng} ${data.lat})` : null,
        })
        .select()
        .single();

      if (insertError) throw insertError;
      if (!eventData) throw new Error('Failed to create event record');

      // 4. Insert Translations
      const translationInserts = LANGUAGES.map((lang) => ({
        event_id: eventData.id,
        lang_code: lang.code,
        title: data.translations[lang.code].title,
        description: data.translations[lang.code].description,
      }));

      const {error: translationError} = await supabase.from('event_translations').insert(translationInserts);
      if (translationError) throw translationError;

      // 5. Insert Ticket Types
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
      queryClient.invalidateQueries({queryKey: ['events']});
      back();
    },
    onError: (error: any) => {
      console.error(error);
      Toast.show({type: 'error', text1: 'Error', text2: error.message || 'Failed to create event'});
    },
  });

  const onInvalid = (errors: any) => {
    if (errors.translations) {
      for (const lang of LANGUAGES) {
        if (errors.translations[lang.code]?.title || errors.translations[lang.code]?.description) {
          setActiveLanguage(lang.code);
          Toast.show({
            type: 'error',
            text1: 'Missing Information',
            text2: `Please fill in the ${lang.label} details.`,
          });
          return;
        }
      }
    }
    Toast.show({type: 'error', text1: 'Validation Error', text2: 'Please check the form for errors.'});
  };

  const onSubmit = (data: EventFormValues) => mutate(data);

  // --- Helpers ---

  const pickImages = async (value: EventUnifiedImage[], onChange: (images: EventUnifiedImage[]) => void) => {
    const result = await launchImageLibraryAsync({
      mediaTypes: MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      const MAX_SIZE = 5 * 1024 * 1024; // 5MB
      const validImages: ImagePickerAsset[] = [];
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
        const newImages: EventUnifiedImage[] = validImages.map((asset) => ({
          id: asset.uri,
          type: 'new',
          uri: asset.uri,
          file: asset,
        }));
        onChange([...(value || []), ...newImages]);
      }
    }
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
      <ScrollView className="flex-1 p-4" showsVerticalScrollIndicator={false}>
        <View className="mb-6 flex-row items-center">
          <TouchableOpacity onPress={() => back()} className="mr-4 rounded-full bg-gray-100 p-2">
            <Ionicons name="arrow-back" size={24} color="black" />
          </TouchableOpacity>
          <Text className="text-2xl font-bold text-gray-900">{t('events.createTitle')}</Text>
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
            <View className="mb-4">
              <Text className="mb-1 text-sm font-medium text-gray-700">
                {t('events.eventTitle')} ({lang.label})
              </Text>
              <Controller
                control={control}
                rules={{required: 'Title is required'}}
                name={`translations.${lang.code}.title`}
                render={({field: {onChange, value}}) => (
                  <TextInput
                    className="rounded-lg border border-gray-300 bg-white p-3"
                    placeholder={t('events.eventTitlePlaceholder')}
                    value={value}
                    onChangeText={onChange}
                  />
                )}
              />
              {errors.translations?.[lang.code]?.title && (
                <Text className="mt-1 text-xs text-red-500">{errors.translations[lang.code]?.title?.message}</Text>
              )}
            </View>

            <View className="mb-4">
              <Text className="mb-1 text-sm font-medium text-gray-700">
                {t('events.description')} ({lang.label})
              </Text>
              <Controller
                control={control}
                name={`translations.${lang.code}.description`}
                rules={{required: 'Description is required'}}
                render={({field: {onChange, value}}) => (
                  <TextInput
                    multiline
                    value={value}
                    textAlignVertical="top"
                    onChangeText={onChange}
                    placeholder={t('events.descriptionPlaceholder')}
                    className="h-24 rounded-lg border border-gray-300 bg-white p-3"
                  />
                )}
              />
              {errors.translations?.[lang.code]?.description && (
                <Text className="mt-1 text-xs text-red-500">{errors.translations[lang.code]?.description?.message}</Text>
              )}
            </View>
          </View>
        ))}

        <View className="mb-4">
          <Text className="mb-1 text-sm font-medium text-gray-700">{t('events.images')}</Text>
          <Controller
            name="images"
            control={control}
            rules={{validate: (val) => val?.length > 0 || 'At least one image is required'}}
            render={({field: {onChange, value}, fieldState: {error}}) => (
              <>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2 flex-row">
                  {value?.map((img, index) => (
                    <View key={index} className="relative mr-2">
                      <Image source={{uri: img.uri}} className="h-24 w-24 rounded-lg" />
                      <TouchableOpacity
                        onPress={() => onChange(value.filter((_, i) => i !== index))}
                        className="absolute right-1 top-1 rounded-full bg-red-500 p-1">
                        <AntDesign name="close" size={12} color="white" />
                      </TouchableOpacity>
                    </View>
                  ))}
                  <TouchableOpacity
                    onPress={() => pickImages(value, onChange)}
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

        <View className="mb-4">
          <Text className="mb-1 text-sm font-medium text-gray-700">{t('events.category')}</Text>
          <Controller
            name="category"
            control={control}
            rules={{required: 'Category is required'}}
            render={({field: {onChange, value}, fieldState: {error}}) => (
              <>
                {isLoadingCategories ? (
                  <ActivityIndicator size="small" />
                ) : (
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
                )}
                {error?.message && <Text className="mt-1 text-xs text-red-500">{error.message}</Text>}
              </>
            )}
          />
        </View>

        <View className="mb-4 gap-4">
          <View>
            <Text className="mb-1 text-sm font-medium text-gray-700">{t('events.startTime')}</Text>
            <Controller
              name="start_at"
              control={control}
              rules={{required: 'Start time is required'}}
              render={({field: {onChange, value}, fieldState: {error}}) => (
                <>
                  <TouchableOpacity onPress={() => openDatePicker('start_at')} className="rounded-lg border border-gray-300 bg-white p-3">
                    <Text className={value ? 'text-gray-900' : 'text-gray-400'}>
                      {value
                        ? `${value.toLocaleTimeString('en-US', {hour: '2-digit', minute: '2-digit', hour12: true})} - ${value.getDate().toString().padStart(2, '0')}/${(value.getMonth() + 1).toString().padStart(2, '0')}/${value.getFullYear().toString().slice(-2)}`
                        : t('events.selectStart')}
                    </Text>
                  </TouchableOpacity>
                  {error?.message && <Text className="mt-1 text-xs text-red-500">{error.message}</Text>}
                </>
              )}
            />
          </View>
          <View>
            <Text className="mb-1 text-sm font-medium text-gray-700">{t('events.endTime')}</Text>
            <Controller
              name="end_at"
              control={control}
              rules={{required: 'End time is required'}}
              render={({field: {onChange, value}, fieldState: {error}}) => (
                <>
                  <TouchableOpacity onPress={() => openDatePicker('end_at')} className="rounded-lg border border-gray-300 bg-white p-3">
                    <Text className={value ? 'text-gray-900' : 'text-gray-400'}>
                      {value
                        ? `${value.toLocaleTimeString('en-US', {hour: '2-digit', minute: '2-digit', hour12: true})} - ${value.getDate().toString().padStart(2, '0')}/${(value.getMonth() + 1).toString().padStart(2, '0')}/${value.getFullYear().toString().slice(-2)}`
                        : t('events.selectEnd')}
                    </Text>
                  </TouchableOpacity>
                  {error?.message && <Text className="mt-1 text-xs text-red-500">{error.message}</Text>}
                </>
              )}
            />
          </View>
        </View>

        <View className="mb-4">
          <Text className="mb-1 text-sm font-medium text-gray-700">{t('events.bookingDeadline')}</Text>
          <Controller
            name="book_till"
            control={control}
            rules={{required: 'Booking deadline is required'}}
            render={({field: {onChange, value}, fieldState: {error}}) => (
              <>
                <TouchableOpacity onPress={() => openDatePicker('book_till')} className="rounded-lg border border-gray-300 bg-white p-3">
                  <Text className={value ? 'text-gray-900' : 'text-gray-400'}>
                    {value ? value?.toLocaleDateString() : t('events.selectDeadline')}
                  </Text>
                </TouchableOpacity>
                {error?.message && <Text className="mt-1 text-xs text-red-500">{error.message}</Text>}
              </>
            )}
          />
        </View>

        {/* Location Section */}
        <View className="mb-6">
          <Text className="mb-2 text-sm font-medium text-gray-700">{t('events.location')}</Text>
          <Controller
            control={control}
            name="lat"
            render={({field: {value: lat}}) => {
              const lng = watch('lng');
              return (
                <View>
                  {lat && lng ? (
                    <View className="mb-3 h-40 overflow-hidden rounded-xl bg-gray-100">
                      <MapComponent
                        style={{flex: 1}}
                        cameraPosition={{
                          coordinates: {latitude: lat, longitude: lng},
                          zoom: 15,
                        }}
                        uiSettings={{
                          scrollGesturesEnabled: false,
                          zoomGesturesEnabled: false,
                        }}
                      />
                      {/* Overlay to catch taps */}
                      <TouchableOpacity
                        className="absolute bottom-0 left-0 right-0 top-0 items-center justify-center bg-black/10"
                        onPress={() => setLocationPickerVisible(true)}>
                        <View className="items-center justify-center rounded-full bg-white/90 p-2 shadow-sm">
                          <Feather name="edit-2" size={20} color="#15803d" />
                        </View>
                      </TouchableOpacity>
                    </View>
                  ) : null}

                  <TouchableOpacity
                    onPress={() => setLocationPickerVisible(true)}
                    className={`flex-row items-center justify-center rounded-xl border border-dashed p-4 ${lat ? 'border-green-300 bg-green-50' : 'border-gray-300 bg-gray-50'}`}>
                    <Feather name="map-pin" size={20} color={lat ? '#15803d' : '#9CA3AF'} />
                    <Text className={`ml-2 font-medium ${lat ? 'text-green-700' : 'text-gray-500'}`}>
                      {lat ? 'Change Location' : 'Select Location on Map'}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            }}
          />
        </View>

        {/* Ticket Types */}
        <View className="mb-6">
          <View className="mb-2 flex-row items-center justify-between">
            <Text className="text-sm font-medium text-gray-700">{t('events.ticketTypes')}</Text>
          </View>

          {ticketTypes.map((ticket, index) => (
            <View key={index} className="mb-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
              <View className="mb-2 flex-row items-center justify-between">
                <Text className="text-xs font-bold uppercase text-gray-500">
                  {t('events.ticketTypes')} #{index + 1}
                </Text>
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
                  render={({field: {onChange, value}, fieldState: {error}}) => (
                    <>
                      <TextInput
                        value={value}
                        onChangeText={onChange}
                        placeholder={t('events.ticketNamePlaceholder')}
                        className="rounded-lg border border-gray-300 bg-white p-3"
                      />
                      {error?.message && <Text className="mt-1 text-xs text-red-500">{error.message}</Text>}
                    </>
                  )}
                />
              </View>

              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Controller
                    control={control}
                    name={`ticket_types.${index}.price`}
                    render={({field: {onChange, value}, fieldState: {error}}) => (
                      <>
                        <View className="flex-row items-center rounded-lg border border-gray-300 bg-white px-3">
                          <Text className="mr-1 text-gray-500">$</Text>
                          <TextInput
                            className="flex-1 py-3"
                            placeholder={t('events.price')}
                            keyboardType="numeric"
                            value={value}
                            onChangeText={onChange}
                          />
                        </View>
                        {error?.message && <Text className="mt-1 text-xs text-red-500">{error.message}</Text>}
                      </>
                    )}
                  />
                </View>
                <View className="flex-1">
                  <Controller
                    control={control}
                    rules={{required: 'Required', min: 1}}
                    name={`ticket_types.${index}.capacity`}
                    render={({field: {onChange, value}, fieldState: {error}}) => (
                      <>
                        <TextInput
                          value={value}
                          placeholder={t('events.capacity')}
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
            </View>
          ))}

          <TouchableOpacity
            onPress={addTicketType}
            className="mt-2 flex-row items-center justify-center rounded-lg border border-dashed border-green-700 bg-green-50 p-3">
            <Feather name="plus" size={18} color="#15803d" />
            <Text className="ml-2 font-medium text-green-700">{t('events.addTicketType')}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={handleSubmit(onSubmit, onInvalid)}
          disabled={isPending || isSubmitting}
          className={`mb-10 items-center rounded-lg p-4 ${isPending ? 'bg-gray-400' : 'bg-green-700'}`}>
          {isPending ? <ActivityIndicator color="white" /> : <Text className="text-lg font-bold text-white">{t('events.createButton')}</Text>}
        </TouchableOpacity>
      </ScrollView>
      <DateTimePickerModal
        mode={datePickerMode}
        onConfirm={handleConfirmDate}
        isVisible={!!isTimePickerVisible}
        onCancel={() => setTimePickerVisible(false)}
        textColor="black"
        buttonTextColorIOS="black"
      />

      <LocationPickerModal
        visible={isLocationPickerVisible}
        onClose={() => setLocationPickerVisible(false)}
        initialLocation={watch('lat') && watch('lng') ? {lat: watch('lat')!, lng: watch('lng')!} : null}
        onConfirm={(loc) => {
          setValue('lat', loc.lat, {shouldValidate: true});
          setValue('lng', loc.lng, {shouldValidate: true});
        }}
      />
    </SafeAreaView>
  );
}
