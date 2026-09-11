export type EventKind = 'cpi' | 'pce' | 'fomc' | 'payrolls' | 'ppi' | 'gdp'
export type EconomicEvent = {
  id: string; slug: string; kind: EventKind; title: string; scheduledAt: string;
  precision: 'minute' | 'date'; timezone: string; provider: string; sourceUrl: string;
  checkedAt: string; sequence: number; status: 'scheduled' | 'cancelled';
}
export const calendarSources = {
  bls: 'https://www.bls.gov/schedule/news_release/bls.ics',
  bea: 'https://www.bea.gov/news/schedule/ics/online-calendar-subscription.ics',
  fed: 'https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm',
} as const

// Convert a wall-clock value using the provider's named timezone, including DST.
export function wallClockToISO(year: number, month: number, day: number, hour = 0, minute = 0, timezone = 'America/New_York') {
  const wall = Date.UTC(year, month - 1, day, hour, minute)
  let guess = wall
  for (let i = 0; i < 3; i++) {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(guess)
    const value = (key: string) => Number(parts.find(p => p.type === key)?.value)
    const represented = Date.UTC(value('year'), value('month') - 1, value('day'), value('hour'), value('minute'))
    const next = guess + wall - represented
    if (next === guess) break
    guess = next
  }
  return new Date(guess).toISOString()
}

function kindOf(title: string): EventKind | null {
  if (/^Consumer Price Index\b/i.test(title)) return 'cpi'
  if (/^Producer Price Index\b/i.test(title)) return 'ppi'
  if (/^Employment Situation\b/i.test(title)) return 'payrolls'
  if (/^Personal Income and Outlays\b/i.test(title)) return 'pce'
  if (/^(Gross Domestic Product|GDP \()/i.test(title) && !/by (County|State)/i.test(title)) return 'gdp'
  return null
}

export function parseICS(text: string, provider: 'BLS' | 'BEA', checkedAt: string): EconomicEvent[] {
  const sourceUrl = provider === 'BLS' ? calendarSources.bls : calendarSources.bea
  const blocks = text.replace(/\r?\n[ \t]/g, '').split('BEGIN:VEVENT').slice(1)
  const events: EconomicEvent[] = []
  for (const block of blocks) {
    const lines = block.split(/\r?\n/)
    const field = (name: string) => lines.find(line => line.startsWith(name + ':') || line.startsWith(name + ';'))
    const value = (name: string) => field(name)?.replace(/^[^:]+:/, '').replace(/\\n/gi, ' ').replace(/\\([,;\\])/g, '$1').trim() ?? ''
    const title = value('SUMMARY'), kind = kindOf(title)
    const start = value('DTSTART').match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/)
    if (!kind || !start || !value('UID')) continue
    const timezone = /TZID=([^:;]+)/.exec(field('DTSTART') ?? '')?.[1] ?? 'America/New_York'
    const zone = ['US-Eastern', 'US/Eastern', 'Eastern Standard Time'].includes(timezone) ? 'America/New_York' : timezone
    const [y, m, d, h, min] = start.slice(1, 6).map(v => Number(v || 0))
    let scheduledAt: string
    try { scheduledAt = start[7] ? new Date(Date.UTC(y, m - 1, d, h, min)).toISOString() : wallClockToISO(y, m, d, h, min, zone) } catch { continue }
    events.push({ id: `${provider.toLowerCase()}:${value('UID')}`, slug: `${kind}-${start[1]}-${start[2]}-${start[3]}`, kind, title,
      scheduledAt, precision: start[4] ? 'minute' : 'date', timezone: 'America/New_York', provider, sourceUrl, checkedAt,
      sequence: Number(value('SEQUENCE') || 0), status: value('STATUS') === 'CANCELLED' ? 'cancelled' : 'scheduled' })
  }
  const unique = new Map<string, EconomicEvent>()
  for (const event of events) if ((unique.get(event.id)?.sequence ?? -1) <= event.sequence) unique.set(event.id, event)
  return [...unique.values()].sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
}

const monthNumber: Record<string, number> = { January: 1, February: 2, March: 3, April: 4, May: 5, June: 6, July: 7, August: 8, September: 9, October: 10, November: 11, December: 12 }
export function parseFedCalendar(html: string, checkedAt: string): EconomicEvent[] {
  const sections = [...html.matchAll(/(20\d{2}) FOMC Meetings/g)]
  const events: EconomicEvent[] = []
  for (let i = 0; i < sections.length; i++) {
    const year = Number(sections[i][1])
    const section = html.slice(sections[i].index, sections[i + 1]?.index ?? html.length)
    const rows = section.split(/<div class="(?:fomc-meeting--shaded )?row fomc-meeting"[^>]*>/).slice(1)
    for (const row of rows) {
      const monthText = /fomc-meeting__month[^>]*>\s*<strong>([^<]+)<\/strong>/.exec(row)?.[1]
      const dateText = /fomc-meeting__date[^>]*>\s*([^<]+)/.exec(row)?.[1]?.trim()
      if (!monthText || !dateText || /unscheduled/i.test(row.slice(0, 300))) continue
      const months = monthText.split(/[\/–-]/).map(m => m.trim())
      const month = monthNumber[months.at(-1) ?? '']
      const day = Number(dateText.match(/^(\d+)/)?.[1])
      if (!month || !day || day > 31) continue
      const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      events.push({ id: `fed:fomc:${date}`, slug: `fomc-${date}`, kind: 'fomc', title: `FOMC policy decision${dateText.includes('*') ? ' and economic projections' : ''}`,
        scheduledAt: wallClockToISO(year, month, day), precision: 'date', timezone: 'America/New_York', provider: 'Federal Reserve', sourceUrl: calendarSources.fed,
        checkedAt, sequence: 0, status: 'scheduled' })
    }
  }
  return [...new Map(events.map(e => [e.id, e])).values()].sort((a,b) => a.scheduledAt.localeCompare(b.scheduledAt))
}

export function eventHasPassed(event: EconomicEvent, now: number) {
  return Date.parse(event.scheduledAt) + (event.precision === 'date' ? 24 * 3600_000 : 0) < now
}
