import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'

test('real receipt scans download at full resolution through PNG and JPEG controls', async ({ page }) => {
  await page.goto('/')
  await page.locator('input[type=file]').setInputFiles([
    'src/features/editor/assets/receipt-top.png',
    'src/features/editor/assets/receipt-bottom.png',
  ])
  await expect(page.getByLabel('Output dimensions')).toHaveText('Output: 672 × 6657 px')
  const offset = page.getByRole('spinbutton', { name: 'Y offset: receipt-bottom.png', exact: true })
  await offset.fill('-200')
  await offset.press('Tab')
  await expect(page.getByLabel('Output dimensions')).toHaveText('Output: 672 × 6457 px')
  await page.getByRole('button', { name: 'Fit', exact: true }).click()
  await expect.poll(() => page.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>('canvas[aria-label="Stitched image preview"]')!
    const toolbar = document.querySelector<HTMLElement>('nav[aria-label="Preview controls"]')!
    const transform = canvas.getContext('2d')!.getTransform()
    const bottom = canvas.getBoundingClientRect().top + (transform.d * 6457 + transform.f) / devicePixelRatio
    return bottom <= toolbar.getBoundingClientRect().top - 16
  })).toBe(true)
  await page.screenshot({ path: test.info().outputPath('receipt-preview.png') })
  for (const format of ['PNG', 'JPEG']) {
    await page.getByRole('button', { name: 'Choose download format', exact: true }).click()
    await page.getByRole('menuitem', { name: format, exact: true }).click()
    const waiting = page.waitForEvent('download')
    await page.getByRole('button', { name: `Download ${format}`, exact: true }).click()
    const download = await waiting
    expect(download.suggestedFilename()).toBe(`paper-stitch.${format === 'PNG' ? 'png' : 'jpg'}`)
    const bytes = await readFile((await download.path())!)
    expect(Array.from(bytes.subarray(0, 3))).toEqual(format === 'PNG' ? [137, 80, 78] : [255, 216, 255])
    const size = await page.evaluate(async data => {
      const image = await createImageBitmap(new Blob([new Uint8Array(data)]))
      const size = { width: image.width, height: image.height }
      image.close()
      return size
    }, Array.from(bytes))
    expect(size).toEqual({ width: 672, height: 6457 })
  }
})
