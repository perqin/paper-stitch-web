import assert from 'node:assert/strict'
import test from 'node:test'
import { calculateComposition } from './composition.ts'
import type { ImageRecord } from './model.ts'
import { renderComposition } from './renderer.ts'

function image(id = 'a'): ImageRecord {
  return { id, name: id, originalSize: { width: 20, height: 30 }, offset: { x: 0, y: 0 }, crop: { left: 5, top: 2, right: 3, bottom: 4 }, rotationDeg: 0 }
}

test('negative bounds do not rebase world placements and later images draw last', () => {
  const a = image()
  const b = { ...image('b'), offset: { x: -7, y: -30 } }
  const { ctx, calls } = recorder()
  const sources = { a: {} as CanvasImageSource, b: {} as CanvasImageSource }
  ctx.translate(100, 200) // caller-owned camera remains untouched
  renderComposition(ctx, { images: [a, b], mode: 'vertical', backgroundColor: '#fff' }, calculateComposition([a, b], 'vertical'), (id) => sources[id as keyof typeof sources])
  assert.deepEqual(calls.filter((call) => call[0] === 'translate'), [['translate', 100, 200], ['translate', 0, 0], ['translate', -7, -6]])
  assert.deepEqual(calls.filter((call) => call[0] === 'drawImage').map((call) => call[1]), [sources.a, sources.b])
  assert.deepEqual(calls.find((call) => call[0] === 'fillRect')?.slice(1, 5), [-7, -6, 19, 30])
})

test('missing sources and draw failures throw while restoring caller state', () => {
  for (const failure of ['missing', 'lookup', 'draw']) {
    const { ctx, stack } = recorder()
    if (failure === 'draw') ctx.drawImage = () => { throw new Error('draw failed') }
    assert.throws(() => renderComposition(ctx, { images: [image()], mode: 'vertical', backgroundColor: '#fff' }, calculateComposition([image()], 'vertical'), () => {
      if (failure === 'lookup') throw new Error('lookup failed')
      return failure === 'missing' ? undefined as unknown as CanvasImageSource : {} as CanvasImageSource
    }), failure === 'missing' ? /Missing image source/ : /failed/)
    assert.equal(stack.length, 0)
    assert.equal(ctx.globalAlpha, 0.4)
  }
})

test('empty composition is a no-op', () => {
  const { ctx, calls } = recorder()
  renderComposition(ctx, { images: [], mode: 'vertical', backgroundColor: '#fff' }, calculateComposition([], 'vertical'), () => { throw new Error('unexpected lookup') })
  assert.deepEqual(calls, [])
})

// Records Canvas2D operations/state, not rasterized pixels.
function recorder() {
  const calls: unknown[][] = []
  const stack: { fillStyle: string; globalAlpha: number; globalCompositeOperation: string }[] = []
  const ctx = {
    fillStyle: 'old', globalAlpha: 0.4, globalCompositeOperation: 'multiply',
    save() { calls.push(['save']); stack.push({ fillStyle: this.fillStyle, globalAlpha: this.globalAlpha, globalCompositeOperation: this.globalCompositeOperation }) },
    restore() { calls.push(['restore']); Object.assign(this, stack.pop()) },
    fillRect(...args: number[]) { calls.push(['fillRect', ...args, this.fillStyle, this.globalAlpha, this.globalCompositeOperation]) },
    translate(...args: number[]) { calls.push(['translate', ...args]) },
    transform(...args: number[]) { calls.push(['transform', ...args]) },
    drawImage(...args: unknown[]) { calls.push(['drawImage', ...args, this.globalAlpha, this.globalCompositeOperation]) },
  }
  return { ctx: ctx as unknown as CanvasRenderingContext2D, calls, stack }
}

test('quarter-turn transforms use exact integer matrices after source-axis cropping', () => {
  const expected = [
    [1, 0, 0, 1, 0, 0], [0, 1, -1, 0, 24, 0],
    [-1, 0, 0, -1, 12, 24], [0, -1, 1, 0, 0, 12],
  ]
  for (const [index, rotationDeg] of ([0, 90, 180, 270] as const).entries()) {
    const a = { ...image(), rotationDeg }
    const { ctx, calls } = recorder()
    renderComposition(ctx, { images: [a], mode: 'vertical', backgroundColor: '#fff' }, calculateComposition([a], 'vertical'), () => ({} as CanvasImageSource))
    assert.deepEqual(calls.find((call) => call[0] === 'transform'), ['transform', ...expected[index]])
    assert.deepEqual(calls.find((call) => call[0] === 'drawImage')?.slice(2, 10), [5, 2, 12, 24, 0, 0, 12, 24])
  }
})

test('renderer paints background once in world bounds and crops without scaling', () => {
  const a = image()
  const document = { images: [a], mode: 'vertical' as const, backgroundColor: '#fedcba' }
  const { ctx, calls, stack } = recorder()
  const source = {} as CanvasImageSource
  renderComposition(ctx, document, calculateComposition(document.images, document.mode), () => source)
  assert.deepEqual(calls, [
    ['save'], ['fillRect', 0, 0, 12, 24, '#fedcba', 1, 'source-over'],
    ['save'], ['translate', 0, 0], ['transform', 1, 0, 0, 1, 0, 0],
    ['drawImage', source, 5, 2, 12, 24, 0, 0, 12, 24, 1, 'source-over'], ['restore'], ['restore'],
  ])
  assert.equal(ctx.globalAlpha, 0.4)
  assert.equal(ctx.globalCompositeOperation, 'multiply')
  assert.equal(ctx.fillStyle, 'old')
  assert.equal(stack.length, 0)
})
