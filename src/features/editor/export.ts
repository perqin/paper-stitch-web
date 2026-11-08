import { calculateComposition } from './composition.ts'
import { renderComposition } from './renderer.ts'
import type { ImageSource, RenderDocument } from './renderer.ts'

export type ExportFormat = 'PNG' | 'JPEG'

/** Encode a detached, 1:1 canvas. The caller owns snapshot/source leases and download UI. */
export async function exportImage(
  snapshot: RenderDocument,
  getSource: ImageSource,
  format: ExportFormat,
  createCanvas: () => HTMLCanvasElement = () => document.createElement('canvas'),
): Promise<Blob> {
  const composition = calculateComposition(snapshot.images, snapshot.mode)
  if (!composition.bounds || !composition.outputSize) throw new Error('Cannot export an empty document')
  const canvas = createCanvas()
  canvas.width = composition.outputSize.width
  canvas.height = composition.outputSize.height
  if (canvas.width !== composition.outputSize.width || canvas.height !== composition.outputSize.height) {
    throw new Error('Canvas dimensions do not match the exact output dimensions')
  }
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D context unavailable')
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.translate(-composition.bounds.x, -composition.bounds.y)
  renderComposition(ctx, snapshot, composition, getSource)
  const mime = format === 'PNG' ? 'image/png' : 'image/jpeg'
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) reject(new Error('Canvas encoding returned no data'))
      else if (blob.type !== mime) reject(new Error(`Canvas encoder did not produce ${mime}`))
      else resolve(blob)
    }, mime, format === 'JPEG' ? 0.95 : undefined)
  })
}
