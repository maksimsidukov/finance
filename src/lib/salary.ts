import { taxOnCumulative } from '@/lib/ndfl'
import {
  hasExactData,
  paymentDate,
  workingDaysInMonth,
  workingDaysInRange,
} from '@/lib/workCalendar'

export interface SalaryBonus {
  id: string
  date: string // ГГГГ-ММ-ДД в местном календаре
  gross: number
}

export interface SalarySettings {
  /** Оклад до НДФЛ, ₽/мес */
  grossSalary: number
  /** День выплаты аванса (1–31) */
  advanceDay: number
  /** День выплаты расчёта (1–31) */
  salaryDay: number
  /** Расчёт приходит в текущем (0) или следующем (1) месяце */
  salaryMonthOffset: 0 | 1
  /** Как считать аванс: пропорционально отработанным дням 1–15 или фикс. % от оклада */
  advanceMode: 'days' | 'percent'
  /** Процент оклада для режима 'percent' */
  advancePercent: number
  bonuses: SalaryBonus[]
}

export const DEFAULT_SALARY_SETTINGS: SalarySettings = {
  grossSalary: 150_000,
  advanceDay: 20,
  salaryDay: 5,
  salaryMonthOffset: 1,
  advanceMode: 'days',
  advancePercent: 40,
  bonuses: [],
}

interface GrossPayout {
  id: string
  date: Date
  kind: 'Аванс' | 'Расчёт' | 'Премия'
  shifted: boolean
  gross: number
  approximateCalendar: boolean
}

export interface PayoutInfo extends GrossPayout {
  tax: number
  net: number
}

function monthlyPayouts(settings: SalarySettings, year: number, month: number): GrossPayout[] {
  const { grossSalary } = settings
  const advanceGross =
    settings.advanceMode === 'days'
      ? Math.round(grossSalary * workingDaysInRange(year, month, 1, 15) / workingDaysInMonth(year, month))
      : Math.round((grossSalary * settings.advancePercent) / 100)
  const advance = paymentDate(year, month, settings.advanceDay, 0)
  const salary = paymentDate(year, month, settings.salaryDay, settings.salaryMonthOffset)
  return [
    {
      ...advance,
      id: `advance-${year}-${month}`,
      kind: 'Аванс',
      gross: advanceGross,
      approximateCalendar: !hasExactData(year) || !hasExactData(advance.date.getFullYear()),
    },
    {
      ...salary,
      id: `salary-${year}-${month}`,
      kind: 'Расчёт',
      gross: grossSalary - advanceGross,
      approximateCalendar: !hasExactData(year) || !hasExactData(salary.date.getFullYear()),
    },
  ]
}

export function calcPayouts(settings: SalarySettings, currentYear: number): PayoutInfo[] {
  const bonuses = settings.bonuses.map((bonus): GrossPayout => ({
    ...bonus,
    date: new Date(`${bonus.date}T00:00:00`),
    kind: 'Премия',
    shifted: false,
    approximateCalendar: false,
  }))
  const years = new Set([currentYear, currentYear + 1, ...bonuses.map((bonus) => bonus.date.getFullYear())])

  return [...years].sort((a, b) => a - b).flatMap((year) => {
    // Декабрьский расчёт может прийти в январе, а январская выплата — в предыдущем декабре.
    const regular = Array.from({ length: 14 }, (_, index) => {
      const month = new Date(year, index - 1, 1)
      return monthlyPayouts(settings, month.getFullYear(), month.getMonth())
    }).flat()
    const payouts = [...regular, ...bonuses]
      .filter((payout) => payout.gross > 0 && payout.date.getFullYear() === year)
      .sort((a, b) => a.date.getTime() - b.date.getTime())

    let grossCents = 0
    let cumulativeTax = 0
    return payouts.map((payout) => {
      const payoutCents = Math.round(payout.gross * 100)
      grossCents += payoutCents
      const nextTax = taxOnCumulative(grossCents / 100)
      const tax = nextTax - cumulativeTax
      cumulativeTax = nextTax
      return { ...payout, tax, net: (payoutCents - tax * 100) / 100 }
    })
  })
}

export function summarizePayouts(payouts: PayoutInfo[]) {
  const totals = payouts.reduce(
    (sum, payout) => ({
      grossCents: sum.grossCents + Math.round(payout.gross * 100),
      tax: sum.tax + payout.tax,
    }),
    { grossCents: 0, tax: 0 },
  )
  return { gross: totals.grossCents / 100, tax: totals.tax, net: (totals.grossCents - totals.tax * 100) / 100 }
}
