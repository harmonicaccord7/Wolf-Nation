import { decisionInputError, type DecisionInputs } from './decision-simulation.ts'
export const SCENARIO_VERSION = 'decision-lab-1.0'
export const SCENARIO_LIMIT = 50
export const inputKeys = ['price','budget','feePercent','movePercent','stagedPrice','strike','premium','contractUnits'] as const
export const assetLabels = { BTC: 'Bitcoin', ETH: 'Ethereum', SOL: 'Solana', GOLD: 'Gold futures reference', CUSTOM: 'Custom asset' } as const
export type ScenarioAsset = keyof typeof assetLabels
export type DecisionReference = { symbol:string; label:string; price:number; provider:string; asOf:string; href:string }
export type SavedScenario = { id:string; name:string; asset:ScenarioAsset; inputs:DecisionInputs; reference:DecisionReference|null; calculationVersion:string; createdAt:string }
export type ScenarioDraft = { saveKey:string; name:string; asset:ScenarioAsset; inputs:DecisionInputs; referenceAt:string|null; referencePrice:number|null; referenceProvider:string|null }
export const scenarioId = (v:unknown):v is string => typeof v==='string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
const object = (v:unknown):v is Record<string,unknown> => v!==null && typeof v==='object' && !Array.isArray(v)
const timestamp = (v:unknown):v is string => typeof v==='string' && /^\d{4}-\d\d-\d\dT/.test(v) && Number.isFinite(Date.parse(v))
export const scenarioName = (v:unknown):string|null => typeof v==='string' && v.trim().length>=1 && v.trim().length<=80 && !/[\u0000-\u001f\u007f]/.test(v) ? v.trim() : null
function inputs(v:unknown):DecisionInputs|null {
  if(!object(v) || Object.keys(v).length!==inputKeys.length || inputKeys.some(k=>typeof v[k]!=='number'||!Number.isFinite(v[k])))return null
  const parsed=Object.fromEntries(inputKeys.map(k=>[k,v[k]])) as DecisionInputs
  return decisionInputError(parsed)?null:parsed
}
export function parseScenarioDraft(v:unknown,now=new Date().toISOString()):ScenarioDraft|null {
  if(!timestamp(now)||!object(v)||Object.keys(v).some(k=>!['saveKey','name','asset','inputs','referenceAt','referencePrice','referenceProvider'].includes(k)))return null
  const name=scenarioName(v.name), parsed=inputs(v.inputs)
  if(!scenarioId(v.saveKey)||!name||!parsed||typeof v.asset!=='string'||!Object.hasOwn(assetLabels,v.asset))return null
  const referenceAt=v.referenceAt??null,referencePrice=v.referencePrice??null,referenceProvider=v.referenceProvider??null
  if(referenceAt!==null&&(!timestamp(referenceAt)||Date.parse(referenceAt)>Date.parse(now)||v.asset==='CUSTOM'))return null
  if(referenceAt===null?referencePrice!==null:typeof referencePrice!=='number'||!Number.isFinite(referencePrice)||referencePrice<=0||referencePrice>1e9)return null
  if(referenceAt===null?referenceProvider!==null:typeof referenceProvider!=='string'||!referenceProvider||referenceProvider.length>120||/[\u0000-\u001f\u007f]/.test(referenceProvider))return null
  return {saveKey:v.saveKey,name,asset:v.asset as ScenarioAsset,inputs:parsed,referenceAt:referenceAt as string|null,referencePrice:referencePrice as number|null,referenceProvider:referenceProvider as string|null}
}
export function savedScenario(v:unknown):SavedScenario|null {
  if(!object(v)||!scenarioId(v.id)||v.calculation_version!==SCENARIO_VERSION||!timestamp(v.created_at))return null
  const name=scenarioName(v.name),parsed=inputs(v.inputs)
  if(!name||!parsed||typeof v.asset!=='string'||!Object.hasOwn(assetLabels,v.asset))return null
  const asset=v.asset as ScenarioAsset
  let reference:DecisionReference|null=null
  if(v.reference!==null){
    const r=v.reference
    if(!object(r)||asset==='CUSTOM'||r.symbol!==asset||r.label!==assetLabels[asset]||r.href!=='/data/'+asset.toLowerCase()||typeof r.price!=='number'||!Number.isFinite(r.price)||r.price<=0||typeof r.provider!=='string'||!r.provider||r.provider.length>120||!timestamp(r.asOf)||Date.parse(r.asOf)>Date.parse(v.created_at))return null
    reference={symbol:r.symbol as string,label:r.label as string,href:r.href as string,price:r.price,provider:r.provider,asOf:r.asOf}
  }
  return {id:v.id,name,asset,inputs:parsed,reference,calculationVersion:SCENARIO_VERSION,createdAt:v.created_at}
}
