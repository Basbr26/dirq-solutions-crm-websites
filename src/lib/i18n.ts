import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import translationNL from './locales/nl/translation.json';
import translationEN from './locales/en/translation.json';

// Translation resources
const resources = {
  nl: {
    translation: translationNL
  },
  en: {
    translation: translationEN
  }
};

i18n
  // Detect user language
  .use(LanguageDetector)
  // Pass i18n instance to react-i18next
  .use(initReactI18next)
  // Init i18next
  .init({
    resources,
    fallbackLng: 'nl', // Default to Dutch
    lng: 'nl', // Initial language
    
    // Debugging
    debug: import.meta.env.DEV,
    
    interpolation: {
      escapeValue: false // React already escapes
    },
    
    detection: {
      // Order of language detection
      order: ['localStorage', 'navigator'],
      // Cache user language preference
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng'
    }
  });

export default i18n;
