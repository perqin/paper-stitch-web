import type { ImageRecord } from './model.ts'

interface DecodedImage {
  url: string
  width: number
  height: number
  release: () => void
}

interface DocumentActions {
  appendImages: (images: ImageRecord[]) => boolean
  removeImage: (id: string) => void
}

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
    return { url, width: image.naturalWidth, height: image.naturalHeight, release: () => URL.revokeObjectURL(url) }
  } catch {
    URL.revokeObjectURL(url)
    throw new Error('This file could not be decoded as an image supported by your browser.')
  }
}

export function createImageResources(
  document: () => DocumentActions,
  decode: Decoder = decodeFile,
  createId = () => crypto.randomUUID() as string,
) {
  const resources = new Map<string, DecodedImage & { file: File }>()
  let queue: Promise<unknown> = Promise.resolve()
  let disposed = false

  async function importBatch(files: File[]): Promise<string[]> {
    const errors: string[] = []
    const ready: { record: ImageRecord; resource: DecodedImage & { file: File } }[] = []
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
        ready.push({ record, resource: { ...decoded, file } })
      } catch (error) {
        decoded?.release()
        errors.push(`${file.name}: ${error instanceof Error ? error.message : 'Unable to import image.'}`)
      }
    }
    if (disposed) {
      ready.forEach(item => item.resource.release())
      return errors
    }
    if (ready.length) {
      ready.forEach(item => resources.set(item.record.id, item.resource))
      try {
        if (!document().appendImages(ready.map(item => item.record))) throw new Error('Image metadata could not be added.')
      } catch (error) {
        ready.forEach(item => { resources.delete(item.record.id); item.resource.release() })
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
    getUrl(id: string) { return resources.get(id)?.url },
    removeImage(id: string) {
      document().removeImage(id)
      resources.get(id)?.release()
      resources.delete(id)
    },
    dispose() {
      disposed = true
      resources.forEach(resource => resource.release())
      resources.clear()
    },
  }
}
