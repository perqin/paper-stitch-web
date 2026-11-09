import { test, expect } from '@playwright/test'

test('browser locale and live system color scheme provide defaults; explicit choices survive reload', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, locale: 'zh-CN', colorScheme: 'dark' })
  try {
    const page = await context.newPage()
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    await page.goto('/')
    await expect(page.locator('html')).toHaveAttribute('lang', 'zh')
    await expect(page.getByRole('button', { name: '纵向', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: '切换至浅色模式', exact: true })).toBeVisible()
    await expect(page.locator('html')).toHaveClass(/dark/)
    await page.emulateMedia({ colorScheme: 'light' })
    await expect(page.getByRole('button', { name: '切换至深色模式', exact: true })).toBeVisible()
    await expect(page.locator('html')).toHaveClass(/light/)
    const github = page.getByRole('link', { name: '在 GitHub 查看项目', exact: true })
    await expect(github).toHaveAttribute('href', 'https://github.com/perqin/paper-stitch-web')
    await expect(github).toHaveAttribute('target', '_blank')
    await expect(github).toHaveAttribute('rel', /noopener/)
    await page.getByRole('button', { name: '语言', exact: true }).click()
    await page.getByRole('menuitem', { name: 'English', exact: true }).click()
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await page.getByRole('button', { name: 'Switch to dark mode', exact: true }).click()
    await expect(page.locator('html')).toHaveClass(/dark/)
    await page.emulateMedia({ colorScheme: 'light' })
    await expect(page.getByRole('button', { name: 'Switch to light mode', exact: true })).toBeVisible()
    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await expect(page.getByRole('button', { name: 'Vertical', exact: true })).toBeVisible()
    await expect(page.locator('html')).toHaveClass(/dark/)
    expect(errors).toEqual([])
  } finally { await context.close() }
})

test('unsupported browser locale falls back to English', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, locale: 'fr-FR' })
  try {
    const page = await context.newPage()
    await page.goto('/')
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await expect(page.getByRole('button', { name: 'Add images', exact: true })).toBeVisible()
  } finally { await context.close() }
})

test('switching language translates image fields, validation and errors without resetting edits', async ({ page }) => {
  await page.goto('/')
  const image = await page.evaluate(() => {
    const canvas = document.createElement('canvas'); canvas.width = 8; canvas.height = 6
    return canvas.toDataURL().split(',')[1]
  })
  await page.locator('input[type=file]').setInputFiles(['first.png', 'second.png'].map(name => ({ name, mimeType: 'image/png', buffer: Buffer.from(image, 'base64') })))
  await page.getByRole('spinbutton', { name: 'Y offset: second.png', exact: true }).fill('-3')
  await page.getByRole('spinbutton', { name: 'Top crop: second.png', exact: true }).fill('6')
  await expect(page.getByText('Crop must leave at least one pixel on each axis.', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Language', exact: true }).click()
  await page.getByRole('menuitem', { name: '中文', exact: true }).click()
  await expect(page.getByRole('spinbutton', { name: 'Y 偏移：second.png', exact: true })).toHaveValue('-3')
  await expect(page.getByRole('spinbutton', { name: '顶部裁剪：second.png', exact: true })).toHaveValue('6')
  await expect(page.getByText('裁剪后每个方向必须至少保留一个像素。', { exact: true })).toBeVisible()
  await expect(page.getByLabel('输出尺寸', { exact: true })).toHaveText('输出：8 × 9 像素')
  await expect(page.getByRole('button', { name: '下载 PNG', exact: true })).toBeVisible()
  await expect(page.getByLabel('拼接图预览', { exact: true })).toBeVisible()
  await page.locator('input[type=file]').setInputFiles({ name: 'broken.png', mimeType: 'image/png', buffer: Buffer.from('not an image') })
  await expect(page.getByRole('alert')).toContainText('broken.png：浏览器无法将此文件解码为支持的图片。')
})

for (const width of [1280, 375]) test(`general controls and rounded scrollable cards use the full sidebar width at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 })
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Freeform', exact: true })).toHaveCount(0)
  const general = page.getByRole('region', { name: 'General controls', exact: true })
  await expect(general.getByRole('button', { name: 'Reset', exact: true })).toBeDisabled()
  await expect(general.getByRole('switch', { name: 'Translucent overlaps', exact: true })).toBeChecked()
  const image = await page.evaluate(() => {
    const canvas = document.createElement('canvas'); canvas.width = 8; canvas.height = 6
    return canvas.toDataURL().split(',')[1]
  })
  await page.locator('input[type=file]').setInputFiles(Array.from({ length: 6 }, (_, index) => ({ name: `${index}.png`, mimeType: 'image/png', buffer: Buffer.from(image, 'base64') })))
  await expect(page.getByRole('listitem')).toHaveCount(6)
  await expect(general.getByRole('button', { name: 'Reset', exact: true })).toBeEnabled()
  const dimensions = await page.getByRole('region', { name: 'Imported images', exact: true }).evaluate(element => {
    const card = element.querySelector('li')!
    const rect = element.getBoundingClientRect(), cardRect = card.getBoundingClientRect()
    const style = getComputedStyle(element)
    return { width: rect.width, cardWidth: cardRect.width, gutter: style.scrollbarGutter, scrollbar: style.scrollbarWidth, radius: parseFloat(getComputedStyle(card).borderRadius), overflow: element.scrollHeight > element.clientHeight }
  })
  expect(dimensions.cardWidth).toBe(dimensions.width)
  expect(dimensions.gutter).toBe('auto')
  expect(dimensions.scrollbar).toBe('none')
  expect(dimensions.radius).toBeGreaterThan(0)
  expect(dimensions.overflow).toBe(true)
  await page.getByRole('region', { name: 'Imported images', exact: true }).evaluate(element => { element.scrollTop = element.scrollHeight })
  await expect(page.getByRole('button', { name: 'Remove image: 5.png', exact: true })).toBeVisible()
  const addImages = page.getByRole('region', { name: 'Imported images', exact: true }).getByRole('button', { name: 'Add images', exact: true })
  await addImages.scrollIntoViewIfNeeded()
  await expect(addImages).toBeInViewport()
  expect(await addImages.evaluate(button => {
    const list = button.closest('section')!.querySelector('ul')!
    return !button.closest('li') && Boolean(list.compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING)
  })).toBe(true)
  await expect.poll(() => page.getByRole('region', { name: 'Imported images', exact: true }).evaluate(element => element.scrollTop)).toBeGreaterThan(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.getByLabel('Stitch controls', { exact: true }).screenshot({ path: test.info().outputPath(`preferences-${width}.png`) })
})
