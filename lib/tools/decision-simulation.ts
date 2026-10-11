export type DecisionInputs = {
  price: number; budget: number; feePercent: number; movePercent: number;
  stagedPrice: number; strike: number; premium: number; contractUnits: number;
}
export type DecisionOutcome = {
  strategy: 'buy' | 'wait' | 'stage' | 'call' | 'put'; label: string;
  units: number; contracts: number | null; committed: number; cash: number;
  finalValue: number; profit: number; fees: number; maximumLoss: number;
  breakEven: number | null; available: boolean;
}

/** Arithmetic scenarios, with no probabilities, forecast or trade selection. */
export function decisionInputError(input: DecisionInputs): string | null {
  if (Object.values(input).some(value => !Number.isFinite(value))) return 'Enter a number in every field.'
  if (input.price < 1e-8 || input.price > 1e9) return 'The reference price must be at least 0.00000001 and at most 1 billion.'
  if (input.budget < .01 || input.budget > 1e9) return 'The budget must be at least 0.01 and at most 1 billion.'
  if (input.feePercent < 0 || input.feePercent > 10) return 'The fee must be between 0% and 10%.'
  if (input.movePercent < -100 || input.movePercent > 1000) return 'The final price change must be between −100% and +1,000%.'
  if (input.stagedPrice < 1e-8 || input.stagedPrice > 1e9 || input.strike < 1e-8 || input.strike > 1e9 || input.premium < 1e-8 || input.premium > 1e9) return 'The staged price, strike and premium must be at least 0.00000001 and at most 1 billion.'
  if (!Number.isInteger(input.contractUnits) || input.contractUnits < 1 || input.contractUnits > 10000) return 'Contract units must be a whole number between 1 and 10,000.'
  return null
}

export function simulateDecision(input: DecisionInputs): DecisionOutcome[] {
  const error = decisionInputError(input)
  if (error) throw new Error(error)
  const { price, budget, movePercent, stagedPrice, strike, premium, contractUnits } = input
  const fee = input.feePercent / 100, finalPrice = price * (1 + movePercent / 100)
  const buyUnits = budget / (price * (1 + fee))
  const stageUnits = budget / 2 / (price * (1 + fee)) + budget / 2 / (stagedPrice * (1 + fee))
  function exposure(strategy: 'buy' | 'stage', label: string, units: number): DecisionOutcome {
    const value = units * finalPrice, finalValue = value * (1 - fee)
    return { strategy, label, units, contracts: null, committed: budget, cash: 0,
      finalValue, profit: finalValue - budget, fees: budget * fee / (1 + fee) + value * fee,
      maximumLoss: budget, breakEven: budget / (units * (1 - fee)), available: true }
  }
  function option(strategy: 'call' | 'put', label: string): DecisionOutcome {
    const contracts = Math.floor(budget / (premium * contractUnits * (1 + fee)))
    const units = contracts * contractUnits, committed = units * premium * (1 + fee)
    const cash = budget - committed, intrinsic = strategy === 'call' ? Math.max(finalPrice - strike, 0) : Math.max(strike - finalPrice, 0)
    const gross = units * intrinsic, finalValue = cash + gross * (1 - fee)
    const requiredMove = premium * (1 + fee) / (1 - fee)
    return { strategy, label, units, contracts, committed, cash, finalValue,
      profit: finalValue - budget, fees: units * premium * fee + gross * fee, maximumLoss: committed,
      breakEven: strategy === 'call' ? strike + requiredMove : strike - requiredMove, available: contracts > 0 }
  }
  return [exposure('buy', 'Buy now', buyUnits),
    { strategy: 'wait', label: 'Wait in cash', units: 0, contracts: null, committed: 0, cash: budget,
      finalValue: budget, profit: 0, fees: 0, maximumLoss: 0, breakEven: null, available: true },
    exposure('stage', 'Buy in two stages', stageUnits), option('call', 'Buy a call'), option('put', 'Buy a put')]
}
