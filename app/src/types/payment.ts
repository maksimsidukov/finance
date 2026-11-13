export interface Payment {
  id: string
  name: string
  amount: number
  /** День месяца, до которого нужно оплатить (1–31) */
  dueDay: number
  note?: string
  createdAt: string
}

export interface HistoryItem {
  paymentId: string
  name: string
  amount: number
  dueDay: number
  paid: boolean
  paidAt?: string
}

export interface PeriodSnapshot {
  id: string
  /** Ключ периода, например "2025-11" */
  key: string
  /** Человекочитаемое имя, например "Ноябрь 2025" */
  label: string
  closedAt: string
  items: HistoryItem[]
}

export interface PaymentsState {
  payments: Payment[]
  periodKey: string
  periodLabel: string
  /** paymentId -> ISO-дата оплаты в текущем периоде */
  paidMap: Record<string, string>
  history: PeriodSnapshot[]
}
