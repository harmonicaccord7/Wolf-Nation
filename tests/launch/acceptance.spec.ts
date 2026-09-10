import { test, expect } from '@playwright/test'

const canonicalOrigin = 'https://www.kaporalintelligence.com'
const routes = ['/', '/bitcoin', '/macro', '/contact', '/auth', '/search', '/data/btc_etf_flow']

for (const route of routes) {
  test(`${route} renders within the viewport`, async ({ page }, testInfo) => {
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    const response = await page.goto(route)
    expect(response?.status()).toBe(200)
    await expect(page.locator('h1')).toBeVisible()
    await expect(page.locator('h1')).not.toHaveText('')
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1)
    if (route !== '/auth') {
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${canonicalOrigin}${route === '/' ? '/' : route}`)
    }
    if (route === '/contact') {
      await expect(page.getByRole('textbox', { name: 'Name', exact: true })).toBeEditable()
      await expect(page.getByRole('textbox', { name: 'Message', exact: true })).toBeEditable()
      expect(await page.locator('.contactForm').evaluate((form: HTMLFormElement) => form.checkValidity())).toBe(false)
    }
    expect(errors).toEqual([])
    await testInfo.attach('page-layout', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' })
  })
}

test('ETF values and issuer provenance reach the rendered page', async ({ page }, testInfo) => {
  await page.goto('/bitcoin')
  const panel = page.locator('.etfFlowPanel')
  await expect(panel.getByRole('heading')).toHaveText('U.S. spot Bitcoin ETF flow, reconstructed from issuer data.')
  const values = panel.locator('.etfFlowKpis strong')
  await expect(values).toHaveCount(3)
  for (const value of await values.all()) {
    await expect(value).toContainText(/\d/)
    await expect(value).not.toHaveText('—')
  }
  await expect(panel).not.toContainText('No verified observation yet')
  await panel.locator('summary').click()
  await expect(panel.locator('.etfFlowDisclosure li a').first()).toBeVisible()
  expect(await panel.locator('.etfFlowDisclosure li a').count()).toBeGreaterThanOrEqual(3)
  await testInfo.attach('etf-panel', { body: await panel.screenshot(), contentType: 'image/png' })
})

test('phone navigation opens, closes, navigates, and survives rotation', async ({ page, isMobile }, testInfo) => {
  test.skip(!isMobile, 'Phone navigation is hidden on desktop')
  await page.goto('/')
  const menu = page.getByRole('button', { name: 'Open navigation', exact: true })
  const bounds = await menu.boundingBox()
  expect(bounds?.height).toBeGreaterThanOrEqual(44)
  expect(bounds?.width).toBeGreaterThanOrEqual(44)
  await menu.click()
  await expect(menu).toHaveAttribute('aria-expanded', 'true')
  await expect(page.getByRole('navigation', { name: 'Primary mobile navigation' })).toBeVisible()
  await testInfo.attach('phone-menu', { body: await page.screenshot(), contentType: 'image/png' })
  await page.keyboard.press('Escape')
  await expect(menu).toHaveAttribute('aria-expanded', 'false')
  await menu.click()
  await page.getByRole('navigation', { name: 'Primary mobile navigation' }).getByRole('link', { name: 'Bitcoin', exact: false }).click()
  await expect(page).toHaveURL(/\/bitcoin$/)
  await expect(menu).toHaveAttribute('aria-expanded', 'false')
  await page.setViewportSize({ width: 844, height: 390 })
  await menu.click()
  await page.getByRole('button', { name: 'Close navigation', exact: true }).click()
  await expect(menu).toHaveAttribute('aria-expanded', 'false')
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1)
})

test('confirmation distinguishes a service failure from an invalid link', async ({ page }) => {
  // Synthetic UI contract test only. Live consent acceptance is recorded separately.
  await page.route('**/api/newsletter/confirm', route => route.fulfill({
    status: 500, contentType: 'application/json', body: JSON.stringify({ ok: false, error: 'newsletter_operation_failed' }),
  }))
  await page.goto(`/newsletter/confirm?token=${'0'.repeat(64)}`)
  await page.getByRole('button', { name: 'Confirm Market Letter' }).click()
  await expect(page.getByRole('status')).toContainText('Please try this button again')
  await expect(page.getByRole('status')).not.toContainText('invalid or expired')
})
