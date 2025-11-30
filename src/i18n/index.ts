import en from './en.json';
import fr from './fr.json';
import init18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

const fallbackLng = 'en';
const resources = { en: { translation: en }, fr: { translation: fr } };

export type LanguageCode = keyof typeof resources;

export const i18n = init18n
  .use({
    type: 'languageDetector',
    detect: () => {
      const locales = Localization.getLocales();
      const firstLanguageCode = locales[0].languageCode ?? 'en';
      return firstLanguageCode;
    },
    init: () => {},
    cacheUserLanguage: () => {},
  })
  .use(initReactI18next)
  .init({
    resources,
    compatibilityJSON: 'v3',
    interpolation: { escapeValue: false },
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
