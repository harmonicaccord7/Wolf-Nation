import type { EventKind } from './calendar.ts'

export const backgroundVersion = '2026-09-13'
export type BackgroundKey = EventKind | 'yields' | 'dollar' | 'oil' | 'geopolitics'
export type MarketBackground = {
  key: BackgroundKey; title: string; description: string; watch: string
  higher: { label: string; crypto: string; gold: string }
  lower: { label: string; crypto: string; gold: string }
  pocket: string; exception: string; sources: { label: string; url: string }[]
}

export const backgroundNotes = [
  'These are possible paths, not forecasts or instructions to buy. Here, crypto means Bitcoin and other risky crypto assets; stablecoins and individual tokens can behave differently.',
  'Compare the new result with what investors expected, as well as with the previous result. A number can rise from last month and still be lower than expected. If no reliable expectation is available, do not call it a surprise.',
  'Slower inflation usually means prices are still rising, just more slowly. It does not mean your shopping bill has fallen. “Core” inflation leaves out food and energy to help show the underlying trend; those bills still matter to households.',
]

export const transmissionSources = [
  { label: 'Federal Reserve: how interest-rate decisions work', url: 'https://www.federalreserve.gov/monetarypolicy/monetary-policy-what-are-its-goals-how-does-it-work.htm' },
  { label: 'Chicago Fed research: what drives gold prices', url: 'https://www.chicagofed.org/publications/chicago-fed-letter/2021/464' },
  { label: 'New York Fed research: Bitcoin does not always follow economic news', url: 'https://www.newyorkfed.org/research/staff_reports/sr1052' },
]

export const marketBackgrounds: MarketBackground[] = [
  {
    key: 'cpi', title: 'CPI — prices households pay',
    description: 'The Consumer Price Index tracks the prices of a basket of goods and services, such as food, rent and transport. It helps show how quickly the cost of living is changing.',
    watch: 'Look at monthly and yearly inflation, the items driving the change, and the result compared with expectations.',
    higher: { label: 'Inflation is hotter than expected', crypto: 'Investors may expect borrowing costs to stay high for longer. Less appetite for risky investments can put pressure on Bitcoin and other crypto.', gold: 'If interest earned on bonds after inflation rises, gold can become less attractive because it pays no interest. A stronger dollar can add pressure.' },
    lower: { label: 'Inflation is cooler than expected', crypto: 'Expectations of lower interest rates can encourage risk-taking and help crypto prices.', gold: 'Lower interest rates after inflation and a weaker dollar can support gold.' },
    pocket: 'Faster price rises reduce what your income buys unless your pay keeps up. Rates staying high can also keep new loans and variable-rate debt expensive.',
    exception: 'Inflation fears or demand for safety can lift gold even after a hot reading. Crypto may follow its own news. A single CPI report does not force the Fed to change rates.',
    sources: [{ label: 'BLS: CPI explained', url: 'https://www.bls.gov/cpi/questions-and-answers.htm' }],
  },
  {
    key: 'pce', title: 'PCE — a broader view of consumer prices',
    description: 'The Personal Consumption Expenditures price index tracks prices across consumer spending, including some spending made on people’s behalf, such as employer-paid healthcare. The Fed uses PCE inflation for its 2% goal.',
    watch: 'Check overall and core inflation, monthly and yearly changes, and revisions. Core PCE excludes food and energy.',
    higher: { label: 'PCE inflation is hotter than expected', crypto: 'Investors may expect the Fed to keep rates high. That can reduce demand for risky crypto investments.', gold: 'Gold can face pressure if the report lifts interest rates after inflation or strengthens the dollar.' },
    lower: { label: 'PCE inflation is cooler than expected', crypto: 'Lower expected borrowing costs can support risk-taking and crypto.', gold: 'Lower expected rates and a softer dollar can help gold.' },
    pocket: 'PCE helps show broad pressure on household spending. Your own bills can rise faster or slower than this national average.',
    exception: 'Some PCE information is already suggested by earlier reports. A result investors expected may have little effect. A weak economy can outweigh hopes for lower rates.',
    sources: [{ label: 'BEA: PCE price index', url: 'https://www.bea.gov/data/personal-consumption-expenditures-price-index' }, { label: 'Fed: its inflation goal', url: 'https://www.federalreserve.gov/faqs/economy_14400.htm' }],
  },
  {
    key: 'fomc', title: 'FOMC — the Fed’s interest-rate decision',
    description: 'The Federal Open Market Committee is the group that sets U.S. monetary policy. FOMC is a meeting and a decision, not an inflation number. Its comments about future rates also matter.',
    watch: 'Compare the decision with expectations. Read the statement and press conference together, including why rates changed or stayed the same.',
    higher: { label: 'Rates rise, or the Fed signals higher rates for longer', crypto: 'More expensive borrowing and better returns on cash can make risky crypto investments less appealing.', gold: 'Gold pays no interest. Higher returns on bonds after inflation and a stronger dollar can put pressure on its price.' },
    lower: { label: 'Rates fall, or the Fed signals lower rates ahead', crypto: 'Cheaper borrowing can encourage risk-taking and support crypto if confidence in the economy holds up.', gold: 'Lower returns on interest-paying assets and a weaker dollar can make gold more attractive.' },
    pocket: 'New mortgages, some business loans and credit-card debt may become more or less expensive. Savings rates can move too. Existing fixed-rate loans usually keep their agreed rate.',
    exception: 'A cut made because the economy is deteriorating can scare investors and hurt crypto. An expected hike may barely move prices. Other countries’ policies also affect the dollar.',
    sources: [{ label: 'Federal Reserve: the FOMC', url: 'https://www.federalreserve.gov/monetarypolicy/fomc.htm' }],
  },
  {
    key: 'payrolls', title: 'Employment — jobs, wages and unemployment',
    description: 'The U.S. jobs report shows hiring, unemployment and wages. More jobs is generally a sign of strength. A higher unemployment rate is usually a sign of weakness, so “higher” does not mean the same thing for every number.',
    watch: 'Read job gains, unemployment, wage growth and revisions together. People entering or leaving the job market can also change the unemployment rate.',
    higher: { label: 'Hiring and wages are stronger than expected', crypto: 'Stronger incomes can help confidence, but investors may also expect rates to stay high. These effects can pull crypto in opposite directions.', gold: 'If stronger jobs push expected rates and the dollar up, gold can face pressure.' },
    lower: { label: 'Hiring weakens or unemployment rises unexpectedly', crypto: 'Hopes for rate cuts can help, but job losses and recession fears can reduce demand for risky investments.', gold: 'Lower expected rates and demand for safety can support gold.' },
    pocket: 'A stronger job market can improve job options and pay. A weaker one can put household income at risk. Pay rises only improve buying power if they beat your cost increases.',
    exception: 'Weak jobs are not automatically good for crypto. Gold can also fall if investors sell assets to raise cash. Revisions can change the first impression.',
    sources: [{ label: 'BLS: Employment Situation', url: 'https://www.bls.gov/news.release/empsit.toc.htm' }, { label: 'BLS: unemployment definitions', url: 'https://www.bls.gov/cps/definitions.htm' }],
  },
  {
    key: 'ppi', title: 'PPI — prices received by producers',
    description: 'The Producer Price Index tracks selling prices received by U.S. producers for goods and services. It can offer an early clue about price pressure before it reaches households.',
    watch: 'Check which industries changed, whether the move is broad, and whether businesses pass costs on to customers.',
    higher: { label: 'Producer-price inflation is hotter than expected', crypto: 'If investors think consumer inflation will follow, expectations of higher rates can weigh on crypto.', gold: 'Gold may face pressure if inflation concerns lead to higher interest rates after inflation and a stronger dollar.' },
    lower: { label: 'Producer-price inflation is cooler than expected', crypto: 'Reduced inflation pressure can support hopes for lower rates and help crypto.', gold: 'If the result lowers expected rates, it can support gold.' },
    pocket: 'Rising producer prices may eventually reach food, deliveries and other bills. Businesses may instead absorb some increases by accepting smaller profits.',
    exception: 'PPI does not translate directly into CPI. Imports, productivity, company profits and the mix of goods and services can change how much reaches consumers.',
    sources: [{ label: 'BLS: PPI overview', url: 'https://www.bls.gov/ppi/overview.htm' }],
  },
  {
    key: 'gdp', title: 'GDP — how fast the economy is growing',
    description: 'Gross Domestic Product measures goods and services produced in an economy. Real GDP growth removes the effect of price rises, helping show whether actual output is growing or shrinking.',
    watch: 'Compare growth with expectations and read what drove it. Consumer spending, business investment, trade and stock held by businesses can tell different stories.',
    higher: { label: 'Real growth is stronger than expected', crypto: 'Better business prospects can encourage risk-taking, but fewer expected rate cuts can work against crypto.', gold: 'Less demand for safety and higher expected rates can put pressure on gold.' },
    lower: { label: 'Real growth slows more than expected or shrinks', crypto: 'Lower-rate hopes can help, but recession fears and tighter household budgets can hurt crypto.', gold: 'Demand for safety and lower expected rates can support gold.' },
    pocket: 'Growth can support hiring, business sales and income. A slowdown can weaken those opportunities. GDP growth does not mean every household is better off.',
    exception: 'One weak quarter is not the whole economy. Revisions or a temporary change in imports or business stock can alter the headline. Markets may already expect the slowdown.',
    sources: [{ label: 'BEA: understanding GDP', url: 'https://www.bea.gov/resources/learning-center/what-to-know-gdp' }],
  },
  {
    key: 'yields', title: 'Bond yields — the return offered by bonds',
    description: 'A bond yield is the return a bond offers at its current price. For gold, the return left after expected inflation matters especially: earning 4% when prices are expected to rise 3% leaves roughly 1%.',
    watch: 'Ask whether yields rose because of stronger growth, more inflation, or a change in expected interest rates. Bond prices generally fall when yields rise.',
    higher: { label: 'Returns after expected inflation rise', crypto: 'Interest-paying assets can become more attractive compared with risky crypto.', gold: 'Holding gold means giving up a better interest return elsewhere, which can pressure its price.' },
    lower: { label: 'Returns after expected inflation fall', crypto: 'Investors may become more willing to take risk, which can help crypto.', gold: 'Giving up interest costs less, which can support gold.' },
    pocket: 'Higher bond yields can feed into new mortgage and business borrowing costs. They may also improve the return offered on new savings products.',
    exception: 'A rise in the quoted yield alone is not enough: if expected inflation rises faster, the return after inflation may fall. Credit fears can also push some bond yields up.',
    sources: [transmissionSources[1]],
  },
  {
    key: 'dollar', title: 'The U.S. dollar — exchange rates',
    description: 'A stronger dollar buys more foreign currency. Gold and many commodities are priced in dollars, so exchange-rate moves can change their cost for buyers in other countries.',
    watch: 'Check the dollar against the currency you actually use. A dollar-based asset return can differ from the return in your home currency.',
    higher: { label: 'The dollar strengthens', crypto: 'A stronger dollar can accompany tighter borrowing conditions or a move away from risk, both possible pressures on crypto.', gold: 'Gold becomes more expensive in other currencies if its dollar price is unchanged. That can reduce demand and weigh on its dollar price.' },
    lower: { label: 'The dollar weakens', crypto: 'Easier financial conditions may help crypto, although the dollar alone does not determine its price.', gold: 'Gold becomes cheaper for some overseas buyers, which can support demand.' },
    pocket: 'A stronger dollar can make dollar-priced imports, fuel and dollar debt more expensive for people earning in weaker currencies. U.S. buyers may pay less for some imports.',
    exception: 'Gold and the dollar can rise together when people seek safety. Local taxes, exchange-rate rules and trade costs affect what reaches your bill.',
    sources: [{ label: 'Federal Reserve: exchange-rate data', url: 'https://www.federalreserve.gov/releases/h10/current/' }, transmissionSources[0]],
  },
  {
    key: 'oil', title: 'Oil — fuel and transport costs',
    description: 'Oil is used to make petrol, diesel and other products. Its price reflects demand, available supply and the risk that production or shipping will be disrupted.',
    watch: 'Ask why the price changed: a supply shortage and a growing economy can both lift oil, but have different consequences.',
    higher: { label: 'Oil rises, especially after a supply disruption', crypto: 'Higher living costs and inflation concerns can reduce money available for risky investments and delay rate cuts.', gold: 'Inflation fears and demand for safety can help gold, while higher expected interest rates can work against it.' },
    lower: { label: 'Oil falls', crypto: 'Cheaper energy can ease inflation and help confidence. If oil fell because demand collapsed, recession fears can outweigh that benefit.', gold: 'Lower inflation pressure may reduce demand for an inflation hedge; lower expected rates may instead support gold.' },
    pocket: 'Petrol, diesel, delivery, flights and some heating costs can change. The effect takes time and depends on refining costs, taxes, the exchange rate and suppliers’ pricing.',
    exception: 'Oil and pump prices do not move one-for-one or on the same day. Countries that export oil can lose income when oil prices fall.',
    sources: [{ label: 'EIA: what drives crude oil prices', url: 'https://www.eia.gov/finance/markets/crudeoil/' }, { label: 'EIA: factors affecting gasoline prices', url: 'https://www.eia.gov/energyexplained/gasoline/factors-affecting-gasoline-prices.php' }],
  },
  {
    key: 'geopolitics', title: 'Geopolitics — conflict, trade and shipping',
    description: 'Wars, sanctions, trade disputes and disruption to shipping can affect supplies, confidence and the cost of doing business, even far from the event.',
    watch: 'Check confirmed reports and the actual connection to energy, food, trade routes or payments. A dramatic headline alone does not show how large the economic effect will be.',
    higher: { label: 'Disruption or uncertainty increases', crypto: 'Investors may sell risky assets to keep cash available. Crypto can fall; it should not be assumed to provide safety in a crisis.', gold: 'Demand for a familiar store of value can support gold, although a stronger dollar or urgent selling can offset that.' },
    lower: { label: 'Tensions ease or supply routes reopen', crypto: 'Improved confidence can support risk-taking, if other economic conditions cooperate.', gold: 'Some demand for safety may fade. Other drivers, including interest rates, still matter.' },
    pocket: 'Disrupted fuel or food supplies and longer shipping routes can raise transport, grocery and energy bills. Trade barriers can increase import costs; affected businesses may face delays or lost sales.',
    exception: 'The effect differs by country, supply chain and household. Do not assume every conflict raises oil or every peace headline lowers gold. Confirm what changed before drawing a conclusion.',
    sources: [{ label: 'EIA: oil transit chokepoints', url: 'https://www.eia.gov/international/analysis/special-topics/World_Oil_Transit_Chokepoints' }, { label: 'UN Geneva: news and primary briefings', url: 'https://www.ungeneva.org/en/news-media' }, transmissionSources[1]],
  },
]

export function backgroundForEvent(kind: EventKind) { return marketBackgrounds.find(item => item.key === kind)! }

/** Shared exact copy for the site, draft editions and the editorial review packet. */
export function backgroundDraftBlocks(keys: BackgroundKey[] = marketBackgrounds.map(item => item.key)) {
  return [
    { type: 'heading', text: 'Market background in plain English' },
    ...backgroundNotes.map(text => ({ type: 'paragraph', text })),
    ...marketBackgrounds.filter(item => keys.includes(item.key)).flatMap(item => [
      { type: 'heading', text: item.title },
      { type: 'paragraph', text: item.description },
      { type: 'paragraph', text: `${item.higher.label}. Crypto: ${item.higher.crypto} Gold: ${item.higher.gold}` },
      { type: 'paragraph', text: `${item.lower.label}. Crypto: ${item.lower.crypto} Gold: ${item.lower.gold}` },
      { type: 'paragraph', text: `Your pocket: ${item.pocket}` },
      { type: 'paragraph', text: `Why it can go the other way: ${item.exception}` },
      { type: 'paragraph', text: `What to check: ${item.watch}` },
      { type: 'paragraph', text: `Sources: ${item.sources.map(source => source.label + ' — ' + source.url).join('; ')}` },
    ]),
    { type: 'paragraph', text: 'These possible market effects are KAPORAL educational interpretations. Definitions come from the linked agencies. Research on gold and Bitcoin describes observed relationships, not a promise about the next release. ' + transmissionSources.map(source => source.label + ' — ' + source.url).join('; ') },
  ]
}
