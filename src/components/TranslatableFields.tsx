import React from 'react';
import {View, TextInput} from 'react-native';
import {Control, Controller, FieldErrors} from 'react-hook-form';
import {Body, Caption} from './Typography';
import {LanguageCode} from '@/types/service';

type Props = {
  control: Control<any>;
  errors: FieldErrors<any>;
  activeLanguage: LanguageCode;
  languages: {code: LanguageCode; label: string}[];
  t: (key: string) => string;
  titlePlaceholder?: string;
  descriptionPlaceholder?: string;
};

export function TranslatableFields({control, errors, activeLanguage, languages, t, titlePlaceholder, descriptionPlaceholder}: Props) {
  return (
    <>
      {languages.map((lang) => (
        <View key={lang.code} style={{display: activeLanguage === lang.code ? 'flex' : 'none'}}>
          <View className="mb-4">
            <Body className="mb-1 font-nunito-bold text-sm text-gray-700">
              {t('events.eventTitle')} ({lang.label})
            </Body>
            <Controller
              control={control}
              rules={{required: t('validation.titleRequired')}}
              name={`translations.${lang.code}.title`}
              render={({field: {onChange, value}}) => (
                <TextInput
                  className="rounded-lg border border-gray-300 bg-white p-3 font-nunito"
                  placeholder={titlePlaceholder}
                  value={value}
                  onChangeText={onChange}
                />
              )}
            />
            {errors.translations?.[lang.code]?.title && (
              <Caption className="mt-1 text-red-500">{errors.translations[lang.code]?.title?.message as string}</Caption>
            )}
          </View>

          <View className="mb-4">
            <Body className="mb-1 font-nunito-bold text-sm text-gray-700">
              {t('events.description')} ({lang.label})
            </Body>
            <Controller
              control={control}
              name={`translations.${lang.code}.description`}
              rules={{required: t('validation.descriptionRequired')}}
              render={({field: {onChange, value}}) => (
                <TextInput
                  multiline
                  value={value}
                  textAlignVertical="top"
                  onChangeText={onChange}
                  placeholder={descriptionPlaceholder}
                  className="h-24 rounded-lg border border-gray-300 bg-white p-3 font-nunito"
                />
              )}
            />
            {errors.translations?.[lang.code]?.description && (
              <Caption className="mt-1 text-red-500">{errors.translations[lang.code]?.description?.message as string}</Caption>
            )}
          </View>
        </View>
      ))}
    </>
  );
}
