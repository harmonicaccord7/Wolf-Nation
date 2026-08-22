export const markets = [
  ['BTC', '$78,420', '+2.4%', 'up'], ['ETH', '$3,620', '+1.7%', 'up'],
  ['S&P 500', '6,744', '+0.3%', 'up'], ['NASDAQ', '23,105', '-0.2%', 'down'],
  ['DXY', '98.7', '-0.4%', 'down'], ['US 10Y', '4.31%', '+5bp', 'up'],
  ['GOLD', '$3,412', '+0.6%', 'up'], ['BRENT', '$76.20', '-1.1%', 'down'],
] as const;

export const signals = [
  ['Macro', 'Neutral', '52', 'amber'], ['Liquidity', 'Improving', '68', 'green'],
  ['Crypto', 'Constructive', '64', 'green'], ['Volatility', 'Elevated', '71', 'red'],
  ['Africa', 'Selective', '61', 'green'], ['Geopolitics', 'High risk', '76', 'red'],
] as const;
