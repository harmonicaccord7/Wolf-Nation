import assert from 'node:assert/strict'
import { decisionInputError, simulateDecision } from '../lib/tools/decision-simulation.ts'
const base = { price:100, budget:1000, feePercent:0, movePercent:20, stagedPrice:100, strike:100, premium:5, contractUnits:100 }
const by = input => Object.fromEntries(simulateDecision(input).map(row => [row.strategy, row]))
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) <= Math.max(1, Math.abs(expected)) * 1e-10, `${actual} != ${expected}`)
let rows = by(base)
near(rows.buy.finalValue,1200); near(rows.buy.profit,200); near(rows.stage.profit,200)
near(rows.wait.profit,0); near(rows.call.profit,3000); near(rows.put.profit,-1000)
assert.equal(rows.call.contracts,2); assert.equal(rows.call.maximumLoss,1000)
rows = by({...base,movePercent:-20})
near(rows.buy.profit,-200); near(rows.call.profit,-1000); near(rows.put.profit,3000)
rows = by({...base,movePercent:0})
near(rows.call.profit,-1000); near(rows.put.profit,-1000)
rows = by({...base,feePercent:1,movePercent:0})
near(rows.buy.fees,1000*.01/1.01 + (1000/1.01)*.01); near(rows.buy.profit,-rows.buy.fees)
for (const strategy of ['buy','stage','call','put']) {
  const breakEven=rows[strategy].breakEven
  near(by({...base,feePercent:1,movePercent:(breakEven/base.price-1)*100})[strategy].profit,0)
}
rows = by({...base,budget:600})
assert.equal(rows.call.contracts,1); near(rows.call.cash,100); near(rows.call.maximumLoss,500)
rows = by({...base,budget:499})
assert.equal(rows.call.available,false); assert.equal(rows.call.contracts,0); near(rows.call.profit,0); near(rows.call.cash,499)
rows = by({...base,stagedPrice:80,movePercent:0})
near(rows.stage.profit,125)
rows = by({...base,movePercent:-100})
near(rows.buy.profit,-1000); near(rows.stage.profit,-1000)
for(const change of [-100,-50,0,50,1000])for(const fee of [0,.1,10]){
  const tested=by({...base,movePercent:change,feePercent:fee})
  for(const row of Object.values(tested)){
    assert.ok(row.profit>=-row.maximumLoss-1e-8)
    assert.ok(row.finalValue>=0 && row.cash>=0)
    near(row.finalValue-base.budget,row.profit)
    for(const value of Object.values(row))if(typeof value==='number')assert.ok(Number.isFinite(value))
  }
}
for(const update of [{price:0},{price:1e-300},{budget:0},{feePercent:-1},{feePercent:11},{movePercent:-101},{movePercent:Infinity},{strike:0},{premium:0},{contractUnits:1.5},{contractUnits:0},{stagedPrice:NaN}]){
  assert.ok(decisionInputError({...base,...update})); assert.throws(()=>simulateDecision({...base,...update}))
}
console.log('Decision Lab QA passed: cash/fees, staging, whole call/put contracts, expiry losses, break-even and invalid inputs. No trade or forecast created.')
