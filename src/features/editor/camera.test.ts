import test from 'node:test'
import assert from 'node:assert/strict'
import { constrainCamera, fitCamera, zoomCamera, panCamera, resizeCamera, documentToScreen } from './camera.ts'

test('constrain clamps both pan extremes with 40 CSS pixels at negative world bounds', () => {
  const bounds = { x: -100, y: -200, width: 1000, height: 800 }
  const viewport = { width: 400, height: 300 }
  assert.deepEqual(constrainCamera({ zoom: 0.5, x: 999, y: 999 }, bounds, viewport), { zoom: 0.5, x: 90, y: 140 })
  assert.deepEqual(constrainCamera({ zoom: 0.5, x: -999, y: -999 }, bounds, viewport), { zoom: 0.5, x: -90, y: -40 })
})

test('axes that fit ignore panning and recenter after bounds, viewport, or zoom edits', () => {
  const bounds = { x: -100, y: -200, width: 200, height: 1000 }
  const viewport = { width: 400, height: 300 }
  const camera = { zoom: 1, x: 999, y: -999 }
  assert.deepEqual(constrainCamera(camera, bounds, viewport), { zoom: 1, x: 200, y: -540 })
  assert.deepEqual(constrainCamera(camera, { ...bounds, x: -50, width: 100 }, viewport), { zoom: 1, x: 200, y: -540 })
  assert.deepEqual(constrainCamera(camera, bounds, { width: 500, height: 1200 }), { zoom: 1, x: 250, y: 300 })
  assert.deepEqual(constrainCamera({ ...camera, zoom: 0.1 }, bounds, viewport), { zoom: 0.1, x: 200, y: 120 })
  assert.deepEqual(constrainCamera(camera, { x: -200, y: -100, width: 1000, height: 200 }, viewport), { zoom: 1, x: 240, y: 150 })
})

test('tiny viewports reduce each margin to half its CSS dimension', () => {
  const bounds = { x: -10, y: -20, width: 100, height: 200 }
  const viewport = { width: 60, height: 20 }
  assert.deepEqual(constrainCamera({ zoom: 1, x: 999, y: 999 }, bounds, viewport), { zoom: 1, x: 40, y: 30 })
  assert.deepEqual(constrainCamera({ zoom: 1, x: -999, y: -999 }, bounds, viewport), { zoom: 1, x: -60, y: -170 })
})

test('the exact 80px inset threshold is centered while larger axes retain legal pan', () => {
  const viewport = { width: 400, height: 300 }
  const bounds = { x: -10, y: -20, width: 640, height: 440 }
  assert.deepEqual(constrainCamera({ zoom: 0.5, x: 999, y: -999 }, bounds, viewport), { zoom: 0.5, x: 45, y: 50 })
  const camera = { zoom: 0.5, x: 44.5, y: 49.5 }
  const larger = { ...bounds, width: 642, height: 442 }
  assert.deepEqual(constrainCamera(camera, larger, viewport), camera)
  assert.deepEqual(constrainCamera(constrainCamera(camera, larger, viewport), larger, viewport), camera)
})

test('fit includes negative bounds but later bounds changes do not move document origin', () => {
  const camera = fitCamera({ x: 0, y: 0, width: 100, height: 200 }, { width: 400, height: 400 })
  const before = documentToScreen(camera, { x: 0, y: 0 })
  assert.deepEqual(documentToScreen(camera, { x: 0, y: 0 }), before)
  assert.equal(documentToScreen(camera, { x: -10, y: 0 }).x, before.x - 10 * camera.zoom)
  const fitted = fitCamera({ x: -10, y: 0, width: 110, height: 200 }, { width: 400, height: 400 })
  assert.ok(documentToScreen(fitted, { x: -10, y: 0 }).x >= 40)
})

test('fit reserves 40 CSS pixels per side without upscaling small documents', () => {
  const viewport = { width: 400, height: 300 }
  assert.deepEqual(fitCamera({ x: -100, y: -200, width: 640, height: 440 }, viewport), { zoom: 0.5, x: 90, y: 140 })
  assert.deepEqual(fitCamera({ x: -100, y: -200, width: 100, height: 100 }, viewport), { zoom: 1, x: 250, y: 300 })
  assert.equal(fitCamera({ x: 0, y: 0, width: 1000, height: 1000 }, viewport).zoom, 0.22)
})

test('zoom keeps the document point under viewport center stationary', () => {
  const camera = { zoom: 0.5, x: 30, y: 40 }
  const viewport = { width: 400, height: 300 }
  const point = { x: (200 - camera.x) / camera.zoom, y: (150 - camera.y) / camera.zoom }
  const next = zoomCamera(camera, 2, viewport)
  assert.deepEqual(documentToScreen(next, point), { x: 200, y: 150 })
  assert.equal(next.zoom, 1)
})

test('cursor-anchored zoom keeps its document point stationary before constraints', () => {
  const viewport = { width: 400, height: 300 }
  const anchor = { x: 83, y: 117 }
  for (const [camera, factor, expectedZoom] of [
    [{ zoom: 0.5, x: 30, y: 40 }, 2, 1],
    [{ zoom: 8, x: -300, y: -200 }, 4, 16],
    [{ zoom: 0.002, x: 20, y: 10 }, 0.1, 0.001],
  ] as const) {
    const point = { x: (anchor.x - camera.x) / camera.zoom, y: (anchor.y - camera.y) / camera.zoom }
    const next = zoomCamera(camera, factor, viewport, anchor)
    assert.deepEqual(documentToScreen(next, point), anchor)
    assert.equal(next.zoom, expectedZoom)
  }
})

test('pan uses CSS pixels and resize preserves the centered document point', () => {
  const camera = { zoom: 0.5, x: 30, y: 40 }
  assert.deepEqual(panCamera(camera, 64, -64), { zoom: 0.5, x: 94, y: -24 })
  assert.deepEqual(resizeCamera(camera, { width: 400, height: 300 }, { width: 600, height: 500 }), { zoom: 0.5, x: 130, y: 140 })
})
