import fr from './locales/fr';
import en from './locales/en';
import es from './locales/es';
import de from './locales/de';
import pt from './locales/pt';
import ja from './locales/ja';
import ko from './locales/ko';

type Translations = typeof fr;
type TranslationKey = keyof Translations;

const locales: Record<string, Translations> = { fr, en, es, de, pt, ja, ko };

const STORAGE_KEY = 'i18n-lang';

function detectLanguage(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && locales[stored]) return stored;
  } catch {}
  const nav = typeof navigator !== 'undefined' ? navigator.language : 'fr';
  if (nav.startsWith('fr')) return 'fr';
  if (nav.startsWith('en')) return 'en';
  if (nav.startsWith('es')) return 'es';
  if (nav.startsWith('de')) return 'de';
  if (nav.startsWith('pt')) return 'pt';
  if (nav.startsWith('ja')) return 'ja';
  if (nav.startsWith('ko')) return 'ko';
  return 'fr';
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
