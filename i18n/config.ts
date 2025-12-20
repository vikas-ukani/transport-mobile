// import AsyncStorage from '@react-native-async-storage/async-storage';
// import * as Localization from 'expo-localization';
// import i18n from 'i18next';

import { I18n } from 'i18n-js';

// Import JSON files using require instead of import to avoid TypeScript import errors
const en = require('./locales/en.json');
const gu = require('./locales/gu.json');
const hi = require('./locales/hi.json');

const translations = {
  en: en,
  gu: gu,
  hi: hi,
};

// Set the key-value pairs for the different languages you want to support.
const i18n = new I18n();

// Set default language.
i18n.locale = 'gu';

// Set the locale once at the beginning of your app.
i18n.locale = 'gu';
// i18n.locale = getLocales()[0].languageCode || 'gu';

i18n.translations = translations;
i18n.enableFallback = true;

export default i18n;
