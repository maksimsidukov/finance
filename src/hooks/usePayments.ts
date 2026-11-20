import { useCallback, useEffect, useMemo, useState } from 'react'
import type { HistoryItem, PaymentsState, PeriodSnapshot } from '@/types/payment'
import { currentPeriodKey, periodLabelForKey } from '@/lib/format'

const STORAGE_KEY = 'mandatory-payments/v1'

function uid(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function emptyState(): PaymentsState {
  const key = currentPeriodKey()
  return {
    payments: [],
    periodKey: key,
    periodLabel: periodLabelForKey(key),
    paidMap: {},
    history: [],
  }
}

function loadState(): PaymentsState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyState()
    const parsed = JSON.parse(raw) as PaymentsState
    if (!Array.isArray(parsed.payments) || !Array.isArray(parsed.history)) return emptyState()
    return {
      payments: parsed.payments,
      periodKey: parsed.periodKey,
      periodLabel: parsed.periodLabel,
      paidMap: parsed.paidMap ?? {},
      history: parsed.history,
    }
  } catch {
    return emptyState()
  }
}

/** Снимок текущего периода для архивации в историю */
function snapshotPeriod(state: PaymentsState, closedAt: string): PeriodSnapshot | null {
  const items: HistoryItem[] = state.payments.map((p) => ({
    paymentId: p.id,
    name: p.name,
    amount: p.amount,
    dueDay: p.dueDay,
    paid: Boolean(state.paidMap[p.id]),
    paidAt: state.paidMap[p.id],
  }))
  if (items.length === 0) return null
  return {
    id: uid(),
    key: state.periodKey,
    label: state.periodLabel,
    closedAt,
    items,
  }
}

/** Если сменился календарный месяц — закрываем прошлый период и начинаем новый */
function rollToCurrentMonth(state: PaymentsState): PaymentsState {
  const key = currentPeriodKey()
  if (state.periodKey === key) return state
  const snapshot = snapshotPeriod(state, new Date().toISOString())
  return {
    payments: state.payments,
    periodKey: key,
    periodLabel: periodLabelForKey(key),
    paidMap: {},
    history: snapshot ? [snapshot, ...state.history] : state.history,
  }
}

export interface PaymentDraft {
  name: string
  amount: number
  dueDay: number
  note?: string
}

export function usePayments() {
  const [state, setState] = useState<PaymentsState>(() => rollToCurrentMonth(loadState()))

  // Авто-переход на новый месяц при возвращении в приложение
  useEffect(() => {
    const check = () => setState((s) => rollToCurrentMonth(s))
    window.addEventListener('focus', check)
    document.addEventListener('visibilitychange', check)
    return () => {
      window.removeEventListener('focus', check)
      document.removeEventListener('visibilitychange', check)
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // переполнение localStorage — молча игнорируем, данные останутся в памяти
    }
  }, [state])

  const addPayment = useCallback((draft: PaymentDraft) => {
    setState((s) => ({
      ...s,
      payments: [
        ...s.payments,
        { ...draft, id: uid(), createdAt: new Date().toISOString() },
      ],
    }))
  }, [])

  const updatePayment = useCallback((id: string, draft: PaymentDraft) => {
    setState((s) => ({
      ...s,
      payments: s.payments.map((p) => (p.id === id ? { ...p, ...draft } : p)),
    }))
  }, [])

  const deletePayment = useCallback((id: string) => {
    setState((s) => {
      const paidMap = { ...s.paidMap }
      delete paidMap[id]
      return { ...s, payments: s.payments.filter((p) => p.id !== id), paidMap }
    })
  }, [])

  const togglePaid = useCallback((id: string) => {
    setState((s) => {
      const paidMap = { ...s.paidMap }
      if (paidMap[id]) delete paidMap[id]
      else paidMap[id] = new Date().toISOString()
      return { ...s, paidMap }
    })
  }, [])

  /** Вручную закрыть текущий период и начать заново */
  const startNewPeriod = useCallback(() => {
    setState((s) => {
      const snapshot = snapshotPeriod(s, new Date().toISOString())
      return {
        ...s,
        paidMap: {},
        history: snapshot ? [snapshot, ...s.history] : s.history,
      }
    })
  }, [])

  const sortedPayments = useMemo(
    () => [...state.payments].sort((a, b) => a.dueDay - b.dueDay || a.name.localeCompare(b.name, 'ru')),
    [state.payments],
  )

  const totals = useMemo(() => {
    const total = state.payments.reduce((sum, p) => sum + p.amount, 0)
    const paid = state.payments.reduce(
      (sum, p) => (state.paidMap[p.id] ? sum + p.amount : sum),
      0,
    )
    const paidCount = state.payments.filter((p) => state.paidMap[p.id]).length
    return { total, paid, paidCount, count: state.payments.length }
  }, [state.payments, state.paidMap])

  return {
    payments: sortedPayments,
    paidMap: state.paidMap,
    history: state.history,
    periodKey: state.periodKey,
    periodLabel: state.periodLabel,
    totals,
    addPayment,
    updatePayment,
    deletePayment,
    togglePaid,
    startNewPeriod,
  }
}
