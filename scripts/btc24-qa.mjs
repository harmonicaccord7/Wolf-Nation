import assert from 'node:assert/strict'
import { DAY, cleanCandles, featuresAt, makeSamples, fitLogistic, nextForecast, strategy } from '../lib/models/btc24.ts'
// Synthetic algorithm fixtures only; never stored in the market database.
const start=Date.parse('2020-01-01')/1000
const candles=Array.from({length:800},(_,i)=>{const open=100+i*.04+2*Math.sin(i*.7),close=open+Math.sin(i*1.17);return [start+i*DAY,Math.min(open,close)-1,Math.max(open,close)+1,open,close,100+i%21]})
const cutoff=start+800*DAY
assert.equal(cleanCandles([...candles,candles[0]],cutoff).quality.duplicates,1)
assert.equal(cleanCandles(candles,cutoff-DAY).quality.incomplete,1)
assert.throws(()=>cleanCandles([...candles,[...candles[0].slice(0,5),999]],cutoff),/Conflicting/)
assert.throws(()=>cleanCandles([[start,0,10,4,5,1]],cutoff),/Invalid/)
const gap=candles.filter((_,i)=>i!==400)
assert.equal(cleanCandles(gap,cutoff).quality.gaps[0].missingDays,1)
assert.equal(featuresAt(gap,410),null)
const x=featuresAt(candles,100),futureChanged=candles.map((c,i)=>i>100?[c[0],...c.slice(1).map(v=>v*3)]:c)
assert.deepEqual(featuresAt(futureChanged,100),x)
const samples=makeSamples(candles)
assert.equal(samples[0].cutoff,start+31*DAY)
assert.equal(samples[0].start,start+32*DAY)
assert.equal(samples[0].end,start+33*DAY)
assert.equal(samples[0].move,candles[32][4]/candles[32][3]-1)
const fitted=fitLogistic(samples)
const forecast=nextForecast(candles,fitted,cutoff+3600)
assert.equal(Date.parse(forecast.windowEnd)-Date.parse(forecast.windowStart),DAY*1000)
assert.equal(Date.parse(forecast.windowStart)/1000,cutoff+DAY)
assert.throws(()=>nextForecast(candles.slice(0,-1),fitted,cutoff+3600),/Missing/)
assert.throws(()=>nextForecast(candles,fitted,cutoff+DAY-299),/insufficient/)
assert.equal(forecast.tradeAction,'abstain-unvalidated')
const row={...samples[0],move:.02,probability:.6,baseline:.5,fold:'fixture'}
const net=strategy([row],10)
assert.ok(Math.abs(net.totalReturnPct-((.999*1.02*.999)-1)*100)<1e-12)
assert.equal(strategy([{...row,probability:.549}],10).activeDays,0)
assert.ok(strategy([row],50).totalReturnPct<net.totalReturnPct)
console.log('BTC model QA passed: source validity, gaps, cutoff isolation, exact target alignment, fitting, stale-input abstention and two-sided costs.')
