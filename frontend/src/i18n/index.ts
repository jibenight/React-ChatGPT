import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import fr from './locales/fr';
import en from './locales/en';
import es from './locales/es';
import de from './locales/de';
import pt from './locales/pt';
import ja from './locales/ja';
import ko from './locales/ko';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      fr,
      en,
      es,
      de,
      pt,
      ja,
      ko,
    },
    fallbackLng: 'fr',
    defaultNS: 'common',
    ns: ['common', 'auth', 'chat', 'projects', 'profile', 'provider', 'guide', 'billing'],
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
  });

export default i18n;
