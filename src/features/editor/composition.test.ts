import assert from 'node:assert/strict'
import test from 'node:test'
import { calculateComposition } from './composition.ts'
import type { ImageRecord } from './model.ts'

function image(id: string, width: number, height: number): ImageRecord {
  return { id, name: `${id}.png`, originalSize: { width, height }, offset: { x: 0, y: 0 }, crop: { top: 0, right: 0, bottom: 0, left: 0 }, rotationDeg: 0 }
}

test('empty documents have no bounds or output', () => {
  assert.deepEqual(calculateComposition([], 'vertical'), { placements: [], bounds: null, outputSize: null })
})

test('the first image is anchored at the document origin even after reordering edited records', () => {
  const first = { ...image('a', 20, 30), offset: { x: -10, y: 15 } }
  for (const mode of ['vertical', 'horizontal'] as const) {
    assert.deepEqual(calculateComposition([first], mode).placements[0], { id: 'a', x: 0, y: 0, width: 20, height: 30 })
  }
})

test('crop happens before all quarter-turn rotations in both modes', () => {
  for (const mode of ['vertical', 'horizontal'] as const) {
    for (const rotationDeg of [0, 90, 180, 270] as const) {
      const a = { ...image('a', 20, 30), crop: { top: 2, right: 3, bottom: 4, left: 5 }, rotationDeg }
      const width = rotationDeg === 90 || rotationDeg === 270 ? 24 : 12
      const height = rotationDeg === 90 || rotationDeg === 270 ? 12 : 24
      assert.deepEqual(calculateComposition([a, image('b', 7, 9)], mode).placements, [
        { id: 'a', x: 0, y: 0, width, height },
        { id: 'b', x: mode === 'horizontal' ? width : 0, y: mode === 'vertical' ? height : 0, width: 7, height: 9 },
      ])
    }
  }
})

test('negative offsets overlap, positive offsets gap, and adjusted edges propagate', () => {
  const a = image('a', 20, 10)
  const b = { ...image('b', 8, 8), offset: { x: -25, y: -12 } }
  const c = { ...image('c', 4, 6), offset: { x: 2, y: 5 } }
  assert.deepEqual(calculateComposition([a, b, c], 'vertical'), {
    placements: [{ id: 'a', x: 0, y: 0, width: 20, height: 10 }, { id: 'b', x: -25, y: -2, width: 8, height: 8 }, { id: 'c', x: 2, y: 11, width: 4, height: 6 }],
    bounds: { x: -25, y: -2, width: 45, height: 19 }, outputSize: { width: 45, height: 19 },
  })
  assert.deepEqual(calculateComposition([a, b, c], 'horizontal'), {
    placements: [{ id: 'a', x: 0, y: 0, width: 20, height: 10 }, { id: 'b', x: -5, y: -12, width: 8, height: 8 }, { id: 'c', x: 5, y: 5, width: 4, height: 6 }],
    bounds: { x: -5, y: -12, width: 25, height: 23 }, outputSize: { width: 25, height: 23 },
  })
})

test('unsafe coordinates, edges, union spans and nonpositive dimensions throw', () => {
  const max = Number.MAX_SAFE_INTEGER
  for (const images of [
    [image('a', 1, 1), { ...image('b', 1, 1), offset: { x: max, y: 0 } }],
    [image('a', 1, max), image('b', 1, 1)],
    [image('a', max, 1), { ...image('b', 1, 1), offset: { x: -max, y: 0 } }],
    [{ ...image('a', 1, 1), crop: { top: 0, right: 1, bottom: 0, left: 0 } }],
    [image('a', max + 1, 1)],
  ]) assert.throws(() => calculateComposition(images, 'vertical'), RangeError)
})

test('vertical placement retains unequal widths', () => {
  assert.deepEqual(calculateComposition([image('a', 20, 10), image('b', 30, 15)], 'vertical'), {
    placements: [{ id: 'a', x: 0, y: 0, width: 20, height: 10 }, { id: 'b', x: 0, y: 10, width: 30, height: 15 }],
    bounds: { x: 0, y: 0, width: 30, height: 25 }, outputSize: { width: 30, height: 25 },
  })
})
