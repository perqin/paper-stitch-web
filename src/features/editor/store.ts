import { useStore } from 'zustand'
import { createStore } from 'zustand/vanilla'
import type { ImageEdits, ImageRecord, StitchMode } from './model.ts'

export interface EditorState {
  mode: StitchMode
  backgroundColor: string
  images: ImageRecord[]
  /** Boolean actions return true only when the document changes. */
  appendImages: (images: ImageRecord[]) => boolean
  setMode: (mode: StitchMode) => boolean
  setBackgroundColor: (color: string) => boolean
  updateImage: (id: string, edits: Partial<ImageEdits>) => boolean
  resetPositions: () => void
  moveImage: (id: string, direction: 'up' | 'down') => void
  removeImage: (id: string) => void
}

function validImage(image: ImageRecord): boolean {
  const { originalSize: size, crop, offset } = image
  return typeof image.id === 'string' && image.id.trim().length > 0
    && typeof image.name === 'string' && image.name.trim().length > 0
    && !!size && Number.isSafeInteger(size.width) && size.width > 0
    && Number.isSafeInteger(size.height) && size.height > 0
    && !!offset && Number.isSafeInteger(offset.x) && Number.isSafeInteger(offset.y)
    && !!crop && [crop.top, crop.right, crop.bottom, crop.left].every((value) => Number.isSafeInteger(value) && value >= 0)
    // Subtract rather than summing crops, avoiding unsafe intermediate additions.
    && size.width - crop.left > crop.right && size.height - crop.top > crop.bottom
    && [0, 90, 180, 270].includes(image.rotationDeg)
}

function resetImage(image: ImageRecord): ImageRecord {
  if (image.offset.x === 0 && image.offset.y === 0 && image.rotationDeg === 0
    && Object.values(image.crop).every((value) => value === 0)) return image
  return { ...image, offset: { x: 0, y: 0 }, crop: { top: 0, right: 0, bottom: 0, left: 0 }, rotationDeg: 0 }
}

function sameEdits(a: ImageRecord, b: ImageRecord): boolean {
  return a.offset.x === b.offset.x && a.offset.y === b.offset.y
    && a.crop.top === b.crop.top && a.crop.right === b.crop.right
    && a.crop.bottom === b.crop.bottom && a.crop.left === b.crop.left && a.rotationDeg === b.rotationDeg
}

export function createEditorStore() {
  return createStore<EditorState>()((set, get) => ({
    mode: 'vertical',
    backgroundColor: '#FFFFFF',
    images: [],
    appendImages(images) {
      if (!images.length) return false
      const state = get()
      const ids = new Set(state.images.map((image) => image.id))
      for (const image of images) {
        if (!validImage(image) || ids.has(image.id)) return false
        ids.add(image.id)
      }
      set({ images: [...state.images, ...images] })
      return true
    },
    setMode(mode) {
      const state = get()
      if ((mode !== 'vertical' && mode !== 'horizontal') || mode === state.mode) return false
      set({ mode, images: state.images.map(resetImage) })
      return true
    },
    setBackgroundColor(color) {
      if (!/^#[\da-f]{6}$/i.test(color)) return false
      const backgroundColor = color.toUpperCase()
      if (backgroundColor === get().backgroundColor) return false
      set({ backgroundColor })
      return true
    },
    updateImage(id, edits) {
      const state = get()
      const index = state.images.findIndex((image) => image.id === id)
      if (index < 0) return false
      const image = state.images[index]
      // Explicit fields prevent runtime callers from modifying identity/metadata.
      const next: ImageRecord = {
        ...image,
        offset: edits.offset === undefined ? image.offset : edits.offset,
        crop: edits.crop === undefined ? image.crop : edits.crop,
        rotationDeg: edits.rotationDeg === undefined ? image.rotationDeg : edits.rotationDeg,
      }
      if (!validImage(next) || sameEdits(image, next)) return false
      const images = state.images.slice()
      images[index] = next
      set({ images })
      return true
    },
    resetPositions() {
      const state = get()
      const images = state.images.map(resetImage)
      if (images.some((image, index) => image !== state.images[index])) set({ images })
    },
    moveImage(id, direction) {
      const state = get()
      const index = state.images.findIndex((image) => image.id === id)
      const target = index + (direction === 'up' ? -1 : 1)
      if (index < 0 || target < 0 || target >= state.images.length) return
      const images = state.images.slice()
      ;[images[index], images[target]] = [images[target], images[index]]
      set({ images })
    },
    removeImage(id) {
      const state = get()
      const images = state.images.filter((image) => image.id !== id)
      if (images.length !== state.images.length) set({ images })
    },
  }))
}

export const editorStore = createEditorStore()
export function useEditorStore<T>(selector: (state: EditorState) => T): T {
  return useStore(editorStore, selector)
}
