import { v4 as uuidv4 } from 'uuid'
import type { ImageRecord } from './model.ts'

interface DecodedImage {
  url: string
  width: number
  height: number
  source?: CanvasImageSource
  release: () => void
}

interface DocumentActions {
  appendImages: (images: ImageRecord[]) => boolean
  removeImage: (id: string) => void
}

type ResourceEntry = DecodedImage & { file: File; leases: number; retired: boolean }
type Decoder = (file: File) => Promise<DecodedImage>

async function decodeFile(file: File): Promise<DecodedImage> {
  const url = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.src = url
    await image.decode()
    if (!Number.isSafeInteger(image.naturalWidth) || !Number.isSafeInteger(image.naturalHeight) || image.naturalWidth <= 0 || image.naturalHeight <= 0) {
      throw new Error('Image has invalid dimensions')
    }
    return { url, width: image.naturalWidth, height: image.naturalHeight, source: image, release: () => URL.revokeObjectURL(url) }
  } catch {
    URL.revokeObjectURL(url)
    throw new Error('This file could not be decoded as an image supported by your browser.')
  }
}

export function createImageResources(
  document: () => DocumentActions,
  decode: Decoder = decodeFile,
  createId: () => string = uuidv4,
) {
  const resources = new Map<string, ResourceEntry>()
  let queue: Promise<unknown> = Promise.resolve()
  let disposed = false

  function retire(resource: ResourceEntry) {
    if (resource.retired) return
    resource.retired = true
    if (resource.leases === 0) resource.release()
  }

  async function importBatch(files: File[]): Promise<string[]> {
    const errors: string[] = []
    const ready: { record: ImageRecord; resource: ResourceEntry }[] = []
    for (const file of files) {
      if (disposed) break
      let decoded: DecodedImage | undefined
      try {
        decoded = await decode(file)
        if (disposed) { decoded.release(); break }
        const record: ImageRecord = {
          id: createId(), name: file.name,
          originalSize: { width: decoded.width, height: decoded.height },
          offset: { x: 0, y: 0 }, crop: { top: 0, right: 0, bottom: 0, left: 0 }, rotationDeg: 0,
        }
        ready.push({ record, resource: { ...decoded, file, leases: 0, retired: false } })
      } catch (error) {
        decoded?.release()
        errors.push(`${file.name}: ${error instanceof Error ? error.message : 'Unable to import image.'}`)
      }
    }
    if (disposed) {
      ready.forEach(item => retire(item.resource))
      return errors
    }
    if (ready.length) {
      ready.forEach(item => resources.set(item.record.id, item.resource))
      try {
        if (!document().appendImages(ready.map(item => item.record))) throw new Error('Image metadata could not be added.')
      } catch (error) {
        ready.forEach(item => { resources.delete(item.record.id); retire(item.resource) })
        errors.push(error instanceof Error ? error.message : 'Unable to add images.')
      }
    }
    return errors
  }

  return {
    importFiles(files: File[]) {
      const task = queue.then(() => importBatch(files))
      queue = task.catch(() => {})
      return task
    },
    acquire(ids: string[]) {
      if (disposed) throw new Error('Image resources have been disposed.')
      const entries = new Map<string, ResourceEntry>()
      const sources = new Map<string, CanvasImageSource>()
      for (const id of ids) {
        const entry = resources.get(id)
        if (!entry?.source) throw new Error(`Image source is unavailable: ${id}`)
        entries.set(id, entry)
        sources.set(id, entry.source)
      }
      entries.forEach(entry => { entry.leases++ })
      let released = false
      return {
        getSource(id: string): CanvasImageSource {
          const source = sources.get(id)
          if (released || !source) throw new Error(`Image source is unavailable: ${id}`)
          return source
        },
        release() {
          if (released) return
          released = true
          sources.clear()
          entries.forEach(entry => {
            entry.leases--
            if (entry.retired && entry.leases === 0) entry.release()
          })
          entries.clear()
        },
      }
    },
    getUrl(id: string) { return resources.get(id)?.url },
    removeImage(id: string) {
      document().removeImage(id)
      const entry = resources.get(id)
      resources.delete(id)
      if (entry) retire(entry)
    },
    dispose() {
      disposed = true
      resources.forEach(retire)
      resources.clear()
    },
  }
}

export type ImageResources = ReturnType<typeof createImageResources>
