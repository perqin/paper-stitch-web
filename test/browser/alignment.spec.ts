import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'

async function upload(page: Page, colors = ['#ff0000', '#0000ff']) {
  await page.goto('/')
  const data = await page.evaluate(colors => colors.map(color => {
    const canvas = document.createElement('canvas'); canvas.width = 100; canvas.height = 100
    const context = canvas.getContext('2d')!; context.fillStyle = color; context.fillRect(0, 0, 100, 100)
    return canvas.toDataURL().split(',')[1]
  }), colors)
  await page.locator('input[type=file]').setInputFiles(data.map((image, index) => ({ name: `${index}.png`, mimeType: 'image/png', buffer: Buffer.from(image, 'base64') })))
  await expect(page.getByRole('listitem')).toHaveCount(colors.length)
}

async function pixel(page: Page, x = 25, y = 75) {
  return page.getByLabel('Stitched image preview', { exact: true }).evaluate((canvas: HTMLCanvasElement, point) => {
    const context = canvas.getContext('2d')!, transform = context.getTransform()
    return Array.from(context.getImageData(Math.floor(transform.a * point.x + transform.c * point.y + transform.e), Math.floor(transform.b * point.x + transform.d * point.y + transform.f), 1, 1).data)
  }, { x, y })
}

async function png(page: Page) {
  const waiting = page.waitForEvent('download')
  // Programmatic activation leaves the numeric input focused throughout encoding.
  await page.getByRole('button', { name: 'Download PNG', exact: true }).evaluate((button: HTMLButtonElement) => button.click())
  return readFile((await (await waiting).path())!)
}

test('only a focused non-first overlapping image fades; blur restores opacity and PNG stays exact', async ({ page }) => {
  await upload(page)
  const offset = page.getByRole('spinbutton', { name: 'Y offset: 1.png', exact: true })
  await offset.fill('-50')
  const overlapSwitch = page.getByRole('switch', { name: 'Translucent overlaps', exact: true })
  await expect(overlapSwitch).toBeChecked()
  await expect(offset).toBeFocused()
  await expect.poll(() => pixel(page)).toEqual([127, 0, 128, 255])
  await overlapSwitch.uncheck()
  await offset.focus()
  await expect.poll(() => pixel(page)).toEqual([0, 0, 255, 255])
  const original = await png(page)
  await expect(overlapSwitch).not.toBeChecked()
  await overlapSwitch.check()
  await expect.poll(() => pixel(page)).toEqual([0, 0, 255, 255])
  for (const label of ['X offset', 'Y offset', 'Top crop', 'Bottom crop', 'Left crop', 'Right crop']) {
    const field = page.getByRole('spinbutton', { name: `${label}: 1.png`, exact: true })
    await field.focus()
    await expect.poll(() => pixel(page)).toEqual([127, 0, 128, 255])
    await expect(field).toBeFocused()
  }
  await offset.focus()
  await offset.press('ArrowUp')
  await expect(offset).toHaveValue('-49')
  await expect.poll(() => pixel(page)).toEqual([127, 0, 128, 255])
  await offset.fill('-50')
  expect(await png(page)).toEqual(original)
  await expect(offset).toBeFocused()
  await expect.poll(() => pixel(page)).toEqual([127, 0, 128, 255])
  await page.getByRole('button', { name: 'Rotate 90°: 1.png', exact: true }).focus()
  await expect.poll(() => pixel(page)).toEqual([0, 0, 255, 255])
  await page.getByRole('spinbutton', { name: 'Top crop: 0.png', exact: true }).focus()
  await expect.poll(() => pixel(page, 25, 25)).toEqual([255, 0, 0, 255])
  await offset.focus()
  await expect.poll(() => pixel(page)).toEqual([127, 0, 128, 255])
  await overlapSwitch.evaluate((input: HTMLInputElement) => input.click())
  await expect(offset).toBeFocused()
  await expect.poll(() => pixel(page)).toEqual([0, 0, 255, 255])
})

test('live placement changes remove fading at edge contact and restore it only for overlap', async ({ page }) => {
  await upload(page)
  await page.getByRole('switch', { name: 'Translucent overlaps', exact: true }).check()
  const y = page.getByRole('spinbutton', { name: 'Y offset: 1.png', exact: true })
  const x = page.getByRole('spinbutton', { name: 'X offset: 1.png', exact: true })
  await y.fill('-50')
  await expect.poll(() => pixel(page)).toEqual([127, 0, 128, 255])
  await x.fill('100')
  await expect.poll(() => pixel(page, 125, 75)).toEqual([0, 0, 255, 255])
  await x.fill('0')
  await expect.poll(() => pixel(page)).toEqual([127, 0, 128, 255])
  await y.fill('0')
  await expect.poll(() => pixel(page, 25, 125)).toEqual([0, 0, 255, 255])
  await y.fill('-50')
  await expect.poll(() => pixel(page)).toEqual([127, 0, 128, 255])
  await page.getByRole('spinbutton', { name: 'Top crop: 1.png', exact: true }).fill('100')
  await expect(page.getByRole('spinbutton', { name: 'Top crop: 1.png', exact: true })).toHaveAttribute('aria-invalid', 'true')
  await expect.poll(() => pixel(page)).toEqual([127, 0, 128, 255])
  await page.getByRole('button', { name: 'Remove image: 1.png', exact: true }).evaluate((button: HTMLButtonElement) => button.click())
  await page.getByRole('alertdialog', { name: 'Remove image?', exact: true }).getByRole('button', { name: 'Delete', exact: true }).click()
  await expect(page.getByRole('listitem')).toHaveCount(1)
  await expect.poll(() => pixel(page)).toEqual([255, 0, 0, 255])
})

test('overlap with the next adjacent image also enables the focused image aid', async ({ page }) => {
  await upload(page, ['#ff0000', '#0000ff', '#00ff00'])
  await page.getByRole('spinbutton', { name: 'Y offset: 2.png', exact: true }).fill('-50')
  await page.getByRole('switch', { name: 'Translucent overlaps', exact: true }).check()
  await page.getByRole('spinbutton', { name: 'Y offset: 1.png', exact: true }).focus()
  await expect.poll(() => pixel(page, 25, 125)).toEqual([127, 127, 255, 255])
})
