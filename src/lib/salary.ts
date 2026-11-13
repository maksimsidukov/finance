import { taxForMonth, taxForSlice } from '@/lib/ndfl'
import { periodLabelForKey } from '@/lib/format'
import {
  hasExactData,
  paymentDate,
  workingDaysInMonth,
  workingDaysInRange,
} from '@/lib/workCalendar'

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
}

export const DEFAULT_SALARY_SETTINGS: SalarySettings = {
  grossSalary: 150_000,
  advanceDay: 20,
  salaryDay: 5,
  salaryMonthOffset: 1,
  advanceMode: 'days',
  advancePercent: 40,
}

export interface PayoutInfo {
  date: Date
  shifted: boolean
  gross: number
  tax: number
  net: number
}

export interface MonthSalary {
  year: number
  month: number // 0–11
  label: string
  workingDays: number
  advance: PayoutInfo
  salary: PayoutInfo
  gross: number
  tax: number
  net: number
  /** Календарь года приблизительный (нет постановления о переносах) */
  approximateCalendar: boolean
}

/** Расчёт одного месяца */
export function calcMonth(
  settings: SalarySettings,
  year: number,
  month: number,
): MonthSalary {
  const { grossSalary } = settings
  const wdTotal = workingDaysInMonth(year, month)
  const wdFirstHalf = workingDaysInRange(year, month, 1, 15)
  const monthIndex = month // нарастающий итог с января

  // Аванс (за 1–15 число)
  const advanceGross =
    settings.advanceMode === 'days'
      ? Math.round((grossSalary * wdFirstHalf) / wdTotal)
      : Math.round((grossSalary * settings.advancePercent) / 100)
  const advanceTax = taxForSlice(grossSalary, monthIndex, 0, advanceGross)
  const advancePay = paymentDate(year, month, settings.advanceDay, 0)

  // Расчёт (за 16 — конец месяца / остаток)
  const salaryGross = grossSalary - advanceGross
  const monthTax = taxForMonth(grossSalary, monthIndex)
  const salaryTax = monthTax - advanceTax
  const salaryPay = paymentDate(year, month, settings.salaryDay, settings.salaryMonthOffset)

  return {
    year,
    month,
    label: periodLabelForKey(`${year}-${String(month + 1).padStart(2, '0')}`),
    workingDays: wdTotal,
    advance: {
      date: advancePay.date,
      shifted: advancePay.shifted,
      gross: advanceGross,
      tax: advanceTax,
      net: advanceGross - advanceTax,
    },
    salary: {
      date: salaryPay.date,
      shifted: salaryPay.shifted,
      gross: salaryGross,
      tax: salaryTax,
      net: salaryGross - salaryTax,
    },
    gross: grossSalary,
    tax: monthTax,
    net: grossSalary - monthTax,
    approximateCalendar:
      !hasExactData(year) ||
      (settings.salaryMonthOffset === 1 && !hasExactData(salaryPay.date.getFullYear())),
  }
}

/** Расчёт на 12 месяцев вперёд от указанной даты */
export function calcYearAhead(settings: SalarySettings, from = new Date()): MonthSalary[] {
  const result: MonthSalary[] = []
  for (let i = 0; i < 12; i++) {
    const d = new Date(from.getFullYear(), from.getMonth() + i, 1)
    result.push(calcMonth(settings, d.getFullYear(), d.getMonth()))
  }
  return result
}
