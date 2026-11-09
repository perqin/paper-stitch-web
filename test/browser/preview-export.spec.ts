import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'

async function upload(page: Page) {
  const data = await page.evaluate(() => {
    return ['#ff0000', '#0000ff'].map((color, index) => {
      const canvas = document.createElement('canvas')
      canvas.width = index ? 4 : 8
      canvas.height = index ? 4 : 6
      const context = canvas.getContext('2d')!
      context.fillStyle = color
      context.fillRect(0, 0, canvas.width, canvas.height)
      return canvas.toDataURL().split(',')[1]
    })
  })
  await page.locator('input[type=file]').setInputFiles(data.map((base64, index) => ({ name: `${index ? 'second' : 'first'}.png`, mimeType: 'image/png', buffer: Buffer.from(base64, 'base64') })))
  await expect(page.getByRole('listitem')).toHaveCount(2)
  await expect(page.getByLabel('Output dimensions')).toHaveText('Output: 8 × 10 px')
}

async function decode(page: Page, bytes: Buffer, type = 'image/png') {
  return page.evaluate(async ({ data, type }) => {
    const image = await createImageBitmap(new Blob([new Uint8Array(data)], { type }))
    const canvas = document.createElement('canvas')
    canvas.width = image.width
    canvas.height = image.height
    const context = canvas.getContext('2d')!
    context.drawImage(image, 0, 0)
    image.close()
    return { width: canvas.width, height: canvas.height, pixels: Array.from(context.getImageData(0, 0, canvas.width, canvas.height).data) }
  }, { data: Array.from(bytes), type })
}

async function downloadPNG(page: Page) {
  const waiting = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download PNG', exact: true }).click()
  const download = await waiting
  expect(download.suggestedFilename()).toBe('paper-stitch.png')
  const bytes = await readFile((await download.path())!)
  expect(Array.from(bytes.subarray(0, 8))).toEqual([137, 80, 78, 71, 13, 10, 26, 10])
  return decode(page, bytes)
}

async function matrix(page: Page) {
  return page.getByLabel('Stitched image preview', { exact: true }).evaluate((element: HTMLCanvasElement) => {
    const value = element.getContext('2d')!.getTransform()
    return { a: value.a, d: value.d, e: value.e, f: value.f }
  })
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  expect(await page.evaluate(() => ({ secure: isSecureContext, uuid: typeof crypto.randomUUID }))).toEqual({ secure: false, uuid: 'undefined' })
})

test('native spinner clicks apply immediately without blurring or replacing the input', async ({ page }) => {
  await upload(page)
  const field = page.getByRole('spinbutton', { name: 'Y offset: second.png', exact: true })
  await field.hover()
  const box = (await field.boundingBox())!
  const padding = await field.evaluate(input => parseFloat(getComputedStyle(input).paddingRight))
  await field.click({ position: { x: box.width - padding - 5, y: box.height / 2 - 5 } })
  await expect(field).toHaveValue('1')
  await expect(field).toBeFocused()
  await expect(page.getByLabel('Output dimensions')).toHaveText('Output: 8 × 11 px')
  await field.click({ position: { x: box.width - padding - 5, y: box.height / 2 + 5 } })
  await expect(field).toHaveValue('0')
  await expect(field).toBeFocused()
  await expect(page.getByLabel('Output dimensions')).toHaveText('Output: 8 × 10 px')
})

test('focused arrow keys step one pixel repeatedly and commit before blur', async ({ page }) => {
  await upload(page)
  const field = page.getByRole('spinbutton', { name: 'Y offset: second.png', exact: true })
  await field.focus()
  for (const value of [1, 2, 3]) {
    await field.press('ArrowUp')
    await expect(field).toHaveValue(String(value))
    await expect(field).toBeFocused()
    await expect(page.getByLabel('Output dimensions')).toHaveText(`Output: 8 × ${10 + value} px`)
  }
  await field.press('ArrowDown')
  await expect(field).toHaveValue('2')
  await expect(field).toBeFocused()
  await expect(page.getByLabel('Output dimensions')).toHaveText('Output: 8 × 12 px')
})

test('live numeric edits retain invalid drafts, recover with stepping, and reflect Reset', async ({ page }) => {
  await upload(page)
  const field = page.getByRole('spinbutton', { name: 'Top crop: second.png', exact: true })
  await field.fill('4')
  await expect(page.getByLabel('Output dimensions')).toHaveText('Output: 8 × 10 px')
  await expect(field).toHaveAttribute('aria-invalid', 'true')
  await expect(field).toBeFocused()
  await field.press('ArrowDown')
  await expect(field).toHaveValue('3')
  await expect(field).toBeFocused()
  await expect(field).toHaveAttribute('aria-invalid', 'false')
  await expect(page.getByLabel('Output dimensions')).toHaveText('Output: 8 × 7 px')
  await field.fill('')
  await expect(page.getByLabel('Output dimensions')).toHaveText('Output: 8 × 7 px')
  await page.getByRole('button', { name: 'Reset', exact: true }).click()
  await page.getByRole('alertdialog', { name: 'Reset positioning?', exact: true }).getByRole('button', { name: 'Confirm', exact: true }).click()
  await expect(page.getByRole('alertdialog')).toHaveCount(0)
  await expect(field).toHaveValue('0')
  await field.press('ArrowDown')
  await expect(field).toHaveValue('0')
  await expect(field).toBeFocused()
  await expect(page.getByLabel('Output dimensions')).toHaveText('Output: 8 × 10 px')
})

test('locked preview re-centers while downloads ignore camera, viewport and DPR', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await expect(page.getByRole('button', { name: 'Download PNG', exact: true })).toBeDisabled()
  await upload(page)
  await page.getByRole('button', { name: '100%', exact: true }).click()
  await expect.poll(() => matrix(page).then(value => value.a)).toBe(await page.evaluate(() => devicePixelRatio))
  const before = await matrix(page)
  await expect(page.getByRole('spinbutton', { name: 'X offset: first.png', exact: true })).toHaveCount(0)
  const offset = page.getByRole('spinbutton', { name: 'X offset: second.png', exact: true })
  await offset.fill('-10')
  await offset.press('Tab')
  await expect(page.getByLabel('Output dimensions')).toHaveText('Output: 18 × 10 px')
  await expect.poll(() => matrix(page).then(value => value.e)).toBeCloseTo(before.e + ((18 - 8) / 2) * before.a, 5)
  const original = await downloadPNG(page)
  expect({ width: original.width, height: original.height }).toEqual({ width: 18, height: 10 })
  expect(original.pixels.slice((10 * 4), (10 * 4) + 4)).toEqual([255, 0, 0, 255])
  expect(original.pixels.slice((6 * 18) * 4, (6 * 18) * 4 + 4)).toEqual([0, 0, 255, 255])
  const canvas = page.getByLabel('Stitched image preview', { exact: true })
  const box = (await canvas.boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.wheel(0, -120)
  await expect.poll(() => matrix(page).then(value => value.a)).toBeGreaterThan(before.a)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2 + 64, box.y + box.height / 2 - 64)
  await page.mouse.up()
  expect(await downloadPNG(page)).toEqual(original)
  await page.setViewportSize({ width: 375, height: 812 })
  expect(await downloadPNG(page)).toEqual(original)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  expect(errors).toEqual([])
})

test('actual renderer/export pixels match an independent crop/quarter-turn/overlap reference', async ({ page }) => {
  const result = await page.evaluate(async () => {
    // Native browser imports exercise actual application modules, not a second renderer.
    const base = '/src/features/editor/'
    const { calculateComposition } = await import(base + 'composition.ts') as typeof import('../../src/features/editor/composition.ts')
    const { renderComposition } = await import(base + 'renderer.ts') as typeof import('../../src/features/editor/renderer.ts')
    const { exportImage } = await import(base + 'export.ts') as typeof import('../../src/features/editor/export.ts')
    const colors = [[255, 0, 0, 255], [0, 255, 0, 255], [0, 0, 255, 255], [255, 255, 0, 255], [0, 255, 255, 255], [255, 0, 255, 255], [0, 0, 0, 0]]
    const sources = [0, 1].map(index => {
      const canvas = document.createElement('canvas')
      canvas.width = index ? 3 : 4
      canvas.height = index ? 4 : 3
      const context = canvas.getContext('2d')!
      const data = context.createImageData(canvas.width, canvas.height)
      for (let i = 0; i < canvas.width * canvas.height; i++) data.data.set(colors[(i + index * 2) % colors.length], i * 4)
      context.putImageData(data, 0, 0)
      return { canvas, pixels: Array.from(data.data) }
    })
    let checked = 0
    for (const mode of ['vertical', 'horizontal'] as const) for (const rotation of [0, 90, 180, 270] as const) {
      const images = sources.map((source, index) => ({
        id: String(index), name: `${index}.png`, originalSize: { width: source.canvas.width, height: source.canvas.height },
        offset: { x: index ? -1 : 0, y: index ? -1 : 0 },
        crop: index ? { top: 0, right: 1, bottom: 1, left: 0 } : { top: 1, right: 0, bottom: 0, left: 1 },
        rotationDeg: rotation,
      }))
      const snapshot = { images, mode, backgroundColor: '#ffffff' }
      const layout = calculateComposition(images, mode)
      const placements: { x: number; y: number; width: number; height: number }[] = []
      for (const [index, image] of images.entries()) {
        const w = image.originalSize.width - image.crop.left - image.crop.right
        const h = image.originalSize.height - image.crop.top - image.crop.bottom
        const width = rotation === 90 || rotation === 270 ? h : w
        const height = rotation === 90 || rotation === 270 ? w : h
        const previous = placements[index - 1]
        const x = index ? (mode === 'horizontal' ? previous.x + previous.width : 0) + image.offset.x : 0
        const y = index ? (mode === 'vertical' ? previous.y + previous.height : 0) + image.offset.y : 0
        placements.push({ x, y, width, height })
      }
      const minX = Math.min(...placements.map(p => p.x)), minY = Math.min(...placements.map(p => p.y))
      const width = Math.max(...placements.map(p => p.x + p.width)) - minX
      const height = Math.max(...placements.map(p => p.y + p.height)) - minY
      const expected = new Uint8ClampedArray(width * height * 4).fill(255)
      images.forEach((image, index) => {
        const w = image.originalSize.width - image.crop.left - image.crop.right
        const h = image.originalSize.height - image.crop.top - image.crop.bottom
        for (let sy = 0; sy < h; sy++) for (let sx = 0; sx < w; sx++) {
          const pixel = sources[index].pixels.slice(((sy + image.crop.top) * image.originalSize.width + sx + image.crop.left) * 4, ((sy + image.crop.top) * image.originalSize.width + sx + image.crop.left) * 4 + 4)
          if (!pixel[3]) continue
          const dx = rotation === 90 ? h - 1 - sy : rotation === 180 ? w - 1 - sx : rotation === 270 ? sy : sx
          const dy = rotation === 90 ? sx : rotation === 180 ? h - 1 - sy : rotation === 270 ? w - 1 - sx : sy
          expected.set(pixel, ((placements[index].y - minY + dy) * width + placements[index].x - minX + dx) * 4)
        }
      })
      const getSource = (id: string) => sources[Number(id)].canvas
      const preview = document.createElement('canvas')
      preview.width = width; preview.height = height
      const context = preview.getContext('2d')!
      context.translate(-minX, -minY)
      renderComposition(context, snapshot, layout, getSource)
      const blob = await exportImage(snapshot, getSource, 'PNG')
      const exported = await createImageBitmap(blob)
      const output = document.createElement('canvas')
      output.width = exported.width; output.height = exported.height
      output.getContext('2d')!.drawImage(exported, 0, 0)
      exported.close()
      const rendered = context.getImageData(0, 0, width, height).data
      const encoded = output.getContext('2d')!.getImageData(0, 0, width, height).data
      if (output.width !== width || output.height !== height || expected.some((value, i) => value !== rendered[i] || value !== encoded[i])) throw new Error(`Pixel mismatch: ${mode}, ${rotation}`)
      checked++
    }
    const jpeg = await exportImage({ images: [{ id: '0', name: 'solid.png', originalSize: { width: 4, height: 3 }, offset: { x: 0, y: 0 }, crop: { top: 0, right: 0, bottom: 0, left: 0 }, rotationDeg: 0 }], mode: 'vertical', backgroundColor: '#ffffff' }, () => sources[0].canvas, 'JPEG')
    const bytes = new Uint8Array(await jpeg.arrayBuffer())
    const jpegImage = await createImageBitmap(jpeg)
    const dimensions = [jpegImage.width, jpegImage.height]
    jpegImage.close()
    return { checked, jpegType: jpeg.type, jpegHeader: Array.from(bytes.slice(0, 3)), dimensions }
  })
  expect(result).toEqual({ checked: 8, jpegType: 'image/jpeg', jpegHeader: [255, 216, 255], dimensions: [4, 3] })
})

test('in-flight UI export retains click-time content after image removal and releases busy state on failure', async ({ page }) => {
  await upload(page)
  const expected = await downloadPNG(page)
  await page.evaluate(() => {
    const original = HTMLCanvasElement.prototype.toBlob
    Object.assign(window, { originalToBlob: original })
    HTMLCanvasElement.prototype.toBlob = function (callback, ...args) {
      original.call(this, blob => { Object.assign(window, { completeExport: () => callback(blob) }) }, ...args)
    }
  })
  await page.getByRole('button', { name: 'Download PNG', exact: true }).click()
  await page.waitForFunction(() => typeof (window as unknown as { completeExport?: unknown }).completeExport === 'function')
  await expect(page.getByRole('button', { name: 'Exporting…', exact: true })).toBeDisabled()
  await page.getByRole('button', { name: 'Remove image: second.png', exact: true }).click()
  await page.getByRole('alertdialog', { name: 'Remove image?', exact: true }).getByRole('button', { name: 'Delete', exact: true }).click()
  await expect(page.getByRole('alertdialog')).toHaveCount(0)
  await expect(page.getByRole('listitem')).toHaveCount(1)
  await page.getByRole('button', { name: 'Remove image: first.png', exact: true }).click()
  await page.getByRole('alertdialog', { name: 'Remove image?', exact: true }).getByRole('button', { name: 'Delete', exact: true }).click()
  await expect(page.getByRole('listitem')).toHaveCount(0)
  const waiting = page.waitForEvent('download')
  await page.evaluate(() => (window as unknown as { completeExport: () => void }).completeExport())
  const download = await waiting
  expect(await decode(page, await readFile((await download.path())!))).toEqual(expected)
  await page.evaluate(() => { HTMLCanvasElement.prototype.toBlob = (window as unknown as { originalToBlob: typeof HTMLCanvasElement.prototype.toBlob }).originalToBlob })
  await upload(page)
  await page.evaluate(() => { HTMLCanvasElement.prototype.toBlob = callback => { callback(null) } })
  await page.getByRole('button', { name: 'Download PNG', exact: true }).click()
  await expect(page.getByRole('alert')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Download PNG', exact: true })).toBeEnabled()
  await page.evaluate(() => { HTMLCanvasElement.prototype.toBlob = (window as unknown as { originalToBlob: typeof HTMLCanvasElement.prototype.toBlob }).originalToBlob })
  expect(await downloadPNG(page)).toEqual(expected)
})
