import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

async function upload(page: Page) {
  await page.goto('/')
  const image = await page.evaluate(() => {
    const canvas = document.createElement('canvas'); canvas.width = 8; canvas.height = 6
    return canvas.toDataURL().split(',')[1]
  })
  await page.locator('input[type=file]').setInputFiles(['first.png', 'second.png'].map(name => ({ name, mimeType: 'image/png', buffer: Buffer.from(image, 'base64') })))
  await expect(page.getByRole('listitem')).toHaveCount(2)
}

const field = (page: Page, label: string) => page.getByRole('spinbutton', { name: `${label}: second.png`, exact: true, includeHidden: true })

test('Reset requires confirmation; cancel and Escape preserve committed edits and invalid drafts', async ({ page }) => {
  await upload(page)
  await field(page, 'X offset').fill('5')
  await field(page, 'Top crop').fill('1')
  await page.getByRole('button', { name: 'Rotate 90°: second.png', exact: true }).click()
  await field(page, 'Top crop').fill('6')
  const dialog = page.getByRole('alertdialog', { name: 'Reset positioning?', exact: true })
  for (const dismiss of ['cancel', 'escape']) {
    await page.getByRole('button', { name: 'Reset', exact: true }).click()
    await expect(dialog).toHaveText(/This will clear all offsets, crops, and rotations\./)
    await expect(field(page, 'X offset')).toHaveValue('5')
    await expect(dialog.getByRole('button', { name: 'Cancel', exact: true })).toBeFocused()
    if (dismiss === 'cancel') await dialog.getByRole('button', { name: 'Cancel', exact: true }).click()
    else await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
    await expect(field(page, 'Top crop')).toHaveValue('6')
    await expect(page.getByLabel('Rotation: second.png', { exact: true })).toHaveText('Rotation 90°')
  }
  await page.getByRole('button', { name: 'Reset', exact: true }).click()
  await dialog.getByRole('button', { name: 'Confirm', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  for (const label of ['X offset', 'Y offset', 'Top crop', 'Bottom crop', 'Left crop', 'Right crop']) await expect(field(page, label)).toHaveValue('0')
  await expect(page.getByLabel('Rotation: second.png', { exact: true })).toHaveText('Rotation 0°')
  await expect(page.getByRole('button', { name: 'Vertical', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('listitem')).toHaveCount(2)
})

test('mode changes wait for confirmation and selecting the active mode remains a no-op', async ({ page }) => {
  await upload(page)
  await field(page, 'Y offset').fill('-2')
  await page.getByRole('button', { name: 'Vertical', exact: true }).click()
  await expect(page.getByRole('alertdialog')).toHaveCount(0)
  await expect(field(page, 'Y offset')).toHaveValue('-2')
  await page.getByRole('button', { name: 'Horizontal', exact: true }).click()
  const dialog = page.getByRole('alertdialog', { name: 'Change stitch mode?', exact: true })
  await expect(dialog).toContainText('This will clear all offsets, crops, and rotations.')
  await expect(field(page, 'Y offset')).toHaveValue('-2')
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Vertical', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'Horizontal', exact: true }).click()
  await dialog.getByRole('button', { name: 'Confirm', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Horizontal', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(field(page, 'Y offset')).toHaveValue('0')
})

test('red trash action confirms the selected image before removal and cancellation keeps its edits', async ({ page }) => {
  await upload(page)
  await field(page, 'X offset').fill('5')
  const remove = page.getByRole('button', { name: 'Remove image: second.png', exact: true })
  const color = await remove.evaluate(button => getComputedStyle(button).color.match(/\d+/g)!.map(Number))
  expect(color[0]).toBeGreaterThan(color[1]); expect(color[0]).toBeGreaterThan(color[2])
  await remove.click()
  const dialog = page.getByRole('alertdialog', { name: 'Remove image?', exact: true })
  await expect(dialog).toContainText('Remove second.png from this document?')
  await expect(page.getByRole('listitem', { includeHidden: true })).toHaveCount(2)
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(field(page, 'X offset')).toHaveValue('5')
  await remove.click()
  await dialog.getByRole('button', { name: 'Delete', exact: true }).click()
  await expect(page.getByRole('listitem')).toHaveCount(1)
  await expect(page.getByRole('listitem')).toHaveAccessibleName('first.png')
})
