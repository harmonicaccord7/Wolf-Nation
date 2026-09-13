import type { EconomicEvent } from './events/calendar.ts'
import { backgroundDraftBlocks, backgroundVersion } from './events/background.ts'
export const newsletterBackgroundVersion = backgroundVersion
export function draftEdition(events: EconomicEvent[]) {
  return { blocks: [
    {type:'heading',text:'The next market events'},
    {type:'paragraph',text:'Review the releases below against your own time horizon and risk budget. Acting before an announcement exposes you to both the intended move and an adverse surprise.'},
    {type:'bullet_list',items:events.map(event=>event.title+' — '+new Intl.DateTimeFormat('en-GB',{dateStyle:'long',timeStyle:event.precision==='minute'?'short':undefined,timeZone:event.timezone}).format(new Date(event.scheduledAt))+' ('+event.timezone+(event.precision==='date'?'; time not specified':'')+')')},
    {type:'heading',text:'Buying, waiting or staging exposure'},
    {type:'paragraph',text:'Buying before a release creates exposure to an immediate move in either direction. Waiting gives more information but may mean missing a move or entering at a less attractive price. Staging divides the timing of exposure but adds costs and does not eliminate loss risk. Remaining uninvested preserves capital while carrying an opportunity cost. The final decision belongs to the reader.'},
    {type:'paragraph',text:'Compare the release with a timestamped, sourced expectation and examine components and revisions. An increase from last month is different from an upside surprise. No consensus value, forecast probability or guaranteed response is asserted in this edition.'},
    ...backgroundDraftBlocks([...new Set(events.map(event => event.kind))]),
    {type:'heading',text:'News and charts between editions'},
    {type:'paragraph',text:'Daily News brings together official finance, business, energy and geopolitical headlines, plus TradingView’s available Top Stories: https://www.kaporalintelligence.com/news . Read the source and check the date before acting.'},
    {type:'paragraph',text:'Optional charting tool: explore prices and watchlists on TradingView at https://www.tradingview.com/ . Plans and available data are set by TradingView.'},
  ] }
}
