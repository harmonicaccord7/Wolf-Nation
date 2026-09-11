export type ModelPoint = {observedAt:string;value:number}
export type ModelSnapshot = Record<string, ModelPoint[]>
export type ModuleResult = {moduleCode:string;label:string;status:'scored'|'abstained';direction:'up'|'down'|'mixed'|'none';score:number|null;horizon:string;asOf:string|null;inputs:string[];rationale:string;limitation:string}
const aliases: Record<string,string[]> = {
  macro:['CPI_US','DXY','US10Y'], liquidity:['US10Y','DXY','FEDFUNDS'], crypto:['BTC','BTC_USD'], volatility:['BTC'], africa:['NGDP','AFRICA_GDP','CPI_NG'], geopolitics:[],
}
function series(snapshot:ModelSnapshot, names:string[]){for(const name of names)if(snapshot[name]?.length)return snapshot[name].slice().sort((a,b)=>a.observedAt.localeCompare(b.observedAt));return []}
function change(points:ModelPoint[], periods=1){if(points.length<=periods)return null;const current=points.at(-1)!,prior=points.at(-1-periods)!;return prior.value===0?null:(current.value-prior.value)/Math.abs(prior.value)*100}
function asOf(points:ModelPoint[]){return points.at(-1)?.observedAt??null}
function result(moduleCode:string,label:string,points:ModelPoint[],direction:ModuleResult['direction'],score:number|null,horizon:string,inputs:string[],rationale:string,limitation:string):ModuleResult{return {moduleCode,label,status:score===null?'abstained':'scored',direction,score:score===null?null:Math.max(-100,Math.min(100,score)),horizon,asOf:asOf(points),inputs,rationale,limitation}}

export function runDecisionModules(snapshot:ModelSnapshot, now = new Date().toISOString()):ModuleResult[]{
  const cpi=series(snapshot,aliases.macro.slice(0,1)), dxy=series(snapshot,['DXY']), rates=series(snapshot,['US10Y','US10Y_FRED'])
  const cpiMove=change(cpi), dxyMove=change(dxy), rateMove=change(rates)
  const macroPoints=[...cpi,...dxy,...rates].sort((a,b)=>a.observedAt.localeCompare(b.observedAt))
  const macroScore=cpiMove===null||dxyMove===null?null:-(cpiMove*20)-(dxyMove*4)
  const macro=result('macro_regime','Macro regime',macroPoints,macroScore===null?'none':macroScore>12?'down':macroScore< -12?'up':'mixed',macroScore,'next release to 1 week',['CPI_US','DXY','US10Y'],'A transparent direction-of-change screen across inflation, dollar and rates. It is a regime description, not a forecast.', 'Needs aligned timestamps and a longer, release-aware history before it can be evaluated out of sample.')
  const liquidityPoints=[...dxy,...rates].sort((a,b)=>a.observedAt.localeCompare(b.observedAt)); const liquidityScore=dxyMove===null||rateMove===null?null:-(dxyMove*3+rateMove*3)
  const liquidity=result('liquidity_conditions','Liquidity conditions',liquidityPoints,liquidityScore===null?'none':liquidityScore>10?'down':liquidityScore< -10?'up':'mixed',liquidityScore,'1–4 weeks',['DXY','US10Y'],'A simple conditions screen based on observed dollar and yield changes; no hidden factor is implied.', 'It has no funding-spread or balance-sheet input in this run and must not be treated as a liquidity forecast.')
  const btc=series(snapshot,aliases.crypto); const btc24=change(btc,1), btc72=change(btc,3), cryptoScore=btc24===null?null:btc24*2+(btc72??0)
  const crypto=result('btc_direction','BTC direction screen',btc,cryptoScore===null?'none':cryptoScore>4?'up':cryptoScore< -4?'down':'mixed',cryptoScore,'24h / 72h',['BTC'],'A momentum description from observed BTC snapshots. It does not estimate a probability of profit.', 'A short price history is not enough to claim a calibrated forecast; event and transaction-cost features are absent.')
  const volPoints=btc; const returns=btc.slice(1).map((p,i)=>Math.log(p.value/Math.max(btc[i].value,Number.EPSILON))).filter(Number.isFinite); const vol=returns.length>4?Math.sqrt(returns.reduce((sum,value)=>sum+value*value,0)/returns.length)*Math.sqrt(365)*100:null
  const volatility=result('volatility_expectations','Realized volatility',volPoints,'none',vol===null?null:Math.min(vol,100),'7d annualized estimate',['BTC'],'Observed realized volatility from available price snapshots. No implied-volatility expectation is asserted without an options series.', 'A realized estimate is not an expectation and cannot be compared with implied volatility until an options surface is available.')
  const africa=series(snapshot,aliases.africa); const africaMove=change(africa); const africaResult=result('africa_country','Africa country screen',africa,africaMove===null?'none':africaMove>1?'up':africaMove< -1?'down':'mixed',africaMove,'latest official observation',['NGDP','AFRICA_GDP','CPI_NG'],'A country/region screen runs only when an official series is supplied to the runner.', 'This run abstains unless a country-specific official series was fetched; regional labels are not a substitute for country coverage.')
  const geopolitics=result('geopolitics_exposure','Geopolitics exposure',[], 'none',null,'research review',[],'No numeric geopolitics score is emitted. Human-reviewed evidence and exposure mapping are required.', 'There is no defensible universal geopolitical price predictor in this product.')
  return [macro,liquidity,crypto,volatility,africaResult,geopolitics].map(item=>({...item,asOf:item.asOf??now}))
}
