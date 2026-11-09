import test from 'node:test'
import assert from 'node:assert/strict'
import { createInstance } from 'i18next'
import en from '../../locales/en.ts'
import zh from '../../locales/zh.ts'
import { localizeError } from './localizedErrors.ts'

test('English and Chinese dictionaries have matching keys and interpolation parameters', () => {
  assert.deepEqual(Object.keys(zh).sort(), Object.keys(en).sort())
  for (const key of Object.keys(en) as (keyof typeof en)[]) {
    const parameters = (text: string) => [...text.matchAll(/{{(\w+)}}/g)].map(match => match[1]).sort()
    assert.deepEqual(parameters(zh[key]), parameters(en[key]), key)
  }
})

test('localize known domain errors at display time, preserving filenames, IDs and unknown details', async () => {
  const i18n = createInstance()
  await i18n.init({ lng: 'en', resources: { en: { translation: en }, zh: { translation: zh } }, interpolation: { escapeValue: false } })
  const message = `scan: <1>.png: ${en.decodeFailed}`
  assert.equal(localizeError(message, i18n.t), message)
  await i18n.changeLanguage('zh')
  assert.equal(localizeError(message, i18n.t), `scan: <1>.png：${zh.decodeFailed}`)
  assert.equal(localizeError(en.encodingEmpty, i18n.t), zh.encodingEmpty)
  assert.equal(localizeError('Image source is unavailable: source-42', i18n.t), '图片资源不可用：source-42')
  assert.equal(localizeError('Canvas encoder did not produce image/jpeg', i18n.t), '画布编码器未生成 image/jpeg 格式')
  assert.equal(localizeError('Native error detail', i18n.t), 'Native error detail')
})
