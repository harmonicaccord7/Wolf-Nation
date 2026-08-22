import type { DataPoint } from '../../lib/data/intelligence'

export function Sparkline({points}:{points:DataPoint[]}){
  const values=points.filter(p=>p.value!==null).slice(-30)
  if(values.length<2) return <div className="sparklineEmpty">History builds automatically as new observations arrive.</div>
  const nums=values.map(p=>p.value as number),min=Math.min(...nums),max=Math.max(...nums),range=max-min||1
  const coords=nums.map((v,i)=>`${(i/(nums.length-1))*100},${42-((v-min)/range)*34}`).join(' ')
  return <svg className="metricSparkline" viewBox="0 0 100 48" preserveAspectRatio="none" aria-hidden="true"><polyline points={coords}/></svg>
}
