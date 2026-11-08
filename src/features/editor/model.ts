/** Screen coordinates: top-left origin, +x right, +y down. */
export type StitchMode = 'vertical' | 'horizontal'
export type Rotation = 0 | 90 | 180 | 270

export interface ImageRecord {
  id: string
  name: string
  originalSize: { width: number; height: number }
  offset: { x: number; y: number }
  crop: { top: number; right: number; bottom: number; left: number }
  rotationDeg: Rotation
}

export type ImageEdits = Pick<ImageRecord, 'offset' | 'crop' | 'rotationDeg'>
