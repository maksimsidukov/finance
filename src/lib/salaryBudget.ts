import { currentPeriodKey } from '@/lib/format'
import { summarizePayouts, type PayoutInfo } from '@/lib/salary'
import type { PaymentsState } from '@/types/payment'

export type SalaryBudgetPayments = Pick<PaymentsState, 'payments' | 'paidMap' | 'periodKey' | 'history'>

interface BudgetPayment {
  key: string
  name: string
  amount: number
  dueDate: Date
}

function periodStart(key: string): Date {
  const [year, month] = key.split('-').map(Number)
  return new Date(year, month - 1, 1)
}

function dueDateInMonth(month: Date, day: number): Date {
  const year = month.getFullYear()
  const index = month.getMonth()
  const lastDay = new Date(year, index + 1, 0).getDate()
  return new Date(year, index, Math.min(day, lastDay))
}

export function calcNextSalaryBudget(
  payouts: PayoutInfo[],
  { payments, paidMap, periodKey, history }: SalaryBudgetPayments,
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

  // Ручное закрытие может создать несколько снимков одного календарного месяца.
  const archived = new Map<string, BudgetPayment | null>()
  for (const period of history) {
    if (period.key >= periodKey) continue
    const month = periodStart(period.key)
    for (const item of period.items) {
      const key = `${period.key}-${item.paymentId}`
      if (item.paid || item.settledAt) archived.set(key, null)
      else if (!archived.has(key)) {
        archived.set(key, { key, name: item.name, amount: item.amount, dueDate: dueDateInMonth(month, item.dueDay) })
      }
    }
  }

  const duePayments = [...archived.values()].filter((item): item is BudgetPayment => item !== null)
  const cutoff = nextDate ?? new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)
  const dueMonth = periodStart(periodKey)
  while (dueMonth < cutoff) {
    const key = currentPeriodKey(dueMonth)

    for (const payment of payments) {
      if (key === periodKey && paidMap[payment.id]) continue
      const dueDate = dueDateInMonth(dueMonth, payment.dueDay)
      if (dueDate < cutoff) duePayments.push({ key: `${key}-${payment.id}`, name: payment.name, amount: payment.amount, dueDate })
    }
    dueMonth.setMonth(dueMonth.getMonth() + 1)
  }

  duePayments.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
  const dueCents = duePayments.reduce((total, { amount }) => total + Math.round(amount * 100), 0)

  return { date, nextDate, kind, net, duePayments, dueTotal: dueCents / 100, remainder: (Math.round(net * 100) - dueCents) / 100 }
}
