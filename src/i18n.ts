import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './locales/en.ts'
import zh from './locales/zh.ts'
import { resolveLanguage, type Language } from './language.ts'

export const LANGUAGE_STORAGE_KEY = 'paper-stitch-language'

function initialLanguage(): Language {
  try {
    const saved = typeof window === 'undefined' ? null : window.localStorage.getItem(LANGUAGE_STORAGE_KEY)
    if (saved === 'en' || saved === 'zh') return saved
  } catch {
    // Storage may be unavailable in restricted browser contexts.
  }
  if (typeof navigator === 'undefined') return 'en'
  return resolveLanguage(navigator.languages ?? (navigator.language ? [navigator.language] : []))
}

function updateDocumentLanguage(language: string) {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = language
    document.title = i18n.t('productName', { lng: language })
  }
}

i18n.on('languageChanged', updateDocumentLanguage)
void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, zh: { translation: zh } },
  lng: initialLanguage(),
  supportedLngs: ['en', 'zh'],
  fallbackLng: 'en',
  initAsync: false,
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
})
updateDocumentLanguage(i18n.resolvedLanguage ?? i18n.language)

export default i18n
