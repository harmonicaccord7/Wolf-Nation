export type DeskSlug = 'markets'|'bitcoin'|'crypto'|'macro'|'options'|'africa'|'business'|'technology'|'learn'

export type DeskConfig = {
  slug: DeskSlug
  eyebrow: string
  title: string
  summary: string
  question: string
  seriesCodes?: string[]
  cryptoSymbols?: string[]
  allDeskSeries?: boolean
  coverage: string[]
  sourceNote: string
}

export const deskConfigs: Record<DeskSlug, DeskConfig> = {
  markets: {
    slug:'markets', eyebrow:'GLOBAL MARKETS', title:'Cross-asset intelligence, connected.',
    summary:'Track equities, the dollar, rates and commodities together so price moves are read in context rather than isolation.',
    question:'What is moving risk, liquidity and capital across asset classes right now?',
    seriesCodes:['SPX','NASDAQ','DXY','GOLD','WTI','US10Y','BROAD_DOLLAR'], cryptoSymbols:['BTC','ETH'],
    coverage:['U.S. and global equities','Dollar and FX regimes','Treasury yields','Gold and energy','Cross-asset correlations','Liquidity transmission'],
    sourceNote:'Market observations are source-labelled. Some series are official closes or spot observations rather than tick-by-tick quotes.'
  },
  bitcoin: {
    slug:'bitcoin', eyebrow:'BITCOIN INTELLIGENCE', title:'Bitcoin through the macro, flow and derivatives lens.',
    summary:'Price is only one layer. We connect Bitcoin to liquidity, ETF flows, rates, the dollar, derivatives positioning and the broader cycle.',
    question:'What is actually driving Bitcoin, and what would invalidate the current interpretation?',
    seriesCodes:['BTC_ETF_FLOW','US10Y','BROAD_DOLLAR','M2_US','BTC_OPTIONS_IV','BTC_PUT_CALL_OI'], cryptoSymbols:['BTC'],
    coverage:['Cycle structure','ETF flows','Macro liquidity','Derivatives positioning','Institutional adoption','Regulation and market structure'],
    sourceNote:'ETF flow is displayed only when an authorized provider feed is available. Missing data is never replaced with an estimate.'
  },
  crypto: {
    slug:'crypto', eyebrow:'DIGITAL ASSETS', title:'Crypto without the noise.',
    summary:'A research desk for digital assets, stablecoins, tokenization, DeFi, market structure and regulation—anchored in verifiable data.',
    question:'Which crypto developments are structural, and which are merely narrative momentum?',
    seriesCodes:['BROAD_DOLLAR','M2_US','BTC_OPTIONS_IV'], cryptoSymbols:['BTC','ETH','SOL'],
    coverage:['Bitcoin and major digital assets','Stablecoins and payments','Tokenization','DeFi and market structure','Regulation','Institutional flows'],
    sourceNote:'Spot prices are ingested from a verified external provider and stored with timestamps and provenance.'
  },
  macro: {
    slug:'macro', eyebrow:'MACRO INTELLIGENCE', title:'Rates, liquidity and the economic regime.',
    summary:'Follow the Federal Reserve, Treasury yields, inflation, labor, money supply and the dollar as one connected macro system.',
    question:'Which macro variables are changing the cost of capital and risk appetite?',
    seriesCodes:['FED_FUNDS','US2Y','US10Y','CPI_US','UNEMP_US','M2_US','FED_BALANCE_SHEET','BROAD_DOLLAR'],
    coverage:['Federal Reserve policy','Treasury yields','Inflation','Employment','Money supply','Central-bank balance sheet','Dollar regime'],
    sourceNote:'Core U.S. macro series are sourced through Federal Reserve Economic Data (FRED) and retain the original observation date.'
  },
  options: {
    slug:'options', eyebrow:'OPTIONS & DERIVATIVES', title:'Understand volatility before direction.',
    summary:'Live derivatives structure for education and research: open interest, put/call positioning, implied volatility and volume.',
    question:'What does the options market reveal about positioning, volatility and asymmetric risk?',
    seriesCodes:['BTC_OPTIONS_OI','BTC_PUT_CALL_OI','BTC_OPTIONS_IV','BTC_OPTIONS_VOLUME'], cryptoSymbols:['BTC'],
    coverage:['Calls and puts','Open interest','Implied volatility','Put/call positioning','Expiration mechanics','Greeks and volatility education'],
    sourceNote:'Current BTC options aggregates are calculated from Deribit public market summaries. Educational analytics only—not personalized trade instructions.'
  },
  africa: {
    slug:'africa', eyebrow:'AFRICA INTELLIGENCE', title:'Africa is a first-class intelligence desk.',
    summary:'Compare growth, inflation, currencies and reserves across major African economies while connecting local conditions to global macro forces.',
    question:'How do global shocks transmit into African markets, businesses, currencies and opportunity?',
    allDeskSeries:true,
    coverage:['Nigeria','South Africa','Egypt','Morocco','Kenya','Ghana','Côte d’Ivoire','Cameroon','WAEMU / BRVM expansion','Fintech, trade and infrastructure'],
    sourceNote:'The first live macro layer uses World Bank indicators. Exchange, central-bank, sovereign-debt and regional-market feeds are being added provider by provider.'
  },
  business: {
    slug:'business', eyebrow:'BUSINESS & OPPORTUNITY', title:'From market change to commercial consequence.',
    summary:'Translate macro, financing, currency, energy and market shifts into sector-level business risks and opportunities.',
    question:'Who gains, who loses, and where does a changing environment create a durable opening?',
    seriesCodes:['SPX','US10Y','DXY','WTI','M2_US'],
    coverage:['Business-model shifts','Financing conditions','Supply chains','M&A','Industrial policy','Market entry','Sector opportunity and risk'],
    sourceNote:'Business analysis uses live market and macro inputs as evidence; opportunity conclusions require editorial research and human review.'
  },
  technology: {
    slug:'technology', eyebrow:'TECHNOLOGY INTELLIGENCE', title:'Technology as capital, infrastructure and strategy.',
    summary:'Follow AI, semiconductors, robotics, energy systems and cyber through both technological change and the capital cycle funding it.',
    question:'Which technologies are becoming strategically important, economically viable and investable at scale?',
    seriesCodes:['NASDAQ','SPX','US10Y','M2_US'],
    coverage:['Artificial intelligence','Semiconductors','Robotics','Energy systems','Cybersecurity','Strategic infrastructure','Industrial technology'],
    sourceNote:'Live market proxies provide context; technical claims and industry conclusions require dedicated source-backed research.'
  },
  learn: {
    slug:'learn', eyebrow:'KAPORAL LEARN', title:'Build the mental model before using the dashboard.',
    summary:'A structured learning layer from first principles to advanced market mechanics, designed to make the research understandable without diluting it.',
    question:'What must a reader understand before interpreting the data responsibly?',
    coverage:['Markets 101','Bitcoin 101','Macro foundations','Options and Greeks','Inflation and liquidity','Risk and probability','How to read evidence','How KAPORAL builds scenarios'],
    sourceNote:'Educational material explains concepts and research methods. It is not personalized financial advice.'
  }
}
