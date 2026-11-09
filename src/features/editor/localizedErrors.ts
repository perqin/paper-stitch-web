import type { TFunction } from 'i18next'
import en from '../../locales/en.ts'

const messages = [
  'importFailed', 'unableImport', 'decodeFailed', 'invalidDimensions', 'metadataFailed',
  'unableAdd', 'resourcesDisposed', 'emptyExport', 'canvasDimensions', 'canvasContext',
  'previewCanvasUnavailable', 'encodingEmpty', 'unsafeComposition', 'invalidCrop',
  'invalidRotation', 'unableExport', 'previewFailed',
] as const

/** Translate app-owned errors at the UI boundary, without changing domain/resource APIs. */
export function localizeError(message: string, t: TFunction): string {
  for (const key of messages) {
    const original = en[key]
    if (message === original) return t(key)
    if (message.endsWith(`: ${original}`)) {
      return t('fileError', { name: message.slice(0, -original.length - 2), message: t(key) })
    }
  }
  for (const [key, parameter] of [
    ['sourceUnavailable', 'id'], ['missingRecord', 'id'], ['missingSource', 'id'], ['encoderFormat', 'mime'],
  ] as const) {
    const prefix = en[key].split('{{')[0]
    if (message.startsWith(prefix)) return t(key, { [parameter]: message.slice(prefix.length) })
  }
  // Native browser diagnostics are not app-owned copy; retain their original detail.
  return message
}
