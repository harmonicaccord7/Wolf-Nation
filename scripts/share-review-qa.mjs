import assert from 'node:assert/strict'
import {simulateShares,shareInputError,shareAccountsError,shareRatios,shareEvidenceError,shareReviewCsv} from '../lib/tools/share-review.ts'
const near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<=Math.max(1,Math.abs(expected))*1e-10,actual+' != '+expected)
const base={sharePrice:1000,budget:100000,lotSize:1,feePercent:1,priceChangePercent:20,scenarioDividend:0}
let result=simulateShares(base)
assert.equal(result.shares,99);near(result.entryCost,99990);near(result.unusedCash,10);near(result.entryFee,990);near(result.exitFee,1188);near(result.finalValue,117622);near(result.profit,17622)
result=simulateShares({...base,scenarioDividend:40});near(result.dividendCash,3960);near(result.finalValue,121582)
// The scenario API deliberately accepts six decimals. Test the analytic break-even
// independently below instead of pretending an unrounded percentage was entered.
near(result.breakEvenPrice*result.shares*.99+result.dividendCash+result.unusedCash,base.budget)
result=simulateShares({...base,lotSize:100});assert.equal(result.shares,0);near(result.finalValue,100000);assert.equal(result.breakEvenPrice,null);near(result.capitalAtRisk,0)
result=simulateShares({...base,budget:101000,lotSize:100});assert.equal(result.shares,100);near(result.unusedCash,0)
result=simulateShares({...base,priceChangePercent:-100});near(result.finalValue,10);near(result.profit,-99990)
result=simulateShares({sharePrice:.29,budget:3.19,lotSize:10,feePercent:10,priceChangePercent:0,scenarioDividend:0});assert.equal(result.shares,10);near(result.entryCost,3.19);near(result.unusedCash,0)
result=simulateShares({...base,sharePrice:.000001,budget:1e9,feePercent:0});assert.equal(result.shares,1e15);assert.ok(Number.isSafeInteger(result.shares));near(result.unusedCash,0)
for(const update of [{sharePrice:0},{sharePrice:.0000001},{budget:0},{lotSize:1.5},{lotSize:0},{feePercent:11},{priceChangePercent:-101},{priceChangePercent:1001},{scenarioDividend:-1},{sharePrice:NaN},{feePercent:.1234567}]){
  assert.ok(shareInputError({...base,...update}));assert.throws(()=>simulateShares({...base,...update}))
}
let ratios=shareRatios(1000,{annualEPS:80,annualDividend:40,bookValue:500})
near(ratios.pe,12.5);near(ratios.earningsYield,8);near(ratios.dividendYield,4);near(ratios.payout,50);near(ratios.priceToBook,2)
assert.deepEqual(shareRatios(1000,{annualEPS:null,annualDividend:null,bookValue:null}),{pe:null,earningsYield:null,dividendYield:null,payout:null,priceToBook:null})
ratios=shareRatios(1000,{annualEPS:-80,annualDividend:40,bookValue:0});assert.equal(ratios.pe,null);assert.equal(ratios.payout,null);assert.equal(ratios.priceToBook,null);near(ratios.earningsYield,-8)
ratios=shareRatios(1000,{annualEPS:0,annualDividend:0,bookValue:-1});assert.equal(ratios.pe,null);assert.equal(ratios.payout,null);assert.equal(ratios.earningsYield,0);assert.equal(ratios.dividendYield,0)
ratios=shareRatios(1e9,{annualEPS:1e-320,annualDividend:1,bookValue:1e-320});assert.equal(ratios.pe,null);assert.equal(ratios.payout,null);assert.equal(ratios.priceToBook,null)
assert.ok(shareAccountsError({annualEPS:Infinity,annualDividend:0,bookValue:1}));assert.ok(shareAccountsError({annualEPS:0,annualDividend:-1,bookValue:1}))
const evidence={company:'Example',priceDate:'2026-10-13',accountsPeriod:'FY2025 diluted',sourceUrl:'https://example.com/accounts'}
assert.equal(shareEvidenceError(evidence,'2026-10-13'),null)
for(const change of [{priceDate:'2026-02-30'},{priceDate:'2026-10-14'},{sourceUrl:'javascript:alert(1)'},{sourceUrl:'https://user:password@example.com/'},{company:'bad\nname'}])assert.ok(shareEvidenceError({...evidence,...change},'2026-10-13'))
const csv=shareReviewCsv(base,{annualEPS:null,annualDividend:40,bookValue:0},{...evidence,company:'=HYPERLINK("https://example.com")',accountsPeriod:' +1'},'XAF','2026-10-13')
assert.match(csv,/"'=HYPERLINK/);assert.match(csv,/"' \+1"/);assert.match(csv,/annualEPS","Not entered"/);assert.match(csv,/calculation_version","africa-share-review-1.0"/);assert.match(csv,/User supplied; not fetched or verified/)
assert.throws(()=>shareReviewCsv(base,{annualEPS:null,annualDividend:null,bookValue:null},{...evidence,sourceUrl:'http://example.com'},'XAF','2026-10-13'))
console.log('Share review QA passed: whole-lot budget boundaries, fees, dividend separation, loss cases, break-even, unavailable denominators, source-note validation and CSV formula protection.')
