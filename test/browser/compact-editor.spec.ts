import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

async function upload(page: Page) {
  await page.goto('/')
  const data = await page.evaluate(() => {
    const canvas = document.createElement('canvas'); canvas.width = 8; canvas.height = 6
    return canvas.toDataURL().split(',')[1]
  })
  await page.locator('input[type=file]').setInputFiles(['first.png', 'second.png'].map(name => ({ name, mimeType: 'image/png', buffer: Buffer.from(data, 'base64') })))
  await expect(page.getByRole('listitem')).toHaveCount(2)
}

for (const width of [1280, 375]) test(`compact image forms align to four equal columns at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 })
  await upload(page)
  await expect(page.getByRole('spinbutton', { name: 'X offset: first.png', exact: true })).toHaveCount(0)
  await expect(page.getByRole('spinbutton', { name: 'Y offset: first.png', exact: true })).toHaveCount(0)
  await expect(page.getByRole('combobox')).toHaveCount(0)
  await expect(page.locator('.MuiInputAdornment-root')).toHaveCount(0)
  const rect = (label: string, name: string) => page.getByRole('spinbutton', { name: `${label}: ${name}`, exact: true }).evaluate(input => {
    const r = input.closest('.MuiFormControl-root')!.getBoundingClientRect()
    return { x: r.x, y: r.y, width: r.width, height: r.height }
  })
  const x = await rect('X offset', 'second.png'), y = await rect('Y offset', 'second.png')
  const top = await rect('Top crop', 'second.png'), bottom = await rect('Bottom crop', 'second.png')
  const left = await rect('Left crop', 'second.png'), right = await rect('Right crop', 'second.png')
  expect(x.x).toBeCloseTo(top.x, 4); expect(y.x).toBeCloseTo(bottom.x, 4)
  expect(x.width).toBeCloseTo(top.width, 4); expect(y.width).toBeCloseTo(bottom.width, 4)
  expect(x.y).toBe(y.y)
  expect(top.y).toBe(bottom.y); expect(top.y).toBe(left.y); expect(top.y).toBe(right.y)
  expect(top.y).toBeGreaterThan(x.y)
  expect(x.height).toBeLessThanOrEqual(40)
  const rotation = (await page.getByRole('group', { name: 'Rotation controls: second.png', exact: true }).boundingBox())!
  expect(rotation.x).toBeCloseTo(left.x, 4)
  expect(rotation.y).toBeCloseTo(x.y, 4)
  expect(rotation.width).toBeCloseTo(right.x + right.width - left.x, 4)
  const firstLeft = await rect('Left crop', 'first.png')
  const firstRotation = (await page.getByRole('group', { name: 'Rotation controls: first.png', exact: true }).boundingBox())!
  expect(firstRotation.x).toBeCloseTo(firstLeft.x, 4)
  const capacity = await page.getByRole('spinbutton', { name: 'X offset: second.png', exact: true }).evaluate(input => {
    const style = getComputedStyle(input)
    const context = document.createElement('canvas').getContext('2d')!
    context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
    // Chromium's number-input clientWidth already excludes its native spinner.
    return { available: input.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight), needed: context.measureText('-1234').width }
  })
  expect(capacity.available).toBeGreaterThanOrEqual(capacity.needed)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.getByLabel('Stitch controls', { exact: true }).screenshot({ path: test.info().outputPath('compact-editor.png') })
})

test('quarter-turn button cycles angles and reordering hides only the new first offsets', async ({ page }) => {
  await upload(page)
  const button = page.getByRole('button', { name: 'Rotate 90°: first.png', exact: true })
  for (const angle of [90, 180, 270, 0]) {
    await button.click()
    await expect(page.getByLabel('Rotation: first.png', { exact: true })).toHaveText(`Rotation ${angle}°`)
    await expect(page.getByLabel('Output dimensions')).toHaveText(`Output: 8 × ${angle === 90 || angle === 270 ? 14 : 12} px`)
  }
  const offset = page.getByRole('spinbutton', { name: 'X offset: second.png', exact: true })
  await offset.fill('-1234')
  await page.getByRole('button', { name: 'Move up: second.png', exact: true }).click()
  await expect(offset).toHaveCount(0)
  await expect(page.getByRole('spinbutton', { name: 'X offset: first.png', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Move down: second.png', exact: true }).click()
  await expect(offset).toHaveValue('-1234')
})
