import assert from 'node:assert/strict'
import test from 'node:test'
import { getAlignmentImageId } from './alignment.ts'
import { calculateComposition, type Composition } from './composition.ts'
import type { ImageRecord } from './model.ts'

function composition(placements: Composition['placements']): Composition {
  return { placements, bounds: null, outputSize: null }
}

const overlapping = composition([
  { id: 'first', x: 0, y: 0, width: 10, height: 10 },
  { id: 'focused', x: 5, y: 5, width: 10, height: 10 },
])

test('focused non-first image overlapping its previous neighbor is eligible', () => {
  assert.equal(getAlignmentImageId(overlapping, 'focused', true), 'focused')
})

test('focused non-first image can overlap only its next neighbor', () => {
  const layout = composition([
    { id: 'first', x: -20, y: -20, width: 10, height: 10 },
    { id: 'focused', x: 0, y: 0, width: 10, height: 10 },
    { id: 'next', x: 5, y: 5, width: 10, height: 10 },
  ])
  assert.equal(getAlignmentImageId(layout, 'focused', true), 'focused')
})

test('disabled help, absent focus, unknown focus, and the first image are ineligible', () => {
  assert.equal(getAlignmentImageId(overlapping, 'focused', false), undefined)
  assert.equal(getAlignmentImageId(overlapping, null, true), undefined)
  assert.equal(getAlignmentImageId(overlapping, 'missing', true), undefined)
  assert.equal(getAlignmentImageId(overlapping, 'first', true), undefined)
  assert.equal(getAlignmentImageId(composition([]), 'focused', true), undefined)
  assert.equal(getAlignmentImageId(composition([overlapping.placements[1]]), 'focused', true), undefined)
})

for (const [label, x, y] of [
  ['x disjoint', 11, 5], ['y disjoint', 5, 11], ['both disjoint', 11, 11],
  ['right edge', 10, 5], ['left edge', -10, 5],
  ['bottom edge', 5, 10], ['top edge', 5, -10], ['corner', 10, 10],
] as const) {
  test(`${label} does not have positive overlap area`, () => {
    const layout = composition([overlapping.placements[0], { ...overlapping.placements[1], x, y }])
    assert.equal(getAlignmentImageId(layout, 'focused', true), undefined)
  })
}

test('overlap with a nonadjacent image does not make the focused image eligible', () => {
  const layout = composition([
    overlapping.placements[0],
    { id: 'previous', x: 30, y: 30, width: 10, height: 10 },
    overlapping.placements[1],
    { id: 'next', x: 50, y: 50, width: 10, height: 10 },
  ])
  assert.equal(getAlignmentImageId(layout, 'focused', true), undefined)
})

test('complete containment and negative coordinates have positive overlap', () => {
  const layout = composition([
    { id: 'first', x: -10, y: -10, width: 20, height: 20 },
    { id: 'focused', x: -5, y: -5, width: 5, height: 5 },
  ])
  assert.equal(getAlignmentImageId(layout, 'focused', true), 'focused')
})

test('eligibility uses real cropped and quarter-turned composition rectangles', () => {
  const first: ImageRecord = {
    id: 'first', name: 'first', originalSize: { width: 20, height: 30 },
    offset: { x: 0, y: 0 }, crop: { left: 5, right: 3, top: 2, bottom: 4 }, rotationDeg: 90,
  }
  const focused: ImageRecord = {
    ...first, id: 'focused', rotationDeg: 0,
    crop: { left: 0, right: 0, top: 0, bottom: 0 }, offset: { x: 23, y: -1 },
  }
  const layout = calculateComposition([first, focused], 'vertical')
  assert.deepEqual(layout.placements[0], { id: 'first', x: 0, y: 0, width: 24, height: 12 })
  assert.equal(getAlignmentImageId(layout, 'focused', true), 'focused')
  focused.offset.x = 24
  assert.equal(getAlignmentImageId(calculateComposition([first, focused], 'vertical'), 'focused', true), undefined)
  focused.offset = { x: 0, y: 0 }
  assert.equal(getAlignmentImageId(calculateComposition([first, focused], 'vertical'), 'focused', true), undefined)
})
