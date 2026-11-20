import { currentPeriodKey } from '@/lib/format'
import { calcMonth, type SalarySettings } from '@/lib/salary'
import type { PaymentsState } from '@/types/payment'

export type SalaryBudgetPayments = Pick<PaymentsState, 'payments' | 'paidMap' | 'periodKey'>

export function calcNextSalaryBudget(
  settings: SalarySettings,
  { payments, paidMap, periodKey }: SalaryBudgetPayments,
  today: Date,
) {
  const year = today.getFullYear()
  const month = today.getMonth()
  const startOfToday = new Date(year, month, today.getDate())

  // Расчёт за прошлый месяц может прийти в текущем, а будущая выплата — сдвинуться на месяц назад.
  const payouts = [-1, 0, 1, 2]
    .flatMap((offset) => {
      const date = new Date(year, month + offset, 1)
      const { advance, salary } = calcMonth(settings, date.getFullYear(), date.getMonth())
      return [
        { ...advance, kind: 'Аванс' },
        { ...salary, kind: 'Расчёт' },
      ]
    })
    .filter((payout) => payout.net > 0 && payout.date >= startOfToday)
    .sort((a, b) => a.date.getTime() - b.date.getTime())

  const first = payouts[0]
  if (!first) return null

  const date = first.date
  const sameDay = payouts.filter((payout) => payout.date.getTime() === date.getTime())
  const following = payouts.find((payout) => payout.date > date)
  if (!following) return null

  const nextDate = following.date
  const net = sameDay.reduce((total, payout) => total + payout.net, 0)
  const kind = new Set(sameDay.map((payout) => payout.kind)).size > 1
    ? 'Аванс и расчёт'
    : first.kind

  const duePayments = []
  const dueMonth = new Date(date.getFullYear(), date.getMonth(), 1)
  while (dueMonth < nextDate) {
    const dueYear = dueMonth.getFullYear()
    const monthIndex = dueMonth.getMonth()
    const lastDay = new Date(dueYear, monthIndex + 1, 0).getDate()
    const isCurrentPeriod = currentPeriodKey(dueMonth) === periodKey

    for (const payment of payments) {
      if (isCurrentPeriod && paidMap[payment.id]) continue
      const dueDate = new Date(dueYear, monthIndex, Math.min(payment.dueDay, lastDay))
      if (dueDate >= date && dueDate < nextDate) duePayments.push({ payment, dueDate })
    }
    dueMonth.setMonth(monthIndex + 1)
  }

  duePayments.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
  const dueCents = duePayments.reduce((total, { payment }) => total + Math.round(payment.amount * 100), 0)

  return { date, nextDate, kind, net, duePayments, dueTotal: dueCents / 100, remainder: (net * 100 - dueCents) / 100 }
}
