export const SHARE_REVIEW_VERSION = 'africa-share-review-1.0'
export type ShareInputs = { sharePrice:number; budget:number; lotSize:number; feePercent:number; priceChangePercent:number; scenarioDividend:number }
export type ShareAccounts = { annualEPS:number|null; annualDividend:number|null; bookValue:number|null }
export type ShareEvidence = { company:string; priceDate:string; accountsPeriod:string; sourceUrl:string }
const SCALE=1_000_000n, RATE=100_000_000n
const scaled=(value:number)=>BigInt(Math.round(value*Number(SCALE)))
const amount=(value:bigint,scale:bigint)=>Number(value)/Number(scale)
const available=(value:number)=>Number.isFinite(value)?value:null
function sixDecimals(value:number){
  const valueScaled=value*Number(SCALE)
  return Math.abs(valueScaled-Math.round(valueScaled))<=Number.EPSILON*4*Math.max(1,Math.abs(valueScaled))
}
export function shareInputError(input:ShareInputs):string|null {
  if(Object.values(input).some(value=>!Number.isFinite(value)))return 'Enter a number in every scenario field, or load the hypothetical example.'
  if(input.sharePrice<.000001||input.sharePrice>1e9)return 'Share price must be positive, between 0.000001 and 1 billion.'
  if(input.budget<.01||input.budget>1e9)return 'Budget must be between 0.01 and 1 billion in the selected currency.'
  if(!Number.isInteger(input.lotSize)||input.lotSize<1||input.lotSize>1e9)return 'Lot size must be a whole number between 1 and 1 billion.'
  if(input.feePercent<0||input.feePercent>10)return 'Fee each way must be between 0% and 10%.'
  if(input.priceChangePercent< -100||input.priceChangePercent>1000)return 'Assumed price change must be between −100% and +1,000%.'
  if(input.scenarioDividend<0||input.scenarioDividend>1e9)return 'Assumed dividend per share must be between zero and 1 billion.'
  if(Object.values(input).some(value=>!sixDecimals(value)))return 'Use no more than six decimal places in scenario fields.'
  return null
}
export function shareAccountsError(accounts:ShareAccounts):string|null {
  for(const value of Object.values(accounts))if(value!==null&&(!Number.isFinite(value)||Math.abs(value)>1e9))return 'Company figures must be finite numbers between −1 billion and +1 billion; leave unknown figures empty.'
  if(accounts.annualDividend!==null&&accounts.annualDividend<0)return 'Past annual dividend per share cannot be negative.'
  return null
}
export function shareRatios(price:number,accounts:ShareAccounts){
  if(!Number.isFinite(price)||price<=0)throw new Error('A positive share price is required.')
  const error=shareAccountsError(accounts);if(error)throw new Error(error)
  return {
    pe:accounts.annualEPS!==null&&accounts.annualEPS>0?available(price/accounts.annualEPS):null,
    earningsYield:accounts.annualEPS!==null?available(accounts.annualEPS/price*100):null,
    dividendYield:accounts.annualDividend!==null?available(accounts.annualDividend/price*100):null,
    payout:accounts.annualEPS!==null&&accounts.annualEPS>0&&accounts.annualDividend!==null?available(accounts.annualDividend/accounts.annualEPS*100):null,
    priceToBook:accounts.bookValue!==null&&accounts.bookValue>0?available(price/accounts.bookValue):null
  }
}
export function simulateShares(input:ShareInputs){
  const error=shareInputError(input);if(error)throw new Error(error)
  const price=scaled(input.sharePrice),budget=scaled(input.budget),fee=scaled(input.feePercent),move=scaled(input.priceChangePercent)
  // Fixed six-decimal input arithmetic prevents a binary-rounding error buying
  // one lot too few, or spending above the budget, at an affordability boundary.
  const lotCost=price*BigInt(input.lotSize)*(RATE+fee)
  const lots=budget*RATE/lotCost,sharesBig=lots*BigInt(input.lotSize),shares=Number(sharesBig)
  const principalRaw=sharesBig*price,entryRaw=principalRaw*(RATE+fee)
  const unusedCash=amount(budget*RATE-entryRaw,SCALE*RATE)
  const grossSaleRaw=principalRaw*(RATE+move)
  const entryCost=amount(entryRaw,SCALE*RATE)
  const entryFee=amount(principalRaw*fee,SCALE*RATE)
  const grossSale=amount(grossSaleRaw,SCALE*RATE)
  const exitFee=amount(grossSaleRaw*fee,SCALE*RATE*RATE)
  const saleAfterFees=amount(grossSaleRaw*(RATE-fee),SCALE*RATE*RATE)
  const dividendCash=amount(sharesBig*scaled(input.scenarioDividend),SCALE)
  const finalValue=unusedCash+saleAfterFees+dividendCash,profit=finalValue-input.budget
  return {shares,lots:Number(lots),entryCost,entryFee,exitFee,unusedCash,grossSale,dividendCash,finalValue,profit,
    returnPercent:(finalValue/input.budget-1)*100,capitalAtRisk:entryCost,
    breakEvenPrice:shares?Math.max(0,(entryCost-dividendCash)/(shares*(1-input.feePercent/100))):null}
}
export function shareEvidenceError(evidence:ShareEvidence,cutoffDate:string):string|null {
  if(evidence.company.length>120||evidence.accountsPeriod.length>120||/[\u0000-\u001f\u007f]/.test(evidence.company+evidence.accountsPeriod))return 'Keep company and accounts-period notes to 120 characters without control characters.'
  if(evidence.priceDate){
    const date=new Date(evidence.priceDate+'T00:00:00Z')
    if(!/^\d{4}-\d\d-\d\d$/.test(evidence.priceDate)||!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==evidence.priceDate||evidence.priceDate>cutoffDate)return 'Enter a valid price/document date no later than today.'
  }
  if(evidence.sourceUrl){
    if(evidence.sourceUrl.length>2048||/[\u0000-\u0020\u007f]/.test(evidence.sourceUrl))return 'Use a complete HTTPS source address without spaces.'
    try{const url=new URL(evidence.sourceUrl);if(url.protocol!=='https:'||url.username||url.password)return 'Use an HTTPS source address without embedded credentials.'}
    catch{return 'Use a complete HTTPS source address.'}
  }
  return null
}
function csvCell(value:string|number){
  const text=typeof value==='number'?String(value):/^[\s\u200b-\u200d\uFEFF]*[=+\-@]/.test(value)?"'"+value:value
  return '"'+text.replaceAll('"','""')+'"'
}
export function shareReviewCsv(input:ShareInputs,accounts:ShareAccounts,evidence:ShareEvidence,currency:string,cutoffDate:string){
  const error=shareInputError(input)||shareAccountsError(accounts)||shareEvidenceError(evidence,cutoffDate)
  if(error)throw new Error(error)
  if(!/^[A-Z]{3}$/.test(currency))throw new Error('A three-letter currency code is required.')
  const result=simulateShares(input),ratios=shareRatios(input.sharePrice,accounts)
  const rows:(string|number)[][]=[
    ['field','value','meaning'],
    ['calculation_version',SHARE_REVIEW_VERSION,'Assumption-based calculation; not a forecast or trade order'],
    ['currency',currency,'All entered monetary figures use this currency'],
    ['company',evidence.company||'Not entered','User supplied; not independently verified'],
    ['price_document_date',evidence.priceDate||'Not entered','User supplied; no live quote claim'],
    ['accounts_period',evidence.accountsPeriod||'Not entered','Use consistent annual, currency and share bases'],
    ['source_url',evidence.sourceUrl||'Not entered','User supplied; not fetched or verified by this tool'],
    ...Object.entries(input).map(([key,value])=>[key,value,'Scenario assumption']),
    ...Object.entries(accounts).map(([key,value])=>[key,value??'Not entered','Past company figure supplied by the reader']),
    ...Object.entries(ratios).map(([key,value])=>[key,value??'Not available','Calculated from entered historical figures and price']),
    ...Object.entries(result).map(([key,value])=>[key,value??'Not available','Selected assumed scenario']),
    ['limitations','Taxes, spreads, fixed fees, custody, liquidity, transfer rules and dividend eligibility are excluded.','Whole lots; percentage buy/sell fees; no dividend reinvestment or automatic historical dividend forecast']
  ]
  return rows.map(row=>row.map(csvCell).join(',')).join('\r\n')+'\r\n'
}
