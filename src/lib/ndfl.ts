/**
 * Прогрессивная шкала НДФЛ (основная налоговая база: зарплата, премии, ГПХ).
 * Федеральный закон от 12.07.2024 № 176-ФЗ, действует с 01.01.2025.
 *
 * Ступени по годовому доходу нарастающим итогом:
 *   до 2,4 млн ₽        — 13%
 * 2,4–5 млн ₽   — 312 000 ₽ + 15% с превышения
 * 5–20 млн ₽   — 702 000 ₽ + 18% с превышения
 * 20–50 млн ₽  — 3 402 000 ₽ + 20% с превышения
 * свыше 50 млн ₽ — 9 402 000 ₽ + 22% с превышения
 */

interface Bracket {
  /** нижняя граница ступени (не включительно) */
  from: number
  /** твёрдая сумма налога на всё, что ниже ступени */
  base: number
  rate: number
}

const BRACKETS: Bracket[] = [
  { from: 0, base: 0, rate: 0.13 },
  { from: 2_400_000, base: 312_000, rate: 0.15 },
  { from: 5_000_000, base: 702_000, rate: 0.18 },
  { from: 20_000_000, base: 3_402_000, rate: 0.2 },
  { from: 50_000_000, base: 9_402_000, rate: 0.22 },
]

/** НДФЛ с суммы годового дохода нарастающим итогом, в полных рублях (ст. 225 НК) */
export function taxOnCumulative(annualIncome: number): number {
  if (annualIncome <= 0) return 0
  let tax = 0
  for (const b of BRACKETS) {
    if (annualIncome > b.from) tax = b.base + (annualIncome - b.from) * b.rate
    else break
  }
  return Math.round(tax)
}

/**
 * НДФЛ за конкретный месяц при равномерной зарплате:
 * разница налога нарастающим итогом на конец и на начало месяца.
 * @param monthIndex 0 = январь
 */
export function taxForMonth(monthlyGross: number, monthIndex: number): number {
  return taxOnCumulative(monthlyGross * (monthIndex + 1)) - taxOnCumulative(monthlyGross * monthIndex)
}

/** НДФЛ с части дохода (например, аванса) внутри месяца — нарастающим итогом */
export function taxForSlice(monthlyGross: number, monthIndex: number, sliceFrom: number, sliceTo: number): number {
  const base = monthlyGross * monthIndex
  return taxOnCumulative(base + sliceTo) - taxOnCumulative(base + sliceFrom)
}

/** Маржинальная ставка НДФЛ при данном годовом доходе */
export function marginalRate(annualIncome: number): number {
  for (let i = BRACKETS.length - 1; i >= 0; i--) {
    if (annualIncome > BRACKETS[i].from) return BRACKETS[i].rate
  }
  return BRACKETS[0].rate
}

/** Эффективная ставка за год */
export function effectiveRate(annualIncome: number): number {
  if (annualIncome <= 0) return 0
  return taxOnCumulative(annualIncome) / annualIncome
}
