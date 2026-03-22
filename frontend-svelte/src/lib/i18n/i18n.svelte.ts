import fr from './locales/fr';
import en from './locales/en';

type Translations = typeof fr;
type TranslationKey = keyof Translations;

const locales: Record<string, Translations> = { fr, en };

const STORAGE_KEY = 'i18n-lang';

function detectLanguage(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && locales[stored]) return stored;
  } catch {}
  const nav = typeof navigator !== 'undefined' ? navigator.language : 'fr';
  return nav.startsWith('fr') ? 'fr' : nav.startsWith('en') ? 'en' : 'fr';
}

let _lang = $state(detectLanguage());

function interpolate(str: string, params?: Record<string, string | number>): string {
  if (!params) return str;
  return str.replace(/\{(\w+)\}/g, (_, key) => String(params[key] ?? `{${key}}`));
}

export const i18n = {
  get lang() {
    return _lang;
  },

  setLang(lang: string) {
    if (!locales[lang]) return;
    _lang = lang;
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {}
  },

  t(key: TranslationKey, params?: Record<string, string | number>): string {
    const translations = locales[_lang] || locales.fr;
    const value = translations[key];
    if (value === undefined) return key;
    return interpolate(value, params);
  },
};
