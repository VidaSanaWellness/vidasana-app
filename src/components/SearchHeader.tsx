import React from 'react';
import {View, TextInput, TouchableOpacity} from 'react-native';
import {Feather} from '@expo/vector-icons';

interface SearchHeaderProps {
  searchQuery: string;
  onSearchChange: (text: string) => void;
  onFilterPress: () => void;
  activeFilterCount: number;
  placeholder: string;
  onBack?: () => void;
  inputRef?: React.Ref<TextInput>;
}

export const SearchHeader: React.FC<SearchHeaderProps> = ({
  searchQuery,
  onSearchChange,
  onFilterPress,
  activeFilterCount,
  placeholder,
  onBack,
  inputRef,
}) => {
  return (
    <View className="mb-4 px-4 pt-4">
      <View className="flex-row items-center gap-3">
        {onBack && (
          <TouchableOpacity onPress={onBack} className="h-12 w-12 items-center justify-center rounded-xl border border-gray-200 bg-white">
            <Feather name="arrow-left" size={20} color="#374151" />
          </TouchableOpacity>
        )}

        <View className="h-12 flex-1 flex-row items-center rounded-2xl border border-gray-200 bg-gray-50 px-4">
          <Feather name="search" size={20} color="#9CA3AF" />
          <TextInput
            ref={inputRef}
            placeholder={placeholder}
            placeholderTextColor="#9CA3AF"
            className="font-nunito ml-2 h-full flex-1 text-gray-900"
            value={searchQuery}
            onChangeText={onSearchChange}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => onSearchChange('')}>
              <Feather name="x" size={16} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          onPress={onFilterPress}
          className={`h-12 w-12 items-center justify-center rounded-2xl border ${
            activeFilterCount > 0 ? 'border-primary bg-primary' : 'border-gray-200 bg-white'
          }`}>
          <Feather name="sliders" size={20} color={activeFilterCount > 0 ? 'white' : '#374151'} />
          {activeFilterCount > 0 && <View className="bg-secondary absolute right-2 top-2 h-2.5 w-2.5 rounded-full border border-white" />}
        </TouchableOpacity>
      </View>
    </View>
  );
};
