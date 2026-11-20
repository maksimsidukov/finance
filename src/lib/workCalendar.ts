/**
 * Производственный календарь РФ (пятидневка, выходные — сб/вс).
 *
 * Нерабочие праздничные дни — ст. 112 ТК РФ. Если праздник (кроме январских)
 * выпадает на выходной, выходной переносится на следующий рабочий день.
 *
 * Правительственные переносы (постановления) заданы явно по годам.
 * Для лет без постановления действует только автоматическое правило ТК,
 * поэтому январские каникулы будущих лет могут отличаться после выхода
 * официального постановления.
 */

/** Фиксированные нерабочие праздничные дни (месяц-день), ст. 112 ТК РФ */
const STATUTORY: Array<[number, number]> = [
  [1, 1], [1, 2], [1, 3], [1, 4], [1, 5], [1, 6], [1, 7], [1, 8],
  [2, 23],
  [3, 8],
  [5, 1],
  [5, 9],
  [6, 12],
  [11, 4],
]

/** Правительственные переносы: дополнительные выходные по годам */
const EXTRA_DAYS_OFF: Record<number, Array<[number, number]>> = {
  // Постановление Правительства РФ от 24.09.2025 № 1466:
  // сб 3 января → пт 9 января; вс 4 января → чт 31 декабря
  2026: [
    [1, 9],
    [12, 31],
  ],
  // Постановление Правительства РФ от 17.09.2026 № 1187.
  2027: [
    [2, 22],
    [11, 5],
    [12, 31],
  ],
}

/** Перенесённые рабочие дни по годам */
const EXTRA_WORKING_DAYS: Record<number, Array<[number, number]>> = {
  2027: [[2, 20]],
}

function key(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

const cache = new Map<number, Set<string>>()

/** Множество нерабочих дат (праздники + переносы, без обычных сб/вс) года */
function holidaysOf(year: number): Set<string> {
  const cached = cache.get(year)
  if (cached) return cached

  const off = new Set<string>()

  for (const [m, d] of STATUTORY) {
    off.add(key(year, m, d))
    // Автоперенос по ст. 112 ТК: праздник на выходном → следующий рабочий день.
    // Январские каникулы (1–8) автоматически НЕ переносятся — их двигает правительство.
    if (m === 1) continue
    const date = new Date(year, m - 1, d)
    if (date.getDay() === 0 || date.getDay() === 6) {
      const next = new Date(date)
      do {
        next.setDate(next.getDate() + 1)
      } while (
        next.getDay() === 0 ||
        next.getDay() === 6 ||
        off.has(key(next.getFullYear(), next.getMonth() + 1, next.getDate()))
      )
      off.add(key(next.getFullYear(), next.getMonth() + 1, next.getDate()))
    }
  }

  for (const [m, d] of EXTRA_DAYS_OFF[year] ?? []) off.add(key(year, m, d))
  for (const [m, d] of EXTRA_WORKING_DAYS[year] ?? []) off.delete(key(year, m, d))

  cache.set(year, off)
  return off
}

/** Рабочий ли день (пятидневка) */
export function isWorkingDay(date: Date): boolean {
  const y = date.getFullYear()
  const k = key(y, date.getMonth() + 1, date.getDate())
  const holidaySet = holidaysOf(y)
  if (holidaySet.has(k)) return false
  const day = date.getDay()
  if (day === 0 || day === 6) {
    // рабочая суббота/воскресенье по переносу
    const extraWork = (EXTRA_WORKING_DAYS[y] ?? []).some(
      ([m, d]) => key(y, m, d) === k,
    )
    return extraWork
  }
  return true
}

/** Число рабочих дней в месяце (month: 0–11) */
export function workingDaysInMonth(year: number, month: number): number {
  let count = 0
  const days = new Date(year, month + 1, 0).getDate()
  for (let d = 1; d <= days; d++) {
    if (isWorkingDay(new Date(year, month, d))) count++
  }
  return count
}

/** Рабочие дни в диапазоне дат месяца [dayFrom, dayTo] включительно (month: 0–11) */
export function workingDaysInRange(year: number, month: number, dayFrom: number, dayTo: number): number {
  let count = 0
  const days = new Date(year, month + 1, 0).getDate()
  const to = Math.min(dayTo, days)
  for (let d = dayFrom; d <= to; d++) {
    if (isWorkingDay(new Date(year, month, d))) count++
  }
  return count
}

/**
 * Дата выплаты: день `day` месяца (месяц со сдвигом monthOffset относительно
 * year/month). Если дата выпадает на выходной/праздник — сдвигаем на
 * предыдущий рабочий день (ст. 136 ТК РФ). Возвращает дату и признак переноса.
 */
export function paymentDate(
  year: number,
  month: number,
  day: number,
  monthOffset: number,
): { date: Date; shifted: boolean } {
  const base = new Date(year, month + monthOffset, 1)
  const lastDay = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate()
  const d = Math.min(day, lastDay)
  const date = new Date(base.getFullYear(), base.getMonth(), d)
  let shifted = false
  while (!isWorkingDay(date)) {
    date.setDate(date.getDate() - 1)
    shifted = true
  }
  return { date, shifted }
}

/** Есть ли точные данные (правительственные переносы) для года */
export function hasExactData(year: number): boolean {
  return year in EXTRA_DAYS_OFF || year in EXTRA_WORKING_DAYS
}
