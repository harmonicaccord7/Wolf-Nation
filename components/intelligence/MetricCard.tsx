import Link from 'next/link'
import type { MetricSeries } from '../../lib/data/intelligence'
import { formatIntelligenceValue, formatObservationDate } from '../../lib/format-intelligence'
import { Sparkline } from './Sparkline'

export function MetricCard({metric}:{metric:MetricSeries}){
  const live=metric.latest?.value!==null&&metric.latest!==null
  return <article className={`liveMetricCard ${live?'hasData':'missingData'}`}>
    <div className="metricHead"><span>{metric.label}</span><em>{metric.frequency??'series'}</em></div>
    <strong>{formatIntelligenceValue(metric.latest?.value,metric.unit)}</strong>
    <Sparkline points={metric.history}/>
    <p>{metric.description}</p>
    <div className="metricProvenance"><span>{metric.latest?.provider??'Provider observation unavailable'}</span><time>{formatObservationDate(metric.latest?.observedAt,metric.frequency)}</time></div>
    <div className="metricLinks"><Link href={`/data/${metric.code.toLowerCase()}`}>Open history →</Link>{metric.sourceUrl&&<a className="sourceLink" href={metric.sourceUrl} target="_blank" rel="noreferrer">Provider ↗</a>}</div>
  </article>
}
