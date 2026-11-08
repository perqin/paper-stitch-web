import assert from 'node:assert/strict'
import test from 'node:test'
import { exportImage } from './export.ts'
import type { RenderDocument } from './renderer.ts'

function snapshot(): RenderDocument {
  return { mode: 'vertical', backgroundColor: '#123456', images: [
    { id: 'a', name: 'a', originalSize: { width: 20, height: 30 }, offset: { x: 0, y: 0 }, crop: { left: 5, top: 2, right: 3, bottom: 4 }, rotationDeg: 90 },
    { id: 'b', name: 'b', originalSize: { width: 10, height: 8 }, offset: { x: -7, y: -20 }, crop: { left: 0, top: 0, right: 0, bottom: 0 }, rotationDeg: 0 },
  ] }
}

function canvasFixture() {
  const calls: unknown[][] = []
  const ctx = {
    save() {}, restore() {},
    setTransform(...args: number[]) { calls.push(['setTransform', ...args]) },
    translate(...args: number[]) { calls.push(['translate', ...args]) },
    transform(...args: number[]) { calls.push(['transform', ...args]) },
    fillRect(...args: number[]) { calls.push(['fillRect', ...args]) },
    drawImage(...args: unknown[]) { calls.push(['drawImage', ...args]) },
  }
  const canvas = {
    width: 300, height: 150,
    getContext(kind: string) { calls.push(['getContext', kind]); return ctx },
    toBlob(callback: BlobCallback, type?: string, quality?: number) { calls.push(['toBlob', type, quality]); callback(new Blob(['encoded'], { type })) },
  }
  return { calls, canvas: canvas as unknown as HTMLCanvasElement }
}

test('export rejects encoder MIME fallback instead of returning the wrong format', async () => {
  const { canvas } = canvasFixture()
  canvas.toBlob = (callback) => callback(new Blob(['wrong'], { type: 'image/png' }))
  await assert.rejects(exportImage(snapshot(), () => ({} as CanvasImageSource), 'JPEG', () => canvas), /image\/jpeg/)
})

test('export rejects empty documents, unavailable contexts, null blobs and thrown encoder errors', async () => {
  let creates = 0
  await assert.rejects(exportImage({ ...snapshot(), images: [] }, () => ({} as CanvasImageSource), 'PNG', () => { creates++; return canvasFixture().canvas }), /empty/)
  assert.equal(creates, 0)
  const noContext = canvasFixture().canvas
  noContext.getContext = (() => null) as typeof noContext.getContext
  await assert.rejects(exportImage(snapshot(), () => ({} as CanvasImageSource), 'PNG', () => noContext), /context/)
  const noBlob = canvasFixture().canvas
  noBlob.toBlob = (callback) => callback(null)
  await assert.rejects(exportImage(snapshot(), () => ({} as CanvasImageSource), 'PNG', () => noBlob), /no data/)
  const thrown = canvasFixture().canvas
  const error = new Error('tainted canvas')
  thrown.toBlob = () => { throw error }
  await assert.rejects(exportImage(snapshot(), () => ({} as CanvasImageSource), 'PNG', () => thrown), (actual) => actual === error)
  await assert.rejects(exportImage(snapshot(), () => { throw error }, 'PNG', () => canvasFixture().canvas), (actual) => actual === error)
})

test('export rejects canvas dimension clamping rather than silently downsampling', async () => {
  const { canvas, calls } = canvasFixture()
  Object.defineProperty(canvas, 'width', { get: () => 16, set: () => {} })
  await assert.rejects(exportImage(snapshot(), () => ({} as CanvasImageSource), 'PNG', () => canvas), /dimensions/)
  assert.deepEqual(calls, [])
})

test('PNG/JPEG export uses exact output dimensions, identity transform and bounds-only translation', async () => {
  for (const [format, mime, quality] of [['PNG', 'image/png', undefined], ['JPEG', 'image/jpeg', 0.95]] as const) {
    const { canvas, calls } = canvasFixture()
    let created = 0
    const source = {} as CanvasImageSource
    const blob = await exportImage(snapshot(), () => source, format, () => { created++; return canvas })
    assert.equal(created, 1)
    assert.deepEqual([canvas.width, canvas.height], [31, 20])
    assert.equal(blob.type, mime)
    assert.deepEqual(calls.slice(0, 3), [['getContext', '2d'], ['setTransform', 1, 0, 0, 1, 0, 0], ['translate', 7, 8]])
    assert.deepEqual(calls.find((call) => call[0] === 'fillRect'), ['fillRect', -7, -8, 31, 20])
    assert.deepEqual(calls.at(-1), ['toBlob', mime, quality])
    assert.equal(calls.filter((call) => call[0] === 'drawImage').length, 2)
  }
})
