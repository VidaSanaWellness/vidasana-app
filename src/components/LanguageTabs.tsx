import React from 'react';
import {Body} from './Typography';
import {LanguageCode} from '@/types/service';
import {View, TouchableOpacity} from 'react-native';

type Props = {
  activeLanguage: LanguageCode;
  onChange: (code: LanguageCode) => void;
  languages: {code: LanguageCode; label: string}[];
};

export function LanguageTabs({languages, activeLanguage, onChange}: Props) {
  return (
    <View className="mb-6 flex-row rounded-lg bg-gray-100 p-1">
      {languages.map((lang, i) => (
        <TouchableOpacity
          key={i}
          onPress={() => onChange(lang.code)}
          className={`flex-1 items-center rounded-md py-2 ${activeLanguage === lang.code ? 'bg-white shadow-sm' : 'shadow-none'}`}>
          <Body className={`font-nunito-bold ${activeLanguage === lang.code ? 'text-primary' : 'text-gray-500'}`}>{lang.label}</Body>
        </TouchableOpacity>
      ))}
    </View>
  );
}
