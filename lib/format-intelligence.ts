export function formatIntelligenceValue(value:number|null|undefined,unit?:string|null){
  if(value===null||value===undefined||Number.isNaN(value)) return '—'
  const compact=new Intl.NumberFormat('en-US',{notation:'compact',maximumFractionDigits:2})
  const normal=new Intl.NumberFormat('en-US',{maximumFractionDigits:2})
  if(unit==='%') return `${normal.format(value)}%`
  if(unit==='ratio') return value.toFixed(2)
  if(unit==='USD/oz') return `$${normal.format(value)}/oz`
  if(unit==='USD/barrel') return `$${normal.format(value)}/bbl`
  if(unit==='USD') return `$${compact.format(value)}`
  if(unit==='USD billions') return `$${normal.format(value)}B`
  if(unit==='USD millions') return `$${compact.format(value*1_000_000)}`
  if(unit==='BTC contracts') return `${compact.format(value)} BTC`
  if(unit==='BTC') return `${normal.format(value)} BTC`
  if(unit==='LCU per USD') return normal.format(value)
  if(unit==='index') return normal.format(value)
  return `${normal.format(value)}${unit?` ${unit}`:''}`
}

export function formatObservationDate(value?:string|null,frequency?:string|null){
  if(!value) return 'No verified observation yet'
  const date=new Date(value)
  if(Number.isNaN(date.getTime())) return value
  if(frequency==='market') return new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'UTC',timeZoneName:'short'}).format(date)
  return new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'short',year:'numeric',timeZone:'UTC'}).format(date)
}

export function formatCryptoPrice(value:number|null|undefined){
  if(value===null||value===undefined) return '—'
  return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:value>=1000?0:2}).format(value)
}
