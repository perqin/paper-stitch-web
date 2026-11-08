import type { ImageRecord, StitchMode } from './model.ts'

export interface Composition {
  placements: { id: string; x: number; y: number; width: number; height: number }[]
  bounds: { x: number; y: number; width: number; height: number } | null
  outputSize: { width: number; height: number } | null
}

function safe(value: number, positive = false): number {
  if (!Number.isSafeInteger(value) || (positive && value <= 0)) {
    throw new RangeError('Composition requires safe integer coordinates and positive dimensions')
  }
  return value
}

/** Crop, rotate, then place; returned coordinates are not translated to output origin. */
export function calculateComposition(images: ImageRecord[], mode: StitchMode): Composition {
  const placements: Composition['placements'] = []
  let edge = 0
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const image of images) {
    safe(image.originalSize.width, true)
    safe(image.originalSize.height, true)
    for (const crop of Object.values(image.crop)) {
      if (safe(crop) < 0) throw new RangeError('Crop must be nonnegative')
    }
    if (![0, 90, 180, 270].includes(image.rotationDeg)) throw new RangeError('Invalid rotation')
    let width = safe(image.originalSize.width - image.crop.left - image.crop.right, true)
    let height = safe(image.originalSize.height - image.crop.top - image.crop.bottom, true)
    if (image.rotationDeg === 90 || image.rotationDeg === 270) [width, height] = [height, width]
    const first = placements.length === 0
    const x = first ? 0 : safe((mode === 'horizontal' ? edge : 0) + safe(image.offset.x))
    const y = first ? 0 : safe((mode === 'vertical' ? edge : 0) + safe(image.offset.y))
    const right = safe(x + width)
    const bottom = safe(y + height)
    placements.push({ id: image.id, x, y, width, height })
    edge = mode === 'vertical' ? bottom : right
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, right)
    maxY = Math.max(maxY, bottom)
  }
  if (!placements.length) return { placements, bounds: null, outputSize: null }
  const width = safe(maxX - minX, true)
  const height = safe(maxY - minY, true)
  return { placements, bounds: { x: minX, y: minY, width, height }, outputSize: { width, height } }
}
