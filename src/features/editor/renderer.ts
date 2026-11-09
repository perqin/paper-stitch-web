import type { Composition } from './composition.ts'
import type { ImageRecord, StitchMode } from './model.ts'

export interface RenderDocument {
  images: ImageRecord[]
  mode: StitchMode
  backgroundColor: string
}

export type ImageSource = (id: string) => CanvasImageSource

export interface RenderOptions {
  translucentImageId?: string
}

/** Draw in document coordinates, preserving the caller's camera/DPR transform. */
export function renderComposition(
  ctx: CanvasRenderingContext2D,
  document: RenderDocument,
  composition: Composition,
  getSource: ImageSource,
  options?: RenderOptions,
): void {
  if (!composition.bounds) return
  ctx.save()
  try {
    ctx.globalCompositeOperation = 'source-over'
    ctx.globalAlpha = 1
    ctx.fillStyle = document.backgroundColor
    const { x, y, width, height } = composition.bounds
    ctx.fillRect(x, y, width, height)
    for (const placement of composition.placements) {
      const image = document.images.find((image) => image.id === placement.id)
      if (!image) throw new Error(`Missing image record: ${placement.id}`)
      const source = getSource(image.id)
      if (!source) throw new Error(`Missing image source: ${image.id}`)
      const width = image.originalSize.width - image.crop.left - image.crop.right
      const height = image.originalSize.height - image.crop.top - image.crop.bottom
      ctx.save()
      try {
        ctx.globalAlpha = options?.translucentImageId === image.id ? 0.5 : 1
        ctx.translate(placement.x, placement.y)
        switch (image.rotationDeg) {
          case 0: ctx.transform(1, 0, 0, 1, 0, 0); break
          case 90: ctx.transform(0, 1, -1, 0, height, 0); break
          case 180: ctx.transform(-1, 0, 0, -1, width, height); break
          case 270: ctx.transform(0, -1, 1, 0, 0, width); break
        }
        ctx.drawImage(source, image.crop.left, image.crop.top, width, height, 0, 0, width, height)
      } finally {
        ctx.restore()
      }
    }
  } finally {
    ctx.restore()
  }
}
