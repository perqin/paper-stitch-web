import test from 'node:test'
import assert from 'node:assert/strict'
import { fitCamera, zoomCamera, panCamera, resizeCamera, documentToScreen } from './camera.ts'

test('fit includes negative bounds but later bounds changes do not move document origin', () => {
  const camera = fitCamera({ x: 0, y: 0, width: 100, height: 200 }, { width: 400, height: 400 })
  const before = documentToScreen(camera, { x: 0, y: 0 })
  assert.deepEqual(documentToScreen(camera, { x: 0, y: 0 }), before)
  assert.equal(documentToScreen(camera, { x: -10, y: 0 }).x, before.x - 10 * camera.zoom)
  const fitted = fitCamera({ x: -10, y: 0, width: 110, height: 200 }, { width: 400, height: 400 })
  assert.ok(documentToScreen(fitted, { x: -10, y: 0 }).x >= 24)
})

test('zoom keeps the document point under viewport center stationary', () => {
  const camera = { zoom: 0.5, x: 30, y: 40 }
  const viewport = { width: 400, height: 300 }
  const point = { x: (200 - camera.x) / camera.zoom, y: (150 - camera.y) / camera.zoom }
  const next = zoomCamera(camera, 2, viewport)
  assert.deepEqual(documentToScreen(next, point), { x: 200, y: 150 })
  assert.equal(next.zoom, 1)
})

test('pan uses CSS pixels and resize preserves the centered document point', () => {
  const camera = { zoom: 0.5, x: 30, y: 40 }
  assert.deepEqual(panCamera(camera, 64, -64), { zoom: 0.5, x: 94, y: -24 })
  assert.deepEqual(resizeCamera(camera, { width: 400, height: 300 }, { width: 600, height: 500 }), { zoom: 0.5, x: 130, y: 140 })
})
