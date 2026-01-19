import React, {useState, useEffect} from 'react';
import {Modal, View, Text, TouchableOpacity, ScrollView, Switch} from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import {Feather} from '@expo/vector-icons';
import {useTranslation} from 'react-i18next';
import {useQuery} from '@tanstack/react-query';
import {supabase} from '@/utils/supabase'; // Adjust path if needed

import Slider from '@react-native-community/slider';

// Types
type SortOption = 'relevance' | 'price_asc' | 'price_desc' | 'newest';

export interface FilterState {
  categories: number[];
  days: string[];
  dateFrom: Date | null;
  dateTo: Date | null;
  sortBy: SortOption;
  isNearMeEnabled: boolean;
  radius: number; // radius in km
}

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: FilterState) => void;
  initialFilters: FilterState;
  userLocation: {latitude: number; longitude: number} | null;
  mode?: 'service' | 'event';
}

export default function FilterModal({visible, onClose, onApply, initialFilters, userLocation, mode = 'service'}: FilterModalProps) {
  const {t} = useTranslation();

  // Local State
  const [localFilters, setLocalFilters] = useState<FilterState>(initialFilters);
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);
  const [activeDateField, setActiveDateField] = useState<'from' | 'to' | null>(null);

  // Sync with props when modal opens
  useEffect(() => {
    if (visible) {
      setLocalFilters(initialFilters);
    }
  }, [visible, initialFilters]);

  // -- Data Fetching (Categories) --
  // We can fetch here or accept as props. Fetching here keeps it self-contained.
  const {data: categories} = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const {data, error} = await supabase.from('categories').select('*').eq('status', true).order('name');
      if (error) throw error;
      return data;
    },
  });

  // -- Handlers --
  const toggleCategory = (id: number) => {
    setLocalFilters((prev) => ({
      ...prev,
      categories: prev.categories.includes(id) ? prev.categories.filter((c) => c !== id) : [...prev.categories, id],
    }));
  };

  const toggleDay = (day: string) => {
    setLocalFilters((prev) => ({...prev, days: prev.days.includes(day) ? prev.days.filter((d) => d !== day) : [...prev.days, day]}));
  };

  const handleDateConfirm = (date: Date) => {
    if (activeDateField === 'from') {
      setLocalFilters((prev) => ({...prev, dateFrom: date}));
    } else if (activeDateField === 'to') {
      setLocalFilters((prev) => ({...prev, dateTo: date}));
    }
    setDatePickerVisible(false);
    setActiveDateField(null);
  };

  const clearFilters = () =>
    setLocalFilters({
      days: [],
      categories: [],
      sortBy: 'relevance',
      isNearMeEnabled: false,
      radius: 10,
      dateFrom: null,
      dateTo: null,
    });

  const handleApply = () => {
    onApply(localFilters);
    onClose();
  };

  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/50">
        <View className="h-[85%] rounded-t-3xl bg-white">
          {/* Header */}
          <View className="flex-row items-center justify-between border-b border-gray-100 p-6">
            <Text className="font-nunito-bold text-xl text-gray-900">{t('services.filters', 'Filters & Sort')}</Text>
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={24} color="#374151" />
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1 px-6">
            {/* Near Me Switch */}
            <View className="mt-6 flex-row items-center justify-between">
              <View className="flex-row items-center">
                <View className="bg-primary/10 mr-3 h-10 w-10 items-center justify-center rounded-full">
                  <Feather name="map-pin" size={20} color="#00594f" />
                </View>
                <View>
                  <Text className="font-nunito-bold text-base text-gray-900">{t('services.nearMe', 'Show Near Me')}</Text>
                  <Text className="font-nunito text-xs text-gray-500">
                    {localFilters.isNearMeEnabled
                      ? t('services.withinRadius', {val: localFilters.radius, defaultValue: `Within ${localFilters.radius}km`})
                      : t('services.enableLocation', 'Enable location filter')}
                  </Text>
                </View>
              </View>
              <Switch
                trackColor={{false: '#767577', true: '#00594f'}}
                thumbColor={'#f4f3f4'}
                ios_backgroundColor="#3e3e3e"
                onValueChange={(val) => {
                  setLocalFilters((prev) => ({...prev, isNearMeEnabled: val}));
                }}
                value={localFilters.isNearMeEnabled}
              />
            </View>

            {/* Radius Slider (Visible only if Near Me is Enabled) */}
            {localFilters.isNearMeEnabled && (
              <View className="mt-4 rounded-2xl bg-gray-50 p-4">
                <View className="mb-2 flex-row justify-between">
                  <Text className="font-nunito text-sm font-medium text-gray-600">Search Radius</Text>
                  <Text className="text-primary text-sm font-bold">{localFilters.radius} km</Text>
                </View>
                <Slider
                  style={{width: '100%', height: 40}}
                  minimumValue={5}
                  maximumValue={50}
                  step={5}
                  value={localFilters.radius}
                  onValueChange={(val) => setLocalFilters((prev) => ({...prev, radius: val}))}
                  minimumTrackTintColor="#00594f"
                  maximumTrackTintColor="#d1d5db"
                  thumbTintColor="#00594f"
                />
                <View className="flex-row justify-between px-1">
                  <Text className="font-nunito text-xs text-gray-400">5km</Text>
                  <Text className="font-nunito text-xs text-gray-400">50km</Text>
                </View>
              </View>
            )}

            {/* Sort By */}
            <View className="mt-6">
              <Text className="font-nunito mb-3 text-base font-bold text-gray-900">{t('services.sortBy', 'Sort By')}</Text>
              <View className="flex-row flex-wrap gap-2">
                {[
                  {id: 'relevance', label: t('services.relevance', 'Relevance')},
                  {id: 'price_asc', label: t('services.priceLow', 'Price: Low to High')},
                  {id: 'price_desc', label: t('services.priceHigh', 'Price: High to Low')},
                  {id: 'newest', label: t('services.newest', 'Newest')},
                ].map((option) => (
                  <TouchableOpacity
                    key={option.id}
                    onPress={() => setLocalFilters((prev) => ({...prev, sortBy: option.id as SortOption}))}
                    className={`rounded-full border px-4 py-2 ${
                      localFilters.sortBy === option.id ? 'border-primary bg-primary' : 'border-gray-200 bg-white'
                    }`}>
                    <Text className={`font-medium ${localFilters.sortBy === option.id ? 'text-white' : 'text-gray-700'} font-nunito`}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Day Filter (Service Only) */}
            {mode === 'service' && (
              <View className="mt-6">
                <Text className="font-nunito mb-3 text-base font-bold text-gray-900">{t('services.filterByDay', 'Day of Week')}</Text>
                <View className="flex-row flex-wrap gap-2">
                  {['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((day) => (
                    <TouchableOpacity
                      key={day}
                      onPress={() => toggleDay(day)}
                      className={`rounded-full border px-4 py-2 ${
                        localFilters.days.includes(day) ? 'border-primary bg-primary' : 'border-gray-200 bg-white'
                      }`}>
                      <Text
                        className={`text-center text-xs font-semibold capitalize ${localFilters.days.includes(day) ? 'text-white' : 'text-gray-700'} font-nunito`}>
                        {day.substring(0, 3)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Date Range Filter (Event Only) */}
            {mode === 'event' && (
              <View className="mt-6">
                <Text className="font-nunito mb-3 text-base font-bold text-gray-900">{t('events.dateRange', 'Date Range')}</Text>
                <View className="flex-row gap-4">
                  <TouchableOpacity
                    className="flex-1 rounded-2xl border border-gray-200 bg-white p-3"
                    onPress={() => {
                      setActiveDateField('from');
                      setDatePickerVisible(true);
                    }}>
                    <Text className="font-nunito text-xs text-gray-500">From</Text>
                    <Text className="font-nunito-bold text-gray-900">
                      {localFilters.dateFrom ? localFilters.dateFrom.toLocaleDateString() : 'Select Date'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="flex-1 rounded-2xl border border-gray-200 bg-white p-3"
                    onPress={() => {
                      setActiveDateField('to');
                      setDatePickerVisible(true);
                    }}>
                    <Text className="font-nunito text-xs text-gray-500">To</Text>
                    <Text className="font-nunito-bold text-gray-900">
                      {localFilters.dateTo ? localFilters.dateTo.toLocaleDateString() : 'Select Date'}
                    </Text>
                  </TouchableOpacity>
                </View>
                {(localFilters.dateFrom || localFilters.dateTo) && (
                  <TouchableOpacity onPress={() => setLocalFilters((prev) => ({...prev, dateFrom: null, dateTo: null}))} className="mt-2 self-end">
                    <Text className="text-secondary font-nunito-bold text-xs">Clear Dates</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Categories */}
            <View className="mb-10 mt-6">
              <Text className="font-nunito mb-3 text-base font-bold text-gray-900">{t('services.categories', 'Categories')}</Text>
              <View className="flex-row flex-wrap gap-2">
                <TouchableOpacity
                  onPress={() => setLocalFilters((prev) => ({...prev, categories: []}))}
                  className={`rounded-full border px-4 py-2 ${
                    localFilters.categories.length === 0 ? 'border-primary bg-primary' : 'border-gray-200 bg-white'
                  }`}>
                  <Text className={`font-medium ${localFilters.categories.length === 0 ? 'text-white' : 'text-gray-700'} font-nunito`}>
                    {t('common.all', 'All')}
                  </Text>
                </TouchableOpacity>
                {categories?.map((cat: any) => (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => toggleCategory(cat.id)}
                    className={`rounded-full border px-4 py-2 ${
                      localFilters.categories.includes(cat.id) ? 'border-primary bg-primary' : 'border-gray-200 bg-white'
                    }`}>
                    <Text className={`font-medium ${localFilters.categories.includes(cat.id) ? 'text-white' : 'text-gray-700'} font-nunito`}>
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>

          {/* Actions */}
          <View className="flex-row gap-3 border-t border-gray-100 bg-white p-6 pb-10">
            <TouchableOpacity onPress={clearFilters} className="flex-1 items-center justify-center rounded-2xl bg-gray-100 py-4">
              <Text className="font-nunito font-bold text-gray-700">{t('common.reset', 'Reset')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleApply}
              className="bg-primary flex-1 items-center justify-center rounded-2xl py-4 shadow-lg shadow-green-200">
              <Text className="font-nunito text-lg font-bold text-white">{t('common.showResults', 'Show Results')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <DateTimePickerModal
        isVisible={isDatePickerVisible}
        mode="date"
        onConfirm={handleDateConfirm}
        onCancel={() => {
          setDatePickerVisible(false);
          setActiveDateField(null);
        }}
        textColor="black"
      />
    </Modal>
  );
}
