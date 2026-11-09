import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'

async function upload(page: Page, width = 1000) {
  await page.goto('/')
  const base64 = await page.evaluate(width => {
    const canvas = document.createElement('canvas')
    canvas.width = width; canvas.height = 1000
    const context = canvas.getContext('2d')!
    context.fillStyle = '#ff0000'; context.fillRect(0, 0, width, 1000)
    return canvas.toDataURL().split(',')[1]
  }, width)
  await page.locator('input[type=file]').setInputFiles(['first.png', 'second.png'].map(name => ({ name, mimeType: 'image/png', buffer: Buffer.from(base64, 'base64') })))
  await expect(page.getByLabel('Output dimensions')).toHaveText(`Output: ${width} × 2000 px`)
  await page.getByRole('button', { name: '100%', exact: true }).click()
  await expect.poll(() => geometry(page).then(g => g.zoom)).toBe(1)
}

async function geometry(page: Page, bounds = { x: 0, y: 0, width: 1000, height: 2000 }) {
  return page.getByLabel('Stitched image preview', { exact: true }).evaluate((canvas: HTMLCanvasElement, bounds) => {
    const rect = canvas.getBoundingClientRect()
    const t = canvas.getContext('2d')!.getTransform()
    const scaleX = canvas.width / rect.width, scaleY = canvas.height / rect.height
    const x = t.e / scaleX, y = t.f / scaleY, zoom = t.a / scaleX
    return { x, y, zoom, width: rect.width, height: rect.height, left: x + bounds.x * zoom, right: x + (bounds.x + bounds.width) * zoom, top: y + bounds.y * zoom, bottom: y + (bounds.y + bounds.height) * zoom }
  }, bounds)
}

async function drag(page: Page, dx: number, dy: number) {
  const box = (await page.getByLabel('Stitched image preview', { exact: true }).boundingBox())!
  // Deliberately start near the edge, including gray workspace when content is inset.
  await page.mouse.move(box.x + 10, box.y + 10)
  await page.mouse.down()
  await page.mouse.move(box.x + 10 + dx, box.y + 10 + dy, { steps: 4 })
  await page.mouse.up()
}

test('left drag captures outside the viewport and clamps both axes to 40 CSS pixels', async ({ page }) => {
  await upload(page)
  async function download() {
    const waiting = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Download PNG', exact: true }).click()
    return readFile((await (await waiting).path())!)
  }
  const original = await download()
  await drag(page, 3000, 3000)
  await expect.poll(() => geometry(page).then(g => [g.left, g.top])).toEqual([40, 40])
  await drag(page, -6000, -6000)
  await expect.poll(async () => { const g = await geometry(page); return [g.right - g.width, g.bottom - g.height] }).toEqual([-40, -40])
  const stopped = await geometry(page)
  const box = (await page.getByLabel('Stitched image preview', { exact: true }).boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  expect(await geometry(page)).toEqual(stopped)
  expect(await download()).toEqual(original)
  await expect(page.getByRole('button', { name: /^Pan (left|right|up|down)$/ })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /^Zoom (in|out)$/ })).toHaveCount(0)
})

test('wheel and trackpad pinch zoom at the cursor without browser zoom or page scroll', async ({ page }) => {
  await upload(page)
  const box = (await page.getByLabel('Stitched image preview', { exact: true }).boundingBox())!
  const anchor = { x: Math.round(box.x + box.width * 0.4) - box.x, y: Math.round(box.y + box.height * 0.4) - box.y }
  await page.mouse.move(box.x + anchor.x, box.y + anchor.y)
  let before = await geometry(page)
  const point = { x: (anchor.x - before.x) / before.zoom, y: (anchor.y - before.y) / before.zoom }
  await page.mouse.wheel(0, -120)
  await expect.poll(() => geometry(page).then(g => g.zoom)).toBeGreaterThan(before.zoom)
  const after = await geometry(page)
  expect(after.x + point.x * after.zoom).toBeCloseTo(anchor.x, 3)
  expect(after.y + point.y * after.zoom).toBeCloseTo(anchor.y, 3)
  before = after
  const dpr = await page.evaluate(() => devicePixelRatio)
  await page.keyboard.down('Control')
  await page.mouse.wheel(0, -30)
  await page.keyboard.up('Control')
  await expect.poll(() => geometry(page).then(g => g.zoom)).toBeGreaterThan(before.zoom)
  expect(await page.evaluate(() => devicePixelRatio)).toBe(dpr)
  await page.setViewportSize({ width: 375, height: 812 })
  const mobileBox = (await page.getByLabel('Stitched image preview', { exact: true }).boundingBox())!
  await page.mouse.move(mobileBox.x + 100, mobileBox.y + 100)
  const scroll = await page.evaluate(() => scrollY)
  const mobileBefore = await geometry(page)
  await page.mouse.wheel(0, 120)
  await expect.poll(() => geometry(page).then(g => g.zoom)).toBeLessThan(mobileBefore.zoom)
  expect(await page.evaluate(() => scrollY)).toBe(scroll)
})

test('narrow content is horizontally locked and re-centers on positioning edits', async ({ page }) => {
  await upload(page, 100)
  const narrow = { x: 0, y: 0, width: 100, height: 2000 }
  await drag(page, 500, 3000)
  let g = await geometry(page, narrow)
  expect(g.left).toBeCloseTo((g.width - 100) / 2, 5)
  expect(g.top).toBe(40)
  const before = g.x
  const offset = page.getByRole('spinbutton', { name: 'X offset: second.png', exact: true })
  await offset.fill('-20')
  await expect.poll(async () => { const g = await geometry(page, { ...narrow, x: -20, width: 120 }); return g.left - (g.width - 120) / 2 }).toBeCloseTo(0, 5)
  g = await geometry(page, { ...narrow, x: -20, width: 120 })
  expect(g.x).not.toBe(before)
  await offset.fill('-1000')
  await expect(page.getByLabel('Output dimensions')).toHaveText('Output: 1100 × 2000 px')
  await drag(page, 3000, 0)
  await expect.poll(() => geometry(page, { ...narrow, x: -1000, width: 1100 }).then(g => g.left)).toBe(40)
  await offset.fill('0')
  await expect.poll(async () => { const g = await geometry(page, narrow); return g.left - (g.width - 100) / 2 }).toBeCloseTo(0, 5)
})

test('resizing enforces centering and right-button movement does not drag', async ({ page }) => {
  await upload(page)
  await page.setViewportSize({ width: 2000, height: 1800 })
  await expect.poll(async () => { const g = await geometry(page); return g.left - (g.width - 1000) / 2 }).toBeCloseTo(0, 5)
  const before = await geometry(page)
  const box = (await page.getByLabel('Stitched image preview', { exact: true }).boundingBox())!
  await page.mouse.move(box.x + 100, box.y + 100)
  await page.mouse.down({ button: 'right' })
  await page.mouse.move(box.x + 200, box.y + 200)
  await page.mouse.up({ button: 'right' })
  expect(await geometry(page)).toEqual(before)
})

test('pointer cancellation releases capture and stops dragging', async ({ page }) => {
  await upload(page)
  const canvas = page.getByLabel('Stitched image preview', { exact: true })
  const box = (await canvas.boundingBox())!
  await page.mouse.move(box.x + 100, box.y + 100)
  const before = await geometry(page)
  await page.mouse.down()
  await page.mouse.move(box.x + 140, box.y + 140)
  await expect.poll(() => geometry(page).then(g => g.x)).not.toBe(before.x)
  await canvas.evaluate(element => {
    const section = element.parentElement!
    section.dispatchEvent(new PointerEvent('pointercancel', { pointerId: 1, bubbles: true }))
  })
  await expect(page.getByRole('region', { name: 'Stitch preview', exact: true })).toHaveCSS('cursor', 'grab')
  const stopped = await geometry(page)
  await page.mouse.move(box.x + 200, box.y + 200)
  await page.mouse.up()
  expect(await geometry(page)).toEqual(stopped)
})

test('Safari gesture events use cumulative pinch scale without double-counting wheel events', async ({ page }) => {
  await upload(page)
  const preview = page.getByLabel('Stitched image preview', { exact: true })
  async function gesture(type: string, scale: number) {
    await preview.evaluate((element, { type, scale }) => {
      const rect = element.getBoundingClientRect()
      const event = new Event(type, { bubbles: true, cancelable: true })
      Object.assign(event, { scale, clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 })
      element.dispatchEvent(event)
    }, { type, scale })
  }
  await gesture('gesturestart', 1)
  await gesture('gesturechange', 1.2)
  await expect.poll(() => geometry(page).then(g => g.zoom)).toBeCloseTo(1.2, 5)
  await gesture('gesturechange', 1.5)
  await expect.poll(() => geometry(page).then(g => g.zoom)).toBeCloseTo(1.5, 5)
  await preview.dispatchEvent('wheel', { deltaY: -100, ctrlKey: true, cancelable: true })
  expect((await geometry(page)).zoom).toBeCloseTo(1.5, 5)
  await gesture('gestureend', 1.5)
  await preview.dispatchEvent('wheel', { deltaY: -30, ctrlKey: true, cancelable: true })
  await expect.poll(() => geometry(page).then(g => g.zoom)).toBeGreaterThan(1.5)
})

test('invalid document geometry disables gestures until the edit is corrected', async ({ page }) => {
  await upload(page)
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  const offset = page.getByRole('spinbutton', { name: 'X offset: second.png', exact: true })
  await offset.fill(String(Number.MAX_SAFE_INTEGER))
  await expect(page.getByLabel('Output dimensions')).toHaveText('Output: out of range')
  const box = (await page.getByLabel('Stitched image preview', { exact: true }).boundingBox())!
  await page.mouse.move(box.x + 100, box.y + 100)
  await page.mouse.wheel(0, 120)
  await drag(page, 50, 50)
  expect(errors).toEqual([])
  await offset.fill('0')
  await drag(page, 3000, 3000)
  await expect.poll(() => geometry(page).then(g => [g.left, g.top])).toEqual([40, 40])
})
