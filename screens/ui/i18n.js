// screens/utils/i18n.js
let lang = 'en';

const dict = {
  en: {
    search_placeholder: 'Search Location or Name',
    nearby: 'Nearby Hospitals',
  },
  hi: {
    search_placeholder: 'स्थान या नाम खोजें',
    nearby: 'नज़दीकी अस्पताल',
  },
};

export function t(key) {
  const pack = dict[lang] || dict.en;
  return pack[key] || key;
}

export function setLang(next) {
  lang = ['en', 'hi'].includes(next) ? next : 'en';
}

export function getLang() {
  return lang;
}
