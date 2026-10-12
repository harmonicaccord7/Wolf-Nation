'use client'
import Link from 'next/link'
import { useRef,useState } from 'react'
import { assetLabels,savedScenario,SCENARIO_LIMIT,type SavedScenario } from '../../lib/tools/decision-scenarios'
import type { DecisionInputs } from '../../lib/tools/decision-simulation'
import styles from './ScenarioLibrary.module.css'
type Capture={asset:string;inputs:DecisionInputs;referenceAt:string|null;referencePrice:number|null;referenceProvider:string|null;error:string|null}
const date=(v:string)=>new Date(v).toLocaleString('en-GB',{dateStyle:'medium',timeStyle:'short',timeZone:'UTC'})+' UTC'
function readReply(v:unknown):SavedScenario|null{
  if(!v||typeof v!=='object')return null
  const row=v as Record<string,unknown>
  return savedScenario({...row,calculation_version:row.calculationVersion,created_at:row.createdAt})
}
export function ScenarioLibrary({capture,onOpen,initialScenarios,initialError}:{capture?:Capture;onOpen?:(s:SavedScenario)=>void;initialScenarios?:SavedScenario[];initialError?:string|null}){
  const [name,setName]=useState(''),[rows,setRows]=useState(initialScenarios??[])
  const [loaded,setLoaded]=useState(initialScenarios!==undefined),[busy,setBusy]=useState(false),[message,setMessage]=useState(initialError??''),[signIn,setSignIn]=useState(false)
  const pending=useRef<{fingerprint:string;key:string}|null>(null)
  async function request(method:string,value?:unknown){
    const response=await fetch('/api/account/scenarios',{method,cache:'no-store',...(value?{headers:{'content-type':'application/json'},body:JSON.stringify(value)}:{})})
    const data=await response.json()
    if(response.status===401){setSignIn(true);setRows([]);setLoaded(false);throw new Error('Sign in to use your private saved scenarios. The calculator remains free.')}
    if(!response.ok)throw new Error(data.error||'Saved scenarios are temporarily unavailable.')
    return data
  }
  async function load(){
    setBusy(true);setMessage('')
    try{
      const data=await request('GET')
      if(!Array.isArray(data.scenarios)||data.scenarios.length>SCENARIO_LIMIT)throw new Error('The saved list could not be read safely.')
      const parsed=data.scenarios.map(readReply)
      if(parsed.some((row:SavedScenario|null)=>row===null))throw new Error('A saved scenario could not be read safely.')
      setRows(parsed);setLoaded(true);setSignIn(false);setMessage('Your saved scenarios are loaded.')
    }catch(error){setLoaded(false);setMessage(error instanceof Error?error.message:'Could not load scenarios.')}
    finally{setBusy(false)}
  }
  async function save(){
    if(!capture||capture.error)return
    setBusy(true);setMessage('')
    const draft={name:name.trim(),asset:capture.asset,inputs:capture.inputs,referenceAt:capture.referenceAt,referencePrice:capture.referencePrice,referenceProvider:capture.referenceProvider}
    const fingerprint=JSON.stringify(draft)
    if(pending.current?.fingerprint!==fingerprint)pending.current={fingerprint,key:crypto.randomUUID()}
    try{
      const data=await request('POST',{...draft,saveKey:pending.current!.key}),row=readReply(data.scenario)
      if(!row)throw new Error('The saved result could not be read safely.')
      setRows(current=>[row,...current.filter(item=>item.id!==row.id)]);setSignIn(false)
      setMessage('Scenario saved privately. Opening it preserves these assumptions and source dates.')
    }catch(error){setMessage(error instanceof Error?error.message:'Could not save the scenario.')}
    finally{setBusy(false)}
  }
  async function remove(row:SavedScenario){
    if(!window.confirm('Delete “'+row.name+'”? This cannot be undone.'))return
    setBusy(true);setMessage('')
    try{await request('DELETE',{id:row.id});setRows(current=>current.filter(item=>item.id!==row.id));setMessage('Saved scenario deleted.')}
    catch(error){setMessage(error instanceof Error?error.message:'Could not remove the scenario.')}
    finally{setBusy(false)}
  }
  return <section className={styles.library} aria-label="Private saved scenarios"><h2>Save &amp; reopen your scenarios</h2>
    <p>The calculator and CSV are free. An account lets you keep up to {SCENARIO_LIMIT} private scenarios and reopen them on another device. Saving is optional; it does not subscribe you to the newsletter or create a paid membership.</p>
    {capture&&<div className={styles.save}><label>Scenario name<input value={name} maxLength={80} onChange={e=>setName(e.target.value)} placeholder="For example: Bitcoin before CPI"/></label><button className="goldButton" disabled={busy||!!capture.error||!name.trim()} onClick={save}>{busy?'Working…':'Save this scenario'}</button></div>}
    <div className={styles.actions}><button className="outlineButton" disabled={busy} onClick={load}>{busy?'Working…':'Load my saved scenarios'}</button><Link href="/account/scenarios">My saved workspace →</Link>{signIn&&<Link href="/auth" target="_blank" rel="noopener noreferrer">Sign in to save scenarios</Link>}</div>
    {signIn&&<p>Sign-in opens in a new tab. Return here afterwards and save again; your entered assumptions stay open.</p>}
    <p role="status" aria-live="polite">{message}</p>
    {loaded&&!rows.length&&!initialError&&<p>No saved scenarios yet. Open Decision Lab, name your assumptions and choose Save.</p>}
    <div className={styles.list}>{rows.map(row=><article key={row.id}><div><h3>{row.name}</h3><p>{assetLabels[row.asset]} · budget {'$'}{row.inputs.budget.toLocaleString('en-US')} · assumed move {row.inputs.movePercent>0?'+':''}{row.inputs.movePercent}%</p><p>Saved {date(row.createdAt)} · calculation {row.calculationVersion}</p><p>{row.reference?'Original reference: '+row.reference.provider+' · '+date(row.reference.asOf)+'. It is preserved, not refreshed automatically.':'Manual assumptions; no provider reference is attached.'}</p></div><div className={styles.actions}>{onOpen?<button className="outlineButton" disabled={busy} onClick={()=>{setName(row.name);onOpen(row);setMessage('Saved scenario opened. Its assumptions and original reference are preserved.')}}>Open {row.name}</button>:<Link className="outlineButton" href={'/tools/decision-lab?scenario='+row.id}>Open in Decision Lab →</Link>}<button className={styles.remove} disabled={busy} onClick={()=>remove(row)}>Delete {row.name}</button></div></article>)}</div>
    <p>Changing a scenario and saving again creates a separate copy. These are your assumptions, not forecasts, trade orders or evidence of a realised return.</p>
  </section>
}
