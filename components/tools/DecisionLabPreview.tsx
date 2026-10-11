import Link from 'next/link'
import styles from './DecisionLabPreview.module.css'
export function DecisionLabPreview() {
  return <section className={`shell ${styles.preview}`}><div><span className="eyebrow">TRY A REAL DECISION TOOL · FREE</span><h2>What would this decision cost you?</h2><p>Compare buying now, waiting, buying in stages, or buying a call or put. See gains, losses, fees and break-even prices under your own assumptions.</p></div><Link className="goldButton" href="/tools/decision-lab">Open Decision Lab →</Link></section>
}
