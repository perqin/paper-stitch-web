import assert from 'node:assert/strict'
import test from 'node:test'
import { createEditorStore, editorStore, useEditorStore } from './store.ts'
import type { ImageRecord } from './model.ts'
import { calculateComposition } from './composition.ts'

function image(id: string): ImageRecord {
  return { id, name: `${id}.png`, originalSize: { width: 20, height: 30 }, offset: { x: 0, y: 0 }, crop: { top: 0, right: 0, bottom: 0, left: 0 }, rotationDeg: 0 }
}

test('append rejects invalid metadata and duplicate ids atomically', () => {
  const store = createEditorStore()
  store.getState().appendImages([image('a')])
  const before = store.getState()
  for (const batch of [[image('a')], [image('b'), image('b')], [image('b'), { ...image('c'), name: '' }], [{ ...image('c'), id: '' }], [{ ...image('c'), originalSize: { width: 0, height: 1 } }], [{ ...image('c'), originalSize: { width: Number.MAX_SAFE_INTEGER + 1, height: 1 } }]]) {
    assert.equal(store.getState().appendImages(batch), false)
    assert.equal(store.getState(), before)
  }
  assert.equal(store.getState().appendImages([]), false)
})

test('edits merge by field and preserve untouched image and metadata references', () => {
  const store = createEditorStore()
  const a = image('a'), b = image('b')
  store.getState().appendImages([a, b])
  assert.equal(store.getState().updateImage('a', { offset: { x: -3, y: 5 } }), true)
  assert.equal(store.getState().updateImage('a', { rotationDeg: 270 }), true)
  const edited = store.getState().images[0]
  assert.deepEqual(edited.offset, { x: -3, y: 5 })
  assert.equal(edited.rotationDeg, 270)
  assert.equal(edited.originalSize, a.originalSize)
  assert.equal(store.getState().images[1], b)
  assert.deepEqual(a.offset, { x: 0, y: 0 })
})

test('invalid edits and unknown ids leave the exact state unchanged', () => {
  const store = createEditorStore()
  store.getState().appendImages([image('a')])
  const before = store.getState()
  for (const edits of [
    { offset: { x: NaN, y: 0 } }, { offset: { x: Infinity, y: 0 } }, { offset: { x: 0.5, y: 0 } }, { offset: { x: Number.MAX_SAFE_INTEGER + 1, y: 0 } },
    { crop: { top: -1, right: 0, bottom: 0, left: 0 } }, { crop: { top: 15, right: 0, bottom: 15, left: 0 } },
    { crop: { top: 0, right: 10, bottom: 0, left: 10 } }, { crop: { top: 0.5, right: 0, bottom: 0, left: 0 } }, { rotationDeg: 45 },
  ]) {
    assert.equal(store.getState().updateImage('a', edits as Parameters<typeof before.updateImage>[1]), false)
    assert.equal(store.getState(), before)
  }
  assert.equal(before.updateImage('missing', { rotationDeg: 90 }), false)
  assert.equal(store.getState(), before)
})

test('mode changes reset every edit in one notification; same mode preserves edits', () => {
  const store = createEditorStore()
  store.getState().appendImages([image('a'), image('b')])
  store.getState().setBackgroundColor('#aabbcc')
  for (const id of ['a', 'b']) store.getState().updateImage(id, { offset: { x: 2, y: -3 }, crop: { top: 1, right: 2, bottom: 3, left: 4 }, rotationDeg: 90 })
  const before = store.getState()
  assert.equal(before.setMode('vertical'), false)
  assert.equal(store.getState(), before)
  let notifications = 0
  store.subscribe((state) => {
    notifications++
    assert.equal(state.mode, 'horizontal')
    assert.deepEqual(state.images, [image('a'), image('b')])
  })
  assert.equal(before.setMode('horizontal'), true)
  assert.equal(notifications, 1)
  assert.equal(store.getState().backgroundColor, '#AABBCC')
  assert.equal(store.getState().images[0].originalSize, before.images[0].originalSize)
})

test('reset preserves mode, background and order, and clean reset is a no-op', () => {
  const store = createEditorStore()
  store.getState().appendImages([image('a'), image('b')])
  store.getState().setMode('horizontal')
  store.getState().setBackgroundColor('#123456')
  store.getState().updateImage('b', { rotationDeg: 180 })
  const a = store.getState().images[0]
  store.getState().resetPositions()
  assert.deepEqual(store.getState().images, [image('a'), image('b')])
  assert.equal(store.getState().images[0], a)
  assert.equal(store.getState().mode, 'horizontal')
  assert.equal(store.getState().backgroundColor, '#123456')
  const before = store.getState()
  before.resetPositions()
  assert.equal(store.getState(), before)
})

test('background accepts opaque RGB only and normalizes uppercase', () => {
  const store = createEditorStore()
  assert.equal(store.getState().setBackgroundColor('#aB09fF'), true)
  assert.equal(store.getState().backgroundColor, '#AB09FF')
  const before = store.getState()
  for (const color of ['#abc', '#11223344', 'red', '112233', ' #112233', '#gg0000', '#ab09ff']) {
    assert.equal(store.getState().setBackgroundColor(color), false)
    assert.equal(store.getState(), before)
  }
})

test('reorder and removal preserve edits and references, boundary operations are no-ops', () => {
  const store = createEditorStore()
  store.getState().appendImages([image('a'), image('b'), image('c')])
  store.getState().updateImage('b', { rotationDeg: 90 })
  const [a, b, c] = store.getState().images
  const before = store.getState()
  before.moveImage('a', 'up')
  before.moveImage('c', 'down')
  before.moveImage('missing', 'up')
  before.removeImage('missing')
  assert.equal(store.getState(), before)
  before.moveImage('b', 'up')
  assert.deepEqual(store.getState().images, [b, a, c])
  store.getState().moveImage('b', 'down')
  assert.deepEqual(store.getState().images, [a, b, c])
  store.getState().removeImage('b')
  assert.deepEqual(store.getState().images, [a, c])
})

test('reorder recomputes placement from preserved edited dimensions', () => {
  const store = createEditorStore()
  store.getState().appendImages([image('a'), image('b')])
  store.getState().updateImage('b', { offset: { x: -2, y: 3 }, crop: { top: 1, right: 2, bottom: 3, left: 4 }, rotationDeg: 90 })
  const before = store.getState()
  const snapshot = structuredClone(before.images)
  assert.deepEqual(calculateComposition(before.images, before.mode).placements[1], { id: 'b', x: -2, y: 33, width: 26, height: 14 })
  assert.deepEqual(before.images, snapshot)
  before.moveImage('b', 'up')
  const after = store.getState()
  assert.deepEqual(calculateComposition(after.images, after.mode).placements, [
    { id: 'b', x: -2, y: 3, width: 26, height: 14 },
    { id: 'a', x: 0, y: 17, width: 20, height: 30 },
  ])
  assert.equal(after.images[0], before.images[1])
})

test('unchanged edits, empty append and invalid mode do not notify subscribers', () => {
  const store = createEditorStore()
  store.getState().appendImages([image('a')])
  const before = store.getState()
  let notifications = 0
  store.subscribe(() => notifications++)
  assert.equal(before.updateImage('a', {}), false)
  assert.equal(before.updateImage('a', { offset: { x: 0, y: 0 }, crop: { top: 0, right: 0, bottom: 0, left: 0 }, rotationDeg: 0 }), false)
  assert.equal(before.appendImages([]), false)
  assert.equal(before.setMode('freeform' as Parameters<typeof before.setMode>[0]), false)
  assert.equal(store.getState(), before)
  assert.equal(notifications, 0)
})

test('append validates edit parameters as well as metadata', () => {
  const store = createEditorStore()
  const before = store.getState()
  const invalidImages: ImageRecord[] = [
    { ...image('a'), offset: { x: 0, y: Infinity } },
    { ...image('a'), crop: { top: 30, right: 0, bottom: 0, left: 0 } },
    { ...image('a'), rotationDeg: 45 as ImageRecord['rotationDeg'] },
  ]
  for (const invalid of invalidImages) {
    assert.equal(before.appendImages([invalid]), false)
    assert.equal(store.getState(), before)
  }
  const large = { ...image('large'), originalSize: { width: Number.MAX_SAFE_INTEGER, height: 1 }, crop: { top: 0, right: 0, bottom: 0, left: Number.MAX_SAFE_INTEGER - 1 } }
  assert.equal(before.appendImages([large]), true)
  assert.deepEqual(calculateComposition(store.getState().images, 'vertical').outputSize, { width: 1, height: 1 })
})

test('fresh vanilla stores are isolated, empty, vertical and opaque white', () => {
  const store = createEditorStore()
  assert.equal(store.getState().mode, 'vertical')
  assert.equal(store.getState().backgroundColor, '#FFFFFF')
  assert.deepEqual(store.getState().images, [])
  assert.notEqual(store, editorStore)
  assert.equal(typeof useEditorStore, 'function')
  const a = image('a')
  assert.equal(store.getState().appendImages([a]), true)
  assert.deepEqual(store.getState().images, [a])
  assert.deepEqual(createEditorStore().getState().images, [])
})
