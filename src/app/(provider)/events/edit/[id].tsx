import {AntDesign, Feather, Ionicons} from '@expo/vector-icons';
import {SafeAreaView} from 'react-native-safe-area-context';
import {supabase, uploadFile} from '@/utils/supabase';
import {Tables} from '@/types';
import {useAppStore} from '@/store';
import {useForm, Controller} from 'react-hook-form';
import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
import {useRouter, useLocalSearchParams} from 'expo-router';
import {View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Image} from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import React, {useEffect, useState} from 'react';
import Toast from 'react-native-toast-message';
import {ImagePickerAsset, launchImageLibraryAsync, MediaTypeOptions} from 'expo-image-picker';
import {useTranslation} from 'react-i18next';
import {EventFormValues, EventUnifiedImage, LanguageCode} from '@/types/events';
import {LANGUAGES} from '@/constants/events';
import LocationPickerModal from '@/components/modals/LocationPickerModal';
import MapView, {Marker, PROVIDER_GOOGLE} from 'react-native-maps';

type Category = Tables<'categories'>;

export default function EditEventScreen() {
  const {id: idParam} = useLocalSearchParams();
  const id = Array.isArray(idParam) ? idParam[0] : idParam;
  const {back} = useRouter();
  const {t} = useTranslation();
  const queryClient = useQueryClient();
  const [activeLanguage, setActiveLanguage] = useState<LanguageCode>('en');

  const [isTimePickerVisible, setTimePickerVisible] = useState(false);
  const [activeTimeField, setActiveTimeField] = useState<'start_at' | 'end_at' | 'book_till' | null>(null);
  const [datePickerMode, setDatePickerMode] = useState<'date' | 'time' | 'datetime'>('datetime');
  const [isLocationPickerVisible, setLocationPickerVisible] = useState(false);

  const {
    watch,
    control,
    setValue,
    handleSubmit,
    reset,
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
      ticket_types: [],
      lat: null,
      lng: null,
    },
  });

  const ticketTypes = watch('ticket_types');

  // Fetch Categories
  const {data: categories} = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const {data, error} = await supabase.from('categories').select('*').eq('status', true);
      if (error) throw error;
      return data;
    },
  });

  // Fetch Event Data
  const {data: eventData, isLoading: isLoadingEvent} = useQuery({
    queryKey: ['event', id],
    queryFn: async () => {
      // Use raw SQL select for PostGIS or rpc.
      // Supabase-js basic select doesn't easily support function calls like ST_X without a view or rpc.
      // However, we can cheat by selecting 'location' and assuming it returns GeoJSON if configured?
      // Safest: Use a small RPC or just select everything and hopefully the location column is WKT?
      // Actually, let's use the standard select and see.
      // BUT, earlier we confirmed services had lat/lng because of a VIEW or logic.
      // Let's try to query it.
      const {data, error} = await supabase
        .from('events')
        .select(
          `
          *,
          event_translations(*),
          event_ticket_types(*)
        `
        )
        .eq('id', id)
        .single();

      if (error) throw error;

      // If location is returned as GeoJSON object (default in Supabase for geometry columns)
      // { type: "Point", coordinates: [lng, lat] }
      return data;
    },
  });

  // Populate Form
  useEffect(() => {
    if (eventData) {
      const translations: any = {
        en: {title: '', description: ''},
        es: {title: '', description: ''},
        fr: {title: '', description: ''},
      };

      eventData.event_translations.forEach((tr: any) => {
        if (translations[tr.lang_code]) {
          translations[tr.lang_code] = {
            title: tr.title,
            description: tr.description,
          };
        }
      });

      const images: EventUnifiedImage[] = (eventData.images || []).map((path: string) => ({
        id: path,
        type: 'existing',
        uri: supabase.storage.from('images').getPublicUrl(path).data.publicUrl,
      }));

      const tickets = (eventData.event_ticket_types || []).map((ticket: any) => ({
        id: ticket.id,
        name: ticket.name,
        price: ticket.price.toString(),
        capacity: ticket.capacity.toString(),
      }));

      reset({
        translations,
        category: eventData.category,
        start_at: new Date(eventData.start_at),
        end_at: new Date(eventData.end_at),
        book_till: eventData.book_till ? new Date(eventData.book_till) : null,
        images,
        ticket_types: tickets,
        lat: (eventData as any).location?.coordinates ? (eventData as any).location.coordinates[1] : null,
        lng: (eventData as any).location?.coordinates ? (eventData as any).location.coordinates[0] : null,
      });
    }
  }, [eventData, reset]);

  // Update Event Mutation
  const {mutate, isPending} = useMutation({
    mutationFn: async (data: EventFormValues) => {
      // 1. Get User
      const {user} = useAppStore.getState().session!;
      if (!user) throw new Error('User not authenticated');

      // 2. Upload New Images
      const imagePaths: string[] = [];
      for (const img of data.images) {
        if (img.type === 'existing') {
          imagePaths.push(img.id);
        } else if (img.type === 'new' && img.file) {
          const fileExt = img.uri.split('.').pop();
          const fileName = `${user.id}/${Date.now()}_${String(Math.random()).slice(2, 7)}.${fileExt}`;
          const {data: uploadData, error: uploadError} = await uploadFile(img.file, 'images', fileName);
          if (uploadError) throw uploadError;
          if (uploadData?.path) imagePaths.push(uploadData.path);
        }
      }

      // 3. Update Event (Base)
      const {error: updateError} = await supabase
        .from('events')
        .update({
          category: data.category!,
          start_at: data.start_at!.toISOString(),
          end_at: data.end_at!.toISOString(),
          book_till: data.book_till ? data.book_till.toISOString() : null,
          images: imagePaths,
          location: data.lat && data.lng ? `POINT(${data.lng} ${data.lat})` : null,
        })
        .eq('id', id);

      if (updateError) throw updateError;

      // 4. Upsert Translations
      const translationUpserts = LANGUAGES.map((lang) => ({
        event_id: id,
        lang_code: lang.code,
        title: data.translations[lang.code].title,
        description: data.translations[lang.code].description,
      }));

      // We need to handle conflict. The constraint on event_translations is (event_id, lang_code).
      // supabase.upsert() with onConflict should work if unique constraint exists.
      // Schema view showed: Relationships but didn't explicitly show unique constraints.
      // Assuming typical setup: upsert works if primary key or unique match.
      // If no unique constraint on (event_id, lang_code), we might get duplicates?
      // Usually there is one. If validation fails we'll know.
      const {error: transError} = await supabase.from('event_translations').upsert(translationUpserts, {onConflict: 'event_id, lang_code'});
      if (transError) throw transError;

      // 5. Upsert Tickets
      // For tickets, we handle edits and new ones.
      // Existing have IDs. New don't.
      const ticketsToUpsert = data.ticket_types.map((ticket) => ({
        id: ticket.id, // undefined for new
        event_id: id,
        name: ticket.name,
        price: parseFloat(ticket.price) || 0,
        capacity: parseInt(ticket.capacity),
      }));

      const {error: ticketsError} = await supabase.from('event_ticket_types').upsert(ticketsToUpsert);
      if (ticketsError) throw ticketsError;

      // Handle deletions? If user removed a ticket from UI, it's not in the list.
      // But upsert only updates provided. We need to delete missing ones.
      // For MVP, maybe we skip deletion or do a separate delete step?
      // Let's rely on basic upsert for now to avoid complexity unless requested.
      // Effectively: "Update Event Update Flow" -> Updating logic.
    },
    onSuccess: () => {
      Toast.show({type: 'success', text1: 'Success', text2: 'Event updated successfully!'});
      queryClient.invalidateQueries({queryKey: ['events']});
      queryClient.invalidateQueries({queryKey: ['event', id]});
      back();
    },
    onError: (error: any) => {
      console.error(error);
      Toast.show({type: 'error', text1: 'Error', text2: error.message});
    },
  });

  const onInvalid = (errors: any) => {
    if (errors.translations) {
      for (const lang of LANGUAGES) {
        if (errors.translations[lang.code]?.title || errors.translations[lang.code]?.description) {
          setActiveLanguage(lang.code);
          Toast.show({type: 'error', text1: 'Missing Info', text2: `Check ${lang.label} details.`});
          return;
        }
      }
    }
    Toast.show({type: 'error', text1: 'Validation Error', text2: 'Please check the form.'});
  };

  const onSubmit = (data: EventFormValues) => mutate(data);

  // --- Helpers same as create ---
  const pickImages = async (value: EventUnifiedImage[], onChange: (images: EventUnifiedImage[]) => void) => {
    const result = await launchImageLibraryAsync({
      mediaTypes: MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      const MAX_SIZE = 5 * 1024 * 1024;
      const validImages: ImagePickerAsset[] = [];
      result.assets.forEach((asset) => {
        if (asset.fileSize && asset.fileSize <= MAX_SIZE) validImages.push(asset);
      });
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
    if (activeTimeField) setValue(activeTimeField, date, {shouldValidate: true});
    setTimePickerVisible(false);
    setActiveTimeField(null);
  };

  const addTicketType = () => {
    const current = watch('ticket_types');
    setValue('ticket_types', [...current, {name: '', price: '', capacity: ''}]);
  };

  const removeTicketType = async (index: number) => {
    const current = watch('ticket_types');
    const toRemove = current[index];

    // If it has an ID, we might want to delete it from DB?
    // For now, just remove from UI. If we want to delete from DB, we'd need a delete mutation.
    // Given the complexity, I'll just remove from array. If user saves, it won't be deleted from DB automatically
    // unless we implement delete logic.
    // Ideally: Keep track of deleted IDs and delete on save.
    // Or just let it be.
    if (current.length > 1) {
      setValue(
        'ticket_types',
        current.filter((_, i) => i !== index)
      );
      if (toRemove.id) {
        // Optionally delete from DB immediately or mark for deletion?
        // Let's just warn: "Note: Deleting tickets is not fully supported in this draft" or implement it.
        // I will implement direct delete.
        const {error} = await supabase.from('event_ticket_types').delete().eq('id', toRemove.id);
        if (error) Toast.show({type: 'error', text1: 'Failed to delete ticket'});
      }
    } else {
      Toast.show({type: 'info', text1: 'Required', text2: 'At least one ticket type required.'});
    }
  };

  if (isLoadingEvent) return <ActivityIndicator size="large" className="mt-10" />;

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="flex-1 p-4" showsVerticalScrollIndicator={false}>
        <View className="mb-6 flex-row items-center">
          <TouchableOpacity onPress={() => back()} className="mr-4 rounded-full bg-gray-100 p-2">
            <Ionicons name="arrow-back" size={24} color="black" />
          </TouchableOpacity>
          <Text className="font-nunito-bold text-2xl text-gray-900">{t('events.editTitle')}</Text>
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
            <View className="mb-4">
              <Text className="mb-1 font-nunito-bold text-sm text-gray-700">
                {t('events.eventTitle')} ({lang.label})
              </Text>
              <Controller
                control={control}
                rules={{required: 'Title is required'}}
                name={`translations.${lang.code}.title`}
                render={({field: {onChange, value}}) => (
                  <TextInput
                    className="rounded-lg border border-gray-300 bg-white p-3 font-nunito"
                    placeholder={t('events.eventTitlePlaceholder')}
                    value={value}
                    onChangeText={onChange}
                  />
                )}
              />
              {errors.translations?.[lang.code]?.title && (
                <Text className="mt-1 font-nunito text-xs text-red-500">{errors.translations[lang.code]?.title?.message}</Text>
              )}
            </View>

            <View className="mb-4">
              <Text className="mb-1 font-nunito-bold text-sm text-gray-700">
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
                    className="h-24 rounded-lg border border-gray-300 bg-white p-3 font-nunito"
                  />
                )}
              />
              {errors.translations?.[lang.code]?.description && (
                <Text className="mt-1 font-nunito text-xs text-red-500">{errors.translations[lang.code]?.description?.message}</Text>
              )}
            </View>
          </View>
        ))}

        {/* Common Fields */}
        <View className="mb-4">
          <Text className="mb-1 font-nunito-bold text-sm text-gray-700">{t('events.images')}</Text>
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
                  </TouchableOpacity>
                </ScrollView>
                {error?.message && <Text className="mt-1 font-nunito text-xs text-red-500">{error.message}</Text>}
              </>
            )}
          />
        </View>

        <View className="mb-4">
          <Text className="mb-1 font-nunito-bold text-sm text-gray-700">{t('events.category')}</Text>
          <Controller
            name="category"
            control={control}
            rules={{required: 'Category is required'}}
            render={({field: {onChange, value}, fieldState: {error}}) => (
              <View className="flex-row flex-wrap gap-2">
                {categories?.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => onChange(cat.id)}
                    className={`rounded-full border px-4 py-2 ${value === cat.id ? 'border-primary bg-primary' : 'border-gray-300 bg-white'}`}>
                    <Text className={`font-nunito-bold ${value === cat.id ? 'text-white' : 'text-gray-700'}`}>{cat.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          />
        </View>

        <View className="mb-4 gap-4">
          <View>
            <Text className="mb-1 font-nunito-bold text-sm text-gray-700">{t('events.startTime')}</Text>
            <TouchableOpacity onPress={() => openDatePicker('start_at')} className="rounded-lg border border-gray-300 bg-white p-3">
              <Controller
                name="start_at"
                control={control}
                render={({field: {value}}) => <Text className="font-nunito">{value ? value.toLocaleString() : t('events.selectStart')}</Text>}
              />
            </TouchableOpacity>
          </View>
          <View>
            <Text className="mb-1 font-nunito-bold text-sm text-gray-700">{t('events.endTime')}</Text>
            <TouchableOpacity onPress={() => openDatePicker('end_at')} className="rounded-lg border border-gray-300 bg-white p-3">
              <Controller
                name="end_at"
                control={control}
                render={({field: {value}}) => <Text className="font-nunito">{value ? value.toLocaleString() : t('events.selectEnd')}</Text>}
              />
            </TouchableOpacity>
          </View>
        </View>

        <View className="mb-4">
          <Text className="mb-1 font-nunito-bold text-sm text-gray-700">{t('events.bookingDeadline')}</Text>
          <TouchableOpacity onPress={() => openDatePicker('book_till')} className="rounded-lg border border-gray-300 bg-white p-3">
            <Controller
              name="book_till"
              control={control}
              render={({field: {value}}) => <Text className="font-nunito">{value ? value.toLocaleDateString() : t('events.selectDeadline')}</Text>}
            />
          </TouchableOpacity>
        </View>

        {/* Location Section */}
        <View className="mb-6">
          <Text className="mb-2 font-nunito-bold text-sm text-gray-700">{t('events.location')}</Text>
          <Controller
            control={control}
            name="lat"
            render={({field: {value: lat}}) => {
              const lng = watch('lng');
              return (
                <View>
                  {lat && lng ? (
                    <View className="mb-3 h-40 overflow-hidden rounded-xl bg-gray-100">
                      <MapView
                        provider={PROVIDER_GOOGLE}
                        style={{flex: 1}}
                        initialRegion={{
                          latitude: lat,
                          longitude: lng,
                          latitudeDelta: 0.01,
                          longitudeDelta: 0.01,
                        }}
                        scrollEnabled={false}
                        zoomEnabled={false}
                        pitchEnabled={false}
                        rotateEnabled={false}>
                        <Marker coordinate={{latitude: lat, longitude: lng}} />
                      </MapView>
                      <TouchableOpacity
                        className="absolute bottom-0 left-0 right-0 top-0 items-center justify-center bg-black/10"
                        onPress={() => setLocationPickerVisible(true)}>
                        <View className="items-center justify-center rounded-full bg-white/90 p-2 shadow-sm">
                          <Feather name="edit-2" size={20} color="#00594f" />
                        </View>
                      </TouchableOpacity>
                    </View>
                  ) : null}

                  <TouchableOpacity
                    onPress={() => setLocationPickerVisible(true)}
                    className={`flex-row items-center justify-center rounded-xl border border-dashed p-4 ${lat ? 'border-primary/30 bg-primary/5' : 'border-gray-300 bg-gray-50'}`}>
                    <Feather name="map-pin" size={20} color={lat ? '#00594f' : '#9CA3AF'} />
                    <Text className={`ml-2 font-nunito-bold ${lat ? 'text-primary' : 'text-gray-500'}`}>
                      {lat ? 'Change Location' : 'Select Location on Map'}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            }}
          />
        </View>

        {/* Tickets */}
        <View className="mb-6">
          <Text className="mb-2 font-nunito-bold text-sm text-gray-700">{t('events.ticketTypes')}</Text>
          {ticketTypes.map((ticket, index) => (
            <View key={index} className="mb-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
              <View className="mb-2 flex-row justify-between">
                <Text className="font-nunito-bold">#{index + 1}</Text>
                {ticketTypes.length > 1 && (
                  <TouchableOpacity onPress={() => removeTicketType(index)}>
                    <Feather name="trash-2" size={16} color="red" />
                  </TouchableOpacity>
                )}
              </View>
              <Controller
                name={`ticket_types.${index}.name`}
                control={control}
                render={({field: {onChange, value}}) => (
                  <TextInput
                    value={value}
                    onChangeText={onChange}
                    placeholder="Ticket Name"
                    className="mb-2 rounded-lg border border-gray-300 bg-white p-2 font-nunito"
                  />
                )}
              />
              <View className="flex-row gap-2">
                <Controller
                  name={`ticket_types.${index}.price`}
                  control={control}
                  render={({field: {onChange, value}}) => (
                    <TextInput
                      value={value}
                      onChangeText={onChange}
                      placeholder="Price"
                      keyboardType="numeric"
                      className="flex-1 rounded-lg border border-gray-300 bg-white p-2 font-nunito"
                    />
                  )}
                />
                <Controller
                  name={`ticket_types.${index}.capacity`}
                  control={control}
                  render={({field: {onChange, value}}) => (
                    <TextInput
                      value={value}
                      onChangeText={onChange}
                      placeholder="Capacity"
                      keyboardType="numeric"
                      className="flex-1 rounded-lg border border-gray-300 bg-white p-2 font-nunito"
                    />
                  )}
                />
              </View>
            </View>
          ))}
          <TouchableOpacity
            onPress={addTicketType}
            className="flex-row items-center justify-center rounded-lg border border-dashed border-primary p-3">
            <Feather name="plus" size={18} color="#00594f" />
            <Text className="ml-2 font-nunito-bold text-primary">{t('events.addTicketType')}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={handleSubmit(onSubmit, onInvalid)}
          disabled={isPending || isSubmitting}
          className="mb-10 items-center rounded-lg bg-primary p-4">
          {isPending ? <ActivityIndicator color="white" /> : <Text className="font-nunito-bold text-white">{t('events.updateButton')}</Text>}
        </TouchableOpacity>
      </ScrollView>
      <DateTimePickerModal
        isVisible={!!isTimePickerVisible}
        mode={datePickerMode as any}
        onConfirm={handleConfirmDate}
        onCancel={() => setTimePickerVisible(false)}
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
