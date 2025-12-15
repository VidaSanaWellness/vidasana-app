import en from './en.json';
import fr from './fr.json';
import es from './es.json';
import init18n from 'i18next';
import {storage} from '@/utils';
import {initReactI18next} from 'react-i18next';
import * as Localization from 'expo-localization';

const fallbackLng = 'en';
const resources = {en: {translation: en}, fr: {translation: fr}, es: {translation: es}};

export type LanguageCode = keyof typeof resources;

export const i18n = init18n
  .use({
    async: false,
    init: () => {},
    type: 'languageDetector',
    cacheUserLanguage: (lng: string) => storage.setItem('LANGUAGE', lng),
    detect: () => {
      const stored = storage.getItem('LANGUAGE');
      if (stored) return stored;

      const locales = Localization.getLocales();
      const firstLanguageCode = locales[0].languageCode ?? 'en';
      return firstLanguageCode;
    },
  })
  .use(initReactI18next)
  .init({
    resources,
    compatibilityJSON: 'v3',
    interpolation: {escapeValue: false},
    fallbackLng: (() => {
      const languages = Object.keys(resources);
      const hasFallback = languages.find((key) => fallbackLng === key);
      if (!hasFallback) {
        throw new Error(
          `fallbackLng  "${fallbackLng}", is not present in your resources, please check your config, languages available: ${languages.join(', ')}`
        );
      }
      return fallbackLng;
    })(),
  });

export default i18n;
