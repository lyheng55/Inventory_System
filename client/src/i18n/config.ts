import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { STORAGE_KEYS } from '../constants';
import { applyGlobalFont } from '../utils/fonts';

import enTranslations from './locales/en.json';
import kmTranslations from './locales/km.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: enTranslations,
      },
      km: {
        translation: kmTranslations,
      },
    },
    fallbackLng: 'en',
    debug: false,
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: STORAGE_KEYS.LANGUAGE,
      caches: ['localStorage'],
    },
  });

// Apply font when language changes
i18n.on('languageChanged', (lng: string) => {
  applyGlobalFont(lng);
  // Update body data attribute for CSS targeting
  if (document.body) {
    document.body.setAttribute('data-lang', lng);
  }
  // Update html lang attribute
  if (document.documentElement) {
    document.documentElement.setAttribute('lang', lng);
  }
});

// Apply initial font
const currentLanguage = i18n.language || 'en';
applyGlobalFont(currentLanguage);
if (document.body) {
  document.body.setAttribute('data-lang', currentLanguage);
}
if (document.documentElement) {
  document.documentElement.setAttribute('lang', currentLanguage);
}

export default i18n;

