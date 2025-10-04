import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import commonRu from '../../shared/locales/ru/common.json';
import navigationRu from '../../shared/locales/ru/navigation.json';
import authRu from '../../shared/locales/ru/auth.json';

import commonEn from '../../shared/locales/en/common.json';
import navigationEn from '../../shared/locales/en/navigation.json';
import authEn from '../../shared/locales/en/auth.json';

const resources = {
  ru: {
    common: commonRu,
    navigation: navigationRu,
    auth: authRu,
  },
  en: {
    common: commonEn,
    navigation: navigationEn,
    auth: authEn,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'ru',
    defaultNS: 'common',
    ns: ['common', 'navigation', 'auth'],
    
    interpolation: {
      escapeValue: false,
    },
    
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
    
    react: {
      useSuspense: true,
    },
  });

export default i18n;
