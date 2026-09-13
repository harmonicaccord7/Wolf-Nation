import { test, expect } from '@playwright/test'

for (const path of ['/news', '/learn/market-events', '/auth/forgot-password', '/auth/reset-password']) {
  test(`${path} remains readable on the device`, async ({ page }, testInfo) => {
    const response = await page.goto(path)
    expect(response?.status()).toBe(200)
    await expect(page.locator('h1')).toBeVisible()
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1)
    if (path === '/learn/market-events') {
      await expect(page.locator('.marketBackground')).toHaveCount(10)
      for (const key of ['cpi','pce','fomc','payrolls','ppi','gdp']) {
        const guide = page.locator('#' + key)
        await expect(guide).toContainText('Bitcoin & crypto:')
        await expect(guide).toContainText('Gold:')
        await expect(guide).toContainText('What this can mean for your pocket')
      }
    }
    if (path === '/auth/reset-password') {
      await expect(page.getByRole('status')).toContainText('valid reset link')
      await expect(page.locator('input[type="password"]')).toHaveCount(0)
    }
    await testInfo.attach('updated-page', { body: await page.screenshot({ scale: 'css' }), contentType: 'image/png' })
  })
}

test('newsletter subscribes with only an email and handles an existing address', async ({ page, isMobile }, testInfo) => {
  await page.goto('/')
  if (isMobile) {
    await page.getByRole('button', {name:'Open navigation',exact:true}).click()
    await page.getByRole('link', {name:'Newsletter — email only',exact:true}).click()
  } else await page.locator('.actions').getByRole('link', {name:'Newsletter',exact:true}).click()
  await expect(page).toHaveURL(/\/newsletter#newsletter-signup$/)
  const form = page.locator('#newsletter-signup').getByRole('form', {name:'Newsletter subscription'})
  await expect(page.locator('input[type="password"]')).toHaveCount(0)
  await expect(form.locator('input')).toHaveCount(1)
  let payload: unknown
  await page.route('**/api/newsletter/subscribe', async route => {
    payload=route.request().postDataJSON()
    await route.fulfill({json:{ok:true,status:'already_confirmed'}})
  })
  await form.getByRole('textbox',{name:'Email address',exact:true}).fill('Example@Example.com')
  await form.getByRole('button',{name:'Subscribe free',exact:true}).click()
  await expect(page.locator('#newsletter-signup').getByRole('status')).toContainText('already subscribed')
  expect(payload).toEqual({email:'example@example.com',resend:false})
  await expect(page).toHaveURL(/\/newsletter#newsletter-signup$/)
  await testInfo.attach('email-only-subscription', {body:await page.locator('#newsletter-signup').screenshot({scale:'css'}),contentType:'image/png'})
})

test('account passwords can be shown and hidden, and duplicate signup is explained', async ({page},testInfo) => {
  await page.goto('/auth')
  const password=page.getByLabel('Password',{exact:true})
  await password.fill('QA-only-long-password-42')
  await expect(password).toHaveAttribute('type','password')
  await page.getByRole('button',{name:'Show password',exact:true}).click()
  await expect(password).toHaveAttribute('type','text')
  await page.getByRole('button',{name:'Hide password',exact:true}).click()
  await expect(password).toHaveAttribute('type','password')
  await expect(page.getByRole('link',{name:'Forgot password?',exact:true})).toHaveAttribute('href','/auth/forgot-password')
  await page.getByRole('button',{name:'Create account',exact:true}).click()
  await expect(page.getByLabel('Password',{exact:true})).toHaveAttribute('autocomplete','new-password')
  await page.getByLabel('Email',{exact:true}).fill('qa-existing@example.com')
  await page.getByLabel('Password',{exact:true}).fill('QA-only-long-password-42')
  await page.getByLabel('Confirm password',{exact:true}).fill('QA-only-long-password-42')
  await page.route('**/auth/v1/signup**',route=>route.fulfill({json:{id:'00000000-0000-4000-8000-000000000001',email:'qa-existing@example.com',identities:[],aud:'authenticated',created_at:'2026-01-01T00:00:00Z'}}))
  await page.getByRole('button',{name:'Create free account',exact:true}).click()
  await expect(page.getByRole('status')).toContainText('already used')
  await testInfo.attach('account-password-controls',{body:await page.locator('.authCard').screenshot({scale:'css'}),contentType:'image/png'})
})

test('password recovery requests the recovery endpoint and never creates an account', async ({page}) => {
  await page.goto('/auth/forgot-password')
  let requested=false
  await page.route('**/auth/v1/recover**',async route=>{requested=true;expect(route.request().postDataJSON().email).toBe('qa@example.com');await route.fulfill({json:{}})})
  await page.route('**/auth/v1/signup**',()=>{throw new Error('Recovery must not create an account')})
  await page.getByRole('textbox',{name:'Account email',exact:true}).fill('QA@example.com')
  await page.getByRole('button',{name:'Send reset link',exact:true}).click()
  await expect(page.getByRole('status')).toContainText('If this email has a KAPORAL account')
  expect(requested).toBe(true)
})

test('daily news has dated sources, topic search, and distinct TradingView attribution', async ({page},testInfo) => {
  await page.goto('/news')
  const cards=page.locator('.newsGrid .newsCard')
  await expect(cards.first()).toBeVisible()
  await expect(cards.first().locator('time')).toHaveAttribute('datetime',/^20/)
  await expect(cards.first().getByRole('link').first()).toHaveAttribute('href',/^https:\/\//)
  await page.getByLabel('Topic',{exact:true}).selectOption('geopolitics')
  await expect(cards.first().locator('.newsCategory')).toHaveText('Geopolitics')
  await page.getByRole('searchbox',{name:'Search news',exact:true}).fill('definitely-no-matching-news-qa')
  await expect(page.locator('.newsResultCount')).toContainText('0 headlines')
  await expect(page.locator('.newsEmpty')).toBeVisible()
  await page.getByRole('searchbox',{name:'Search news',exact:true}).clear()
  await expect(page.locator('.tradingViewCard a')).toHaveAttribute('href','https://www.tradingview.com/')
  await expect(page.locator('.tradingViewCard a')).not.toHaveAttribute('href',/share_your_love/)
  await page.locator('.tradingViewNews').scrollIntoViewIfNeeded()
  await expect(page.locator('.tradingview-widget-copyright')).toContainText('by TradingView')
  // Third-party rendering is verified separately; provider failures must not break source news.
  await testInfo.attach('daily-news-controls',{body:await page.screenshot({scale:'css'}),contentType:'image/png'})
})
