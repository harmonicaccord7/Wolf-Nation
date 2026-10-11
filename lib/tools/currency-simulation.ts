export type CurrencyInputs = { budgetUsd: number; entryRate: number; exitRate: number; localReturnPercent: number; inflationPercent: number; years: number; feePercent: number }
export function currencyInputError(input: CurrencyInputs): string | null {
  if(Object.values(input).some(value=>!Number.isFinite(value)))return 'Enter a number in every field.'
  if(input.budgetUsd < .01 || input.budgetUsd > 1e9)return 'The USD budget must be between 0.01 and 1 billion.'
  if(input.entryRate < 1e-8 || input.exitRate < 1e-8 || input.entryRate > 1e9 || input.exitRate > 1e9)return 'Both exchange rates must be positive and no greater than 1 billion.'
  if(input.localReturnPercent < -100 || input.localReturnPercent > 1000)return 'The local return must be between −100% and +1,000%.'
  if(input.inflationPercent < -50 || input.inflationPercent > 1000)return 'Annual inflation must be between −50% and +1,000%.'
  if(input.years < 1 || input.years > 20)return 'The horizon must be between 1 and 20 years.'
  if(input.feePercent < 0 || input.feePercent > 10)return 'The fee must be between 0% and 10%.'
  return null
}
export function simulateCurrency(input: CurrencyInputs) {
  const error=currencyInputError(input);if(error)throw new Error(error)
  const fee=input.feePercent/100,initialLocal=input.budgetUsd*input.entryRate
  const investedLocal=initialLocal*(1-fee),grossFinalLocal=investedLocal*(1+input.localReturnPercent/100)
  const finalLocal=grossFinalLocal*(1-fee),finalUsd=finalLocal/input.exitRate
  const inflationFactor=(1+input.inflationPercent/100)**input.years
  return {initialLocal,investedLocal,finalLocal,finalUsd,profitUsd:finalUsd-input.budgetUsd,
    usdReturnPercent:(finalUsd/input.budgetUsd-1)*100,
    netLocalReturnPercent:(finalLocal/initialLocal-1)*100,
    realLocalReturnPercent:(finalLocal/initialLocal/inflationFactor-1)*100,
    feesLocal:initialLocal*fee+grossFinalLocal*fee,
    currencyChangePercent:(input.exitRate/input.entryRate-1)*100}
}
