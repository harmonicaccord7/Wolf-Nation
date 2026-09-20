import type {DataPoint} from '../../lib/data/intelligence'
import {chartGeometry,selectChartPoints} from '../../lib/data/chart'
export function Sparkline({points}:{points:DataPoint[]}){
 const values=selectChartPoints(points,'MAX',Date.now()).slice(-30)
 if(values.length<2)return <div className="sparklineEmpty">{values.length?'One observation available.':'No history available.'}</div>
 return <svg className="metricSparkline" viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="Recent observed values"><polyline points={chartGeometry(values).map(p=>`${p.x},${p.y}`).join(' ')}/></svg>
}
