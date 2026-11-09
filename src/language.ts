export type Language = 'en' | 'zh'

export function resolveLanguage(browserLanguages: readonly string[]): Language {
  for (const language of browserLanguages) {
    const primary = language.split('-')[0]?.toLowerCase()
    if (primary === 'en' || primary === 'zh') return primary
  }
  return 'en'
}
