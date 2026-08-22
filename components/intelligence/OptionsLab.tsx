import Link from 'next/link'
import type { MetricSeries } from '../../lib/data/intelligence'
import { formatIntelligenceValue,formatObservationDate } from '../../lib/format-intelligence'

function metric(metrics:MetricSeries[],code:string){return metrics.find(m=>m.code===code)}
function trend(m?:MetricSeries){const p=m?.history.filter(x=>x.value!==null)??[];if(p.length<2)return null;const a=p[0].value as number,b=p.at(-1)!.value as number;return a===0?null:((b-a)/Math.abs(a))*100}

export function OptionsLab({metrics}:{metrics:MetricSeries[]}){
 const oi=metric(metrics,'BTC_OPTIONS_OI'),pc=metric(metrics,'BTC_PUT_CALL_OI'),iv=metric(metrics,'BTC_OPTIONS_IV'),vol=metric(metrics,'BTC_OPTIONS_VOLUME')
 const ratio=pc?.latest?.value,total=oi?.latest?.value,callOi=ratio!=null&&total!=null?total/(1+ratio):null,putOi=callOi!=null&&ratio!=null?callOi*ratio:null
 const ivTrend=trend(iv),oiTrend=trend(oi)
 const positioning=ratio==null?'Positioning unavailable':ratio>1.15?'Put open interest outweighs call open interest':ratio<0.85?'Call open interest outweighs put open interest':'Put/call open interest is relatively balanced'
 const volRead=iv?.latest?.value==null?'Implied-volatility observation unavailable':iv.latest.value>=80?'Implied volatility is elevated':iv.latest.value>=55?'Implied volatility is substantial':'Implied volatility is comparatively restrained'
 return <section className="shell optionsLab"><div className="liveSectionHead"><div><span className="eyebrow">OPTIONS LAB</span><h2>BTC derivatives positioning, translated carefully.</h2></div><p>Educational market structure context — not an options trade recommendation.</p></div>
  <div className="optionsLabGrid"><article><small>OPEN INTEREST</small><strong>{formatIntelligenceValue(total,oi?.unit)}</strong><span>{oiTrend==null?'Trend builds from stored observations.':`${oiTrend>=0?'+':''}${oiTrend.toFixed(1)}% across stored window`}</span><Link href="/data/btc_options_oi">History →</Link></article><article><small>PUT / CALL OI</small><strong>{ratio==null?'—':ratio.toFixed(2)}</strong><span>{positioning}</span><Link href="/data/btc_put_call_oi">History →</Link></article><article><small>AVERAGE MARK IV</small><strong>{formatIntelligenceValue(iv?.latest?.value,iv?.unit)}</strong><span>{volRead}{ivTrend==null?'':` · ${ivTrend>=0?'+':''}${ivTrend.toFixed(1)}% window change`}</span><Link href="/data/btc_options_iv">History →</Link></article><article><small>24H OPTIONS VOLUME</small><strong>{formatIntelligenceValue(vol?.latest?.value,vol?.unit)}</strong><span>{formatObservationDate(vol?.latest?.observedAt,vol?.frequency)}</span><Link href="/data/btc_options_volume">History →</Link></article></div>
  <div className="optionsMechanics"><article><span className="eyebrow">POSITION SPLIT</span><h3>Approximate call vs put OI</h3><p>Call OI: <b>{formatIntelligenceValue(callOi,'BTC')}</b> · Put OI: <b>{formatIntelligenceValue(putOi,'BTC')}</b></p><small>Derived from aggregate open interest and the published put/call OI ratio. This is descriptive positioning, not directional certainty.</small></article><article><span className="eyebrow">INTERPRETATION RULE</span><h3>High IV is a price of uncertainty.</h3><p>Implied volatility describes option pricing expectations, not a guaranteed direction. Elevated IV can accompany both upside and downside risk.</p><small>Expiry-level skew, gamma and strike concentration require additional licensed or provider-level data before KAPORAL will display them.</small></article></div>
 </section>
}
