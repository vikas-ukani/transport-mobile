import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
const en = require('./locales/en.json');
const gu = require('./locales/gu.json');
const hi = require('./locales/hi.json');

export const SYSTEM_DEFAULT_LANGUAGE = 'gu';

const resources = {
  en: {
    translation: en,
  },
  gu: {
    translation: gu,
  },
  hi: {
    translation: hi,
  },
};

i18n
  .use(initReactI18next)
  // .use(initReactI18next)
  // .use(languageDetectorPlugin)
  .init({
    lng: SYSTEM_DEFAULT_LANGUAGE,
    fallbackLng: 'en',
    resources: resources,
  });
export default i18n;
