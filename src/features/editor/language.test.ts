import assert from 'node:assert/strict'
import { test } from 'node:test'
import { resolveLanguage } from '../../language.ts'

test('resolves regional Chinese browser preferences to Chinese', () => {
  assert.equal(resolveLanguage(['zh-CN']), 'zh')
  assert.equal(resolveLanguage(['zh-Hant-TW']), 'zh')
  assert.equal(resolveLanguage(['ZH-hans']), 'zh')
})

test('selects the first supported primary language in browser preference order', () => {
  assert.equal(resolveLanguage(['fr-FR', 'zh-TW', 'en-US']), 'zh')
  assert.equal(resolveLanguage(['en-GB', 'zh-CN']), 'en')
  assert.equal(resolveLanguage(['de-DE', 'en-US', 'zh-CN']), 'en')
  assert.equal(resolveLanguage(['zh', 'en']), 'zh')
})

test('falls back to English for absent or unsupported browser preferences', () => {
  assert.equal(resolveLanguage([]), 'en')
  assert.equal(resolveLanguage(['fr-FR', 'de-DE']), 'en')
  assert.equal(resolveLanguage(['', 'not-zh', 'zho', 'zh_CN']), 'en')
})

test('does not mutate readonly browser preferences', () => {
  const languages = Object.freeze(['fr-FR', 'zh-CN'])
  assert.equal(resolveLanguage(languages), 'zh')
  assert.deepEqual(languages, ['fr-FR', 'zh-CN'])
})
