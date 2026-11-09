import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'

test('header, favicon, and README share the Paper Stitch SVG', async ({ page }) => {
  await page.goto('/')
  const logo = page.getByRole('img', { name: 'Paper Stitch icon', exact: true })
  await expect(logo).toBeVisible()
  const favicon = await page.locator('link[rel="icon"]').getAttribute('href')
  expect(favicon).toBe('/paper-stitch.svg')
  await expect(logo).toHaveAttribute('src', favicon!)
  expect(await logo.evaluate((image: HTMLImageElement) => ({ loaded: image.complete && image.naturalWidth > 0, width: image.width, height: image.height }))).toEqual({ loaded: true, width: 40, height: 40 })
  const response = await page.evaluate(async url => {
    const response = await fetch(url)
    return { ok: response.ok, type: response.headers.get('content-type') }
  }, favicon!)
  expect(response.ok).toBe(true)
  expect(response.type).toContain('image/svg+xml')
  expect(await readFile('README.md', 'utf8')).toContain('src="public/paper-stitch.svg"')
  await page.setViewportSize({ width: 375, height: 812 })
  await expect(logo).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
