import { test,expect } from '@playwright/test'
const input={price:100,budget:1000,feePercent:0,movePercent:20,stagedPrice:95,strike:100,premium:5,contractUnits:100}
const labels={price:'Reference price (USD)',budget:'Cash budget (USD)',feePercent:'Fee per transaction (%)',movePercent:'Final price change (%)',stagedPrice:'Second-stage price (USD)',strike:'Option strike (USD)',premium:'Option premium per unit (USD)',contractUnits:'Units per option contract'}
test('private scenario endpoints reject unsigned access without exposing records',async({request})=>{
  for(const method of ['GET','POST','DELETE']){
    const response=await request.fetch('/api/account/scenarios',{method,...(method==='GET'?{}:{data:{id:'11111111-1111-1111-1111-111111111111'}})})
    expect(response.status()).toBe(401);expect(response.headers()['cache-control']).toContain('no-store')
    expect(await response.json()).toEqual({error:'Authentication required'})
  }
  const result=await request.get('/tools/decision-lab?scenario=11111111-1111-1111-1111-111111111111')
  expect(result.headers()['cache-control']).toContain('no-store')
  expect(await result.text()).toContain('Sign in to open your private saved scenario.')
})
test('saving as a guest preserves entries and offers sign-in in a new tab',async({page})=>{
  await page.goto('/tools/decision-lab')
  await page.getByLabel('Asset',{exact:true}).selectOption('CUSTOM')
  for(const [k,label] of Object.entries(labels))await page.getByLabel(label,{exact:true}).fill(String(input[k as keyof typeof input]))
  const library=page.getByRole('region',{name:'Private saved scenarios'})
  await library.getByLabel('Scenario name').fill('Guest assumptions')
  await library.getByRole('button',{name:'Save this scenario',exact:true}).click()
  const signIn=library.getByRole('link',{name:'Sign in to save scenarios',exact:true})
  await expect(signIn).toHaveAttribute('href','/auth');await expect(signIn).toHaveAttribute('target','_blank')
  await expect(page.getByLabel('Reference price (USD)',{exact:true})).toHaveValue('100')
  await expect(page.getByRole('table',{name:'Decision comparison'})).toContainText('+$200.00')
})
test('save, reload, reopen, copy and delete use preserved assumptions (isolated API fixture)',async({page,isMobile})=>{
  // Browser-only fixture. PGlite separately verifies ownership and source checks.
  // No real authenticated session, saved customer record or entitlement is invented.
  let rows:any[]=[];const keys:string[]=[]
  await page.route('**/api/account/scenarios',async route=>{
    const method=route.request().method(),body=method==='GET'?null:route.request().postDataJSON()
    if(method==='POST'){
      keys.push(body.saveKey)
      const row={id:'00000000-0000-0000-0000-'+String(rows.length+1).padStart(12,'0'),name:body.name,asset:body.asset,inputs:body.inputs,reference:null,calculationVersion:'decision-lab-1.0',createdAt:'2026-10-12T08:00:00Z'}
      rows=[row,...rows];await route.fulfill({status:201,json:{scenario:row}})
    }else if(method==='DELETE'){rows=rows.filter(row=>row.id!==body.id);await route.fulfill({json:{ok:true}})}
    else await route.fulfill({json:{scenarios:rows}})
  })
  await page.goto('/tools/decision-lab');await page.getByLabel('Asset',{exact:true}).selectOption('CUSTOM')
  for(const [k,label] of Object.entries(labels))await page.getByLabel(label,{exact:true}).fill(String(input[k as keyof typeof input]))
  const library=page.getByRole('region',{name:'Private saved scenarios'})
  await library.getByLabel('Scenario name').fill('Before CPI');await library.getByRole('button',{name:'Save this scenario',exact:true}).click()
  await expect(library.getByRole('button',{name:'Open Before CPI',exact:true})).toBeVisible()
  await page.reload();await library.getByRole('button',{name:'Load my saved scenarios',exact:true}).click()
  await library.getByRole('button',{name:'Open Before CPI',exact:true}).click()
  await expect(page.getByLabel('Reference price (USD)',{exact:true})).toHaveValue('100')
  await expect(page.getByRole('table',{name:'Decision comparison'})).toContainText('+$3,000.00')
  await page.getByLabel('Final price change (%)',{exact:true}).fill('-20')
  await library.getByLabel('Scenario name').fill('Downside case');await library.getByRole('button',{name:'Save this scenario',exact:true}).click()
  await expect(library.getByRole('button',{name:'Open Downside case',exact:true})).toBeVisible()
  expect(new Set(keys).size).toBe(2)
  await library.getByRole('button',{name:'Open Before CPI',exact:true}).click()
  await expect(page.getByLabel('Final price change (%)',{exact:true})).toHaveValue('20')
  page.once('dialog',dialog=>dialog.accept());await library.getByRole('button',{name:'Delete Downside case',exact:true}).click()
  await expect(library.getByRole('button',{name:'Open Downside case',exact:true})).toHaveCount(0);expect(rows).toHaveLength(1)
  rows=[{...rows[0],asset:'BTC',reference:{symbol:'BTC',label:'Bitcoin',price:100,provider:'Synthetic QA reference',asOf:'2026-10-10T00:00:00Z',href:'/data/btc'}}]
  await library.getByRole('button',{name:'Load my saved scenarios',exact:true}).click();await library.getByRole('button',{name:'Open Before CPI',exact:true}).click()
  await expect(page.getByRole('link',{name:'Bitcoin history →',exact:true}).locator('..')).toContainText('Synthetic QA reference')
  await expect(page.getByLabel('Reference price (USD)',{exact:true})).toHaveValue('100')
  if(isMobile)await page.setViewportSize({width:844,height:390})
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(1)
})
