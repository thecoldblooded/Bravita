import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import trTranslations from './locales/tr.json';
import enTranslations from './locales/en.json';

i18n
    .use(LanguageDetector)
    .use(initReactI18next);

i18n.on('languageChanged', (lng) => {
    document.documentElement.lang = lng;
});

i18n.init({
    resources: {
        tr: { translation: trTranslations },
        en: { translation: enTranslations },
    },
    fallbackLng: 'tr',
    load: 'languageOnly',
    interpolation: {
        escapeValue: false,
    },
    detection: {
        order: ['localStorage'],
        lookupLocalStorage: 'i18nextLng',
        caches: ['localStorage'],
    },
    react: {
        useSuspense: false,
    }
});

export default i18n;
