import { test, expect } from '@playwright/test'

test('event search opens an official FOMC decision with scenarios and a real chart', async ({ page }, info) => {
  await page.goto('/events')
  await page.getByRole('searchbox', { name: 'Find a market event' }).fill('FOMC')
  await page.getByLabel('Release type').selectOption('fomc')
  const cards = page.locator('.eventGrid .eventCard')
  await expect(cards.first()).toBeVisible()
  for (const card of await cards.all()) await expect(card).toContainText('FOMC')
  await cards.first().click()
  await expect(page.locator('.eventTiming')).toContainText('Final meeting day')
  await expect(page.locator('.eventTiming a')).toHaveAttribute('href', 'https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm')
  await expect(page.locator('.scenarioGrid')).toContainText('More restrictive than expected')
  await expect(page.locator('.decisionTable')).toContainText('Stay uninvested')
  await expect(page.locator('.historyChart')).toBeVisible()
  await expect(page.locator('.chartReadout')).toContainText('USD')
  await expect(page.getByRole('link', { name: 'Gold futures chart →' })).toHaveAttribute('href', '/data/gold')
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1)
  await info.attach('event-scenarios-and-chart', { body: await page.screenshot({ fullPage: true, scale: 'css' }), contentType: 'image/png' })
})

test('Bitcoin chart changes range, supports keyboard inspection, saves only after sign-in and survives landscape', async ({ page, isMobile }, info) => {
  await page.goto('/data/btc')
  await page.getByRole('button', { name: '30D', exact: true }).click()
  await expect(page.getByRole('button', { name: '30D', exact: true })).toHaveAttribute('aria-pressed', 'true')
  const slider = page.getByRole('slider', { name: 'Inspect BTC price observation' })
  await slider.focus(); await slider.press('Home')
  await expect(slider).toHaveValue('0')
  await expect(page.locator('.chartReadout')).toContainText('USD')
  await page.getByRole('button', { name: 'Save to watchlist', exact: true }).click()
  await expect(page.getByRole('link', { name: 'Sign in to save', exact: true })).toHaveAttribute('href', '/auth')
  await page.locator('.historyTable summary').click()
  await expect(page.locator('.historyTable tbody tr').first()).toBeVisible()
  if (isMobile) await page.setViewportSize({ width: 844, height: 390 })
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1)
  await info.attach('bitcoin-chart-interaction', { body: await page.locator('.historyChartBlock').screenshot({ scale: 'css' }), contentType: 'image/png' })
})

test('private workspace endpoints reject unsigned mutations', async ({ request }) => {
  for (const path of ['/api/account/preferences','/api/studio/events/sync','/api/studio/models/run','/api/studio/newsletter/issue','/api/studio/newsletter/queue','/api/studio/newsletter/deliver']) {
    const response = await request.post(path, { data: { status: 'published', confirmDelivery: true } })
    expect(response.status(), path).toBe(401)
    expect(response.headers()['cache-control'], path).toContain('no-store')
  }
})

test('public newsletter archive is indexable while consent pages remain private', async ({ page }) => {
  await page.goto('/newsletter')
  const robots = await page.locator('meta[name="robots"]').getAttribute('content').catch(() => null)
  expect(robots ?? '').not.toContain('noindex')
  await page.goto('/newsletter/confirm')
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)
})
