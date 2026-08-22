import Link from 'next/link'

const learnStages=[
 {level:'DISCOVER',title:'Understand the primitives',items:['What markets price','Bitcoin and digital scarcity','Inflation, rates and liquidity','Risk vs uncertainty']},
 {level:'FOLLOW',title:'Read connected signals',items:['Yield curves and the dollar','Cross-asset confirmation','Open interest and implied volatility','Source dates and data revisions']},
 {level:'RESEARCH',title:'Build evidence-backed scenarios',items:['Separate fact from inference','Write falsifiable claims','Assign probabilities and invalidation','Use contrarian and quant review']}
]
const businessLenses=[
 ['Capital','Rates, credit and liquidity change the hurdle rate for growth, inventory and expansion.'],
 ['Demand','Inflation, employment and wealth effects alter what customers can afford and prioritize.'],
 ['Inputs','Energy, FX and supply-chain shifts move unit economics before they appear in headline revenue.'],
 ['Policy','Industrial policy, trade rules and regulation can reshape market access and competitive advantage.']
]
const technologyLenses=[
 ['Capability','What can the technology reliably do today, not what a narrative says it may do?'],
 ['Cost curve','Are compute, energy, hardware or deployment costs falling enough for scaled adoption?'],
 ['Infrastructure','Which chips, grids, data centers, networks and supply chains constrain deployment?'],
 ['Commercialization','Where is measurable willingness to pay, durable margin or strategic necessity emerging?']
]

export function LearnPath(){return <section className="shell guideSection"><div className="liveSectionHead"><div><span className="eyebrow">LEARNING PATH</span><h2>Discover → Follow → Research</h2></div><p>Progress from definitions to evidence-backed scenario construction.</p></div><div className="guideGrid three">{learnStages.map(stage=><article key={stage.level}><small>{stage.level}</small><h3>{stage.title}</h3><ul>{stage.items.map(i=><li key={i}>{i}</li>)}</ul></article>)}</div><div className="guideCta"><p>Use live public data only after understanding what the series measures and when it was observed.</p><Link className="goldButton" href="/methodology">Study the research method</Link></div></section>}

export function BusinessFramework(){return <section className="shell guideSection"><div className="liveSectionHead"><div><span className="eyebrow">OPPORTUNITY FRAMEWORK</span><h2>Translate a signal into a business consequence.</h2></div><p>Evidence first; commercial conclusions remain editorial judgments.</p></div><div className="guideGrid four">{businessLenses.map(([title,text],i)=><article key={title}><small>{String(i+1).padStart(2,'0')}</small><h3>{title}</h3><p>{text}</p></article>)}</div></section>}

export function TechnologyFramework(){return <section className="shell guideSection"><div className="liveSectionHead"><div><span className="eyebrow">TECHNOLOGY FILTER</span><h2>Separate capability from investable scale.</h2></div><p>Technical progress, infrastructure readiness and commercial value do not move at the same speed.</p></div><div className="guideGrid four">{technologyLenses.map(([title,text],i)=><article key={title}><small>{String(i+1).padStart(2,'0')}</small><h3>{title}</h3><p>{text}</p></article>)}</div></section>}
