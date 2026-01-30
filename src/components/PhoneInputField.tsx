import React from 'react';
import {View, ViewStyle} from 'react-native';
import PhoneInput from 'react-native-international-phone-number';
import {FieldError} from 'react-hook-form';
import {Caption} from './Typography';

interface PhoneInputFieldProps {
  value: string;
  onChangePhoneNumber: (value: string) => void;
  selectedCountry: any;
  onChangeSelectedCountry: (country: any) => void;
  error?: FieldError;
  placeholder?: string;
  defaultCountry?: string;
  language?: string;
}

export const PhoneInputField = ({
  value,
  onChangePhoneNumber,
  selectedCountry,
  onChangeSelectedCountry,
  error,
  placeholder,
  defaultCountry = 'US',
  language = 'eng',
}: PhoneInputFieldProps) => {
  return (
    <View className="mb-4">
      <View className="w-full">
        <PhoneInput
          value={value}
          onChangePhoneNumber={onChangePhoneNumber}
          selectedCountry={selectedCountry}
          onChangeSelectedCountry={onChangeSelectedCountry}
          defaultCountry={defaultCountry as any}
          language={language as any}
          placeholder={placeholder}
          phoneInputStyles={{
            container: {
              backgroundColor: '#F9FAFB', // bg-gray-50
              borderColor: error ? '#FCA5A5' : '#E5E7EB', // border-red-300 or border-gray-200
              borderWidth: 1,
              borderRadius: 8, // rounded-lg
              height: 56, // h-14
            } as ViewStyle,
            input: {
              paddingLeft: 8,
              color: '#000',
              fontSize: 16,
              fontFamily: 'Nunito_400Regular',
            },
            flagContainer: {
              paddingRight: 0,
              borderTopLeftRadius: 8,
              borderBottomLeftRadius: 8,
              backgroundColor: 'transparent',
            },
            callingCode: {
              fontSize: 16,
              fontFamily: 'Nunito_400Regular',
              color: '#374151',
            },
            divider: {
              backgroundColor: '#E5E7EB',
            },
            caret: {
              color: '#374151',
              fontSize: 16,
            },
          }}
          modalStyles={{
            backdrop: {
              backgroundColor: 'rgba(0, 0, 0, 0.4)', // Semi-transparent dark overlay
            },
            // modal: {
            //   backgroundColor: '#FFF',
            //   borderTopLeftRadius: 16,
            //   borderTopRightRadius: 16,
            // },
            list: {
              backgroundColor: '#FFF',
            },
            searchInput: {
              borderRadius: 8,
              borderWidth: 1,
              borderColor: '#E5E7EB',
              color: '#000',
              backgroundColor: '#F9FAFB',
              height: 48,
              paddingHorizontal: 16,
              fontSize: 16,
              fontFamily: 'Nunito_400Regular',
            },
            countryItem: {
              borderWidth: 1,
              borderColor: '#F3F4F6',
              backgroundColor: '#FFF',
              marginVertical: 4,
              paddingVertical: 12,
              borderRadius: 8,
            },
            flag: {
              fontSize: 24,
            },
            callingCode: {
              color: '#374151',
            },
            countryName: {
              color: '#000',
              fontFamily: 'Nunito_400Regular',
            },
          }}
        />
      </View>
      {error && <Caption className="ml-2 mt-1 text-red-500">{error.message}</Caption>}
    </View>
  );
};
