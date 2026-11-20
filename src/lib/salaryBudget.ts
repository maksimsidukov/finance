import { currentPeriodKey } from '@/lib/format'
import { summarizePayouts, type PayoutInfo } from '@/lib/salary'
import type { PaymentsState } from '@/types/payment'

export type SalaryBudgetPayments = Pick<PaymentsState, 'payments' | 'paidMap' | 'periodKey'>

export function calcNextSalaryBudget(
  payouts: PayoutInfo[],
  { payments, paidMap, periodKey }: SalaryBudgetPayments,
  today: Date,
) {
  const upcoming = payouts.filter((payout) => payout.net > 0 && payout.date >= today)
  const first = upcoming[0]
  if (!first) return null

  const date = first.date
  const sameDay = upcoming.filter((payout) => payout.date.getTime() === date.getTime())
  const nextDate = upcoming.find((payout) => payout.date > date)?.date ?? null
  const { net } = summarizePayouts(sameDay)
  const kinds = [...new Set(sameDay.map((payout) => payout.kind))]
  const kind = new Intl.ListFormat('ru').format(kinds.map((name, index) => index === 0 ? name : name.toLowerCase()))

  const duePayments = []
  const dueMonth = new Date(date.getFullYear(), date.getMonth(), 1)
  while (nextDate && dueMonth < nextDate) {
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

  return { date, nextDate, kind, net, duePayments, dueTotal: dueCents / 100, remainder: (Math.round(net * 100) - dueCents) / 100 }
}
