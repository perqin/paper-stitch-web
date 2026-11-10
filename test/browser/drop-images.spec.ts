import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import { writeFile } from 'node:fs/promises'

async function files(page: Page, entries = [{ name: 'drop.png', type: 'image/png', content: '' }]) {
  return page.evaluateHandle(entries => {
    const transfer = new DataTransfer()
    for (const entry of entries) {
      const canvas = document.createElement('canvas'); canvas.width = 8; canvas.height = 6
      const bytes = entry.content ? new TextEncoder().encode(entry.content)
        : Uint8Array.from(atob(canvas.toDataURL(entry.type || 'image/png').split(',')[1]), value => value.charCodeAt(0))
      transfer.items.add(new File([bytes], entry.name, { type: entry.type }))
    }
    return transfer
  }, entries)
}

test('dropping images on the header shows a full-page overlay and imports in order', async ({ page }) => {
  await page.goto('/')
  const dataTransfer = await page.evaluateHandle(() => {
    const transfer = new DataTransfer()
    for (const [name, width, height] of [['first.png', 8, 6], ['second.png', 4, 4]] as const) {
      const canvas = document.createElement('canvas')
      canvas.width = width; canvas.height = height
      const bytes = Uint8Array.from(atob(canvas.toDataURL().split(',')[1]), value => value.charCodeAt(0))
      transfer.items.add(new File([bytes], name, { type: 'image/png' }))
    }
    return transfer
  })
  await page.locator('h1').dispatchEvent('dragenter', { dataTransfer })
  const overlay = page.getByRole('status')
  await expect(overlay).toHaveText('Drop images here to add them')
  await expect(overlay).toBeVisible()
  await page.screenshot({ path: test.info().outputPath('drop-overlay.png') })
  const box = (await overlay.boundingBox())!
  expect(box).toEqual({ x: 0, y: 0, ...page.viewportSize()! })
  await page.locator('h1').dispatchEvent('dragover', { dataTransfer })
  await page.locator('h1').dispatchEvent('drop', { dataTransfer })
  await expect(overlay).toHaveCount(0)
  await expect(page.getByRole('listitem')).toHaveCount(2)
  await expect(page.getByRole('listitem').nth(0)).toContainText('first.png')
  await expect(page.getByRole('listitem').nth(1)).toContainText('second.png')
  await expect(page.getByLabel('Output dimensions')).toHaveText('Output: 8 × 10 px')
  await dataTransfer.dispose()
})

test('nested transitions keep the overlay stable; exit and cancellation clear it', async ({ page }) => {
  await page.goto('/')
  const dataTransfer = await files(page)
  const heading = page.locator('h1'), main = page.locator('main'), overlay = page.getByRole('status')
  await main.dispatchEvent('dragenter', { dataTransfer })
  await heading.dispatchEvent('dragenter', { dataTransfer })
  await main.dispatchEvent('dragleave', { dataTransfer })
  await expect(overlay).toBeVisible()
  await heading.dispatchEvent('dragleave', { dataTransfer })
  await expect(overlay).toHaveCount(0)
  for (const cancellation of ['dragend', 'blur', 'Escape']) {
    // Browsers can deliver dragover without a matching page-level dragenter.
    await heading.dispatchEvent('dragover', { dataTransfer })
    await expect(overlay).toBeVisible()
    if (cancellation === 'Escape') await page.keyboard.press('Escape')
    else await page.evaluate(type => window.dispatchEvent(new Event(type)), cancellation)
    await expect(overlay).toHaveCount(0)
  }
  await heading.dispatchEvent('dragover', { dataTransfer })
  await heading.dispatchEvent('dragleave', { dataTransfer })
  await expect(overlay).toHaveCount(0)
  await expect(page.getByRole('listitem')).toHaveCount(0)
})

test('text and URL drags retain native behavior and never trigger file import', async ({ page }) => {
  await page.goto('/')
  const results = await page.evaluate(() => ['text/plain', 'text/uri-list'].map(type => {
    const transfer = new DataTransfer(); transfer.setData(type, 'https://example.com/image.png')
    return ['dragenter', 'dragover', 'drop'].map(name => document.querySelector('h1')!.dispatchEvent(
      new DragEvent(name, { dataTransfer: transfer, bubbles: true, cancelable: true }),
    ))
  }))
  expect(results).toEqual([[true, true, true], [true, true, true]])
  await expect(page.getByRole('status')).toHaveCount(0)
  await expect(page.getByRole('listitem')).toHaveCount(0)
})

test('drops over a portaled dialog append images without changing existing edits', async ({ page }) => {
  const uploads: string[] = []
  page.on('request', request => { if (request.method() !== 'GET') uploads.push(request.url()) })
  await page.goto('/')
  const transfer = await files(page)
  await page.locator('main').dispatchEvent('drop', { dataTransfer: transfer })
  await expect(page.getByRole('listitem')).toHaveCount(1)
  const crop = page.getByRole('spinbutton', { name: 'Top crop: drop.png', exact: true })
  await crop.fill('1')
  await page.getByRole('button', { name: 'Help', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.dispatchEvent('dragenter', { dataTransfer: transfer })
  await expect(page.getByRole('status')).toBeVisible()
  expect(await page.getByRole('status').evaluate(element => getComputedStyle(element).pointerEvents)).toBe('none')
  const aboveDialog = await page.getByRole('status').evaluate(element =>
    Number(getComputedStyle(element).zIndex) > Number(getComputedStyle(document.querySelector('.MuiModal-root')!).zIndex))
  expect(aboveDialog).toBe(true)
  await dialog.dispatchEvent('drop', { dataTransfer: transfer })
  await expect(dialog).toBeVisible()
  await expect(page.getByRole('status')).toHaveCount(0)
  await page.keyboard.press('Escape')
  await expect(page.getByRole('listitem')).toHaveCount(2)
  await expect(page.getByRole('spinbutton', { name: 'Top crop: drop.png', exact: true }).first()).toHaveValue('1')
  expect(uploads).toEqual([])
})

test('mixed drops retain valid images and report individual decode failures', async ({ page }) => {
  await page.goto('/')
  const transfer = await files(page, [
    { name: 'valid.png', type: 'image/png', content: '' },
    { name: 'notes.txt', type: 'text/plain', content: 'not an image' },
    { name: 'unknown.bin', type: '', content: '' },
    { name: 'broken.png', type: 'image/png', content: 'broken image' },
    { name: 'valid.jpg', type: 'image/jpeg', content: '' },
  ])
  await page.locator('body').dispatchEvent('drop', { dataTransfer: transfer })
  await expect(page.getByRole('listitem')).toHaveCount(3)
  const names = await page.getByRole('listitem').locator('img').evaluateAll(images => images.map(image => image.getAttribute('alt')))
  expect(names).toEqual(['Thumbnail of valid.png', 'Thumbnail of unknown.bin', 'Thumbnail of valid.jpg'])
  await expect(page.getByRole('alert')).toContainText('notes.txt: This file could not be decoded')
  await expect(page.getByRole('alert')).toContainText('broken.png: This file could not be decoded')
  await expect(page.getByRole('status')).toHaveCount(0)
})

test('queued drops keep Add disabled until every batch finishes', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => {
    const decode = HTMLImageElement.prototype.decode
    const gates: (() => void)[] = []
    Object.assign(window, { releaseImport: () => gates.shift()?.() })
    HTMLImageElement.prototype.decode = async function () {
      await new Promise<void>(resolve => gates.push(resolve))
      return decode.call(this)
    }
  })
  const first = await files(page, [{ name: 'first.png', type: 'image/png', content: '' }])
  const second = await files(page, [{ name: 'second.png', type: 'image/png', content: '' }])
  await page.locator('h1').dispatchEvent('drop', { dataTransfer: first })
  await page.locator('main').dispatchEvent('drop', { dataTransfer: second })
  const release = () => page.evaluate(() => (window as typeof window & { releaseImport: () => void }).releaseImport())
  await expect(page.getByRole('button', { name: 'Importing…', exact: true })).toBeDisabled()
  await release()
  await expect(page.getByRole('listitem')).toHaveCount(1)
  await expect(page.getByRole('button', { name: 'Importing…', exact: true })).toBeDisabled()
  await release()
  await expect(page.getByRole('listitem')).toHaveCount(2)
  await expect(page.getByRole('button', { name: 'Add images', exact: true })).toBeEnabled()
  await expect(page.getByRole('listitem').first()).toContainText('first.png')
  await expect(page.getByRole('listitem').last()).toContainText('second.png')
})

for (const secondFails of [false, true]) {
  test(`queued import diagnostics survive ${secondFails ? 'multiple failures' : 'failure then success'} until a new idle import`, async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => {
      const decode = HTMLImageElement.prototype.decode
      const gates: (() => void)[] = []
      Object.assign(window, {
        pendingDecodes: () => gates.length,
        releaseImport: () => gates.shift()?.(),
      })
      HTMLImageElement.prototype.decode = async function () {
        await new Promise<void>(resolve => gates.push(resolve))
        return decode.call(this)
      }
    })
    const release = async () => {
      await expect.poll(() => page.evaluate(() =>
        (window as typeof window & { pendingDecodes: () => number }).pendingDecodes())).toBe(1)
      await page.evaluate(() => (window as typeof window & { releaseImport: () => void }).releaseImport())
    }
    const first = await files(page, [{ name: 'first-broken.png', type: 'image/png', content: 'broken image' }])
    const second = await files(page, [{ name: 'second.png', type: 'image/png', content: secondFails ? 'also broken' : '' }])
    const third = await files(page, [{ name: 'third.png', type: 'image/png', content: '' }])
    await page.locator('h1').dispatchEvent('drop', { dataTransfer: first })
    await page.locator('h1').dispatchEvent('drop', { dataTransfer: second })
    await release()
    const alert = page.getByRole('alert')
    await expect(alert).toContainText('first-broken.png: This file could not be decoded')
    // A further drop while the second batch is blocked belongs to the same session.
    await page.locator('h1').dispatchEvent('drop', { dataTransfer: third })
    await expect(alert).toContainText('first-broken.png: This file could not be decoded')
    await release()
    if (secondFails) {
      await expect(alert).toContainText('second.png: This file could not be decoded')
    } else {
      await expect(page.getByRole('listitem')).toHaveCount(1)
    }
    await expect(alert).toContainText('first-broken.png: This file could not be decoded')
    await expect(page.getByRole('button', { name: 'Importing…', exact: true })).toBeDisabled()
    await release()
    await expect(page.getByRole('button', { name: 'Add images', exact: true })).toBeEnabled()
    await expect(page.getByRole('listitem')).toHaveCount(secondFails ? 1 : 2)
    await expect(alert).toContainText('first-broken.png: This file could not be decoded')
    if (secondFails) await expect(alert).toContainText('second.png: This file could not be decoded')

    // The picker starts a fresh idle session and clears the old diagnostics immediately.
    await page.getByLabel('Import images', { exact: true }).setInputFiles({
      name: 'later.png', mimeType: 'image/png',
      buffer: Buffer.from(await page.evaluate(() => document.createElement('canvas').toDataURL().split(',')[1]), 'base64'),
    })
    await expect(page.getByRole('button', { name: 'Importing…', exact: true })).toBeDisabled()
    await expect(alert).toHaveCount(0)
    await release()
    await expect(page.getByRole('button', { name: 'Add images', exact: true })).toBeEnabled()
    await expect(page.getByRole('listitem')).toHaveCount(secondFails ? 2 : 3)
    await expect(alert).toHaveCount(0)
    await first.dispose(); await second.dispose(); await third.dispose()
  })
}

test('native Chromium file drag imports while hovering file data is protected', async ({ page, context }) => {
  await page.goto('/')
  const image = await page.evaluate(() => {
    const canvas = document.createElement('canvas'); canvas.width = 8; canvas.height = 6
    document.addEventListener('dragover', event => Object.assign(window, {
      hoveringFiles: event.dataTransfer!.files.length,
      trustedDrag: event.isTrusted,
    }))
    return canvas.toDataURL().split(',')[1]
  })
  const path = test.info().outputPath('native-drop.png')
  await writeFile(path, Buffer.from(image, 'base64'))
  const session = await context.newCDPSession(page)
  const data = { items: [], files: [path], dragOperationsMask: 1 }
  await session.send('Input.dispatchDragEvent', { type: 'dragEnter', x: 50, y: 50, data })
  await session.send('Input.dispatchDragEvent', { type: 'dragOver', x: 50, y: 50, data })
  await expect(page.getByRole('status')).toBeVisible()
  expect(await page.evaluate(() => {
    const state = window as typeof window & { hoveringFiles: number; trustedDrag: boolean }
    return { files: state.hoveringFiles, trusted: state.trustedDrag }
  })).toEqual({ files: 0, trusted: true })
  await session.send('Input.dispatchDragEvent', { type: 'drop', x: 50, y: 50, data })
  await expect(page.getByRole('listitem')).toHaveCount(1)
  await expect(page.getByRole('status')).toHaveCount(0)
  await expect(page.getByLabel('Output dimensions')).toHaveText('Output: 8 × 6 px')
  await session.detach()
})

test('Chinese empty hint and translucent overlay fit a narrow dark viewport', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 900 })
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.goto('/')
  await page.getByRole('button', { name: 'Language', exact: true }).click()
  await page.getByRole('menuitem', { name: '中文', exact: true }).click()
  await expect(page.getByText('点击按钮或拖拽图片到网页添加。', { exact: true })).toBeVisible()
  const transfer = await files(page)
  await page.locator('h1').dispatchEvent('dragenter', { dataTransfer: transfer })
  const overlay = page.getByRole('status')
  await expect(overlay).toHaveText('拖拽到此处添加图片')
  expect(await overlay.boundingBox()).toEqual({ x: 0, y: 0, width: 375, height: 900 })
  const alpha = await overlay.evaluate(element => Number(getComputedStyle(element).backgroundColor.match(/[\d.]+/g)!.at(-1)))
  expect(alpha).toBeGreaterThan(0); expect(alpha).toBeLessThan(1)
  await page.screenshot({ path: test.info().outputPath('drop-overlay-zh-dark.png') })
  await page.locator('h1').dispatchEvent('drop', { dataTransfer: transfer })
  await expect(page.getByRole('listitem')).toHaveCount(1)
})
