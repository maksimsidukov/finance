import { Fragment, useMemo, useState } from 'react'
import { Check, Pencil, Trash2, RotateCcw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import type { Payment } from '@/types/payment'
import { formatMoney } from '@/lib/format'
import { cn } from '@/lib/utils'

interface CurrentPeriodProps {
  payments: Payment[]
  paidMap: Record<string, string>
  periodLabel: string
  totals: { total: number; paid: number; paidCount: number; count: number }
  onTogglePaid: (id: string) => void
  onEdit: (payment: Payment) => void
  onDelete: (id: string) => void
  onStartNewPeriod: () => void
}

const WEEKDAYS_RU = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб']

const dayMonthFormatter = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' })

function groupLabel(day: number): string {
  const now = new Date()
  const date = new Date(now.getFullYear(), now.getMonth(), day)
  return `${dayMonthFormatter.format(date)} · ${WEEKDAYS_RU[date.getDay()]}`
}

function dueStatus(payment: Payment, paid: boolean): { label: string; tone: 'ok' | 'soon' | 'overdue' | 'paid' } | null {
  if (paid) return { label: 'Оплачено', tone: 'paid' }
  const today = new Date().getDate()
  const left = payment.dueDay - today
  if (left < 0) return { label: `Просрочено на ${-left} дн.`, tone: 'overdue' }
  if (left === 0) return { label: 'Оплатить сегодня', tone: 'overdue' }
  if (left <= 3) return { label: `Осталось ${left} дн.`, tone: 'soon' }
  return null // дата видна в заголовке группы
}

export function CurrentPeriod({
  payments,
  paidMap,
  periodLabel,
  totals,
  onTogglePaid,
  onEdit,
  onDelete,
  onStartNewPeriod,
}: CurrentPeriodProps) {
  const [confirmNewPeriod, setConfirmNewPeriod] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<Payment | null>(null)

  const percent = totals.total > 0 ? Math.round((totals.paid / totals.total) * 100) : 0

  // Сначала неоплаченные, внутри каждого статуса — по дню оплаты.
  const groups = useMemo(() => {
    const map = new Map<string, { day: number; paid: boolean; items: Payment[]; total: number }>()
    for (const p of payments) {
      const paid = Boolean(paidMap[p.id])
      const key = `${paid}-${p.dueDay}`
      const group = map.get(key) ?? { day: p.dueDay, paid, items: [], total: 0 }
      group.items.push(p)
      group.total += p.amount
      map.set(key, group)
    }
    return [...map.values()].sort((a, b) => Number(a.paid) - Number(b.paid) || a.day - b.day)
  }, [payments, paidMap])
  const firstPaidGroup = groups.findIndex((group) => group.paid)

  return (
    <div className="grid grid-cols-1 gap-5">
      {/* Сводка по периоду */}
      <section aria-label="Сводка по периоду" className="rounded-2xl border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
          <div className="min-w-0 [overflow-wrap:anywhere]">
            <p className="text-sm text-muted-foreground">{periodLabel}</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">
              {formatMoney(totals.paid)}
              <span className="ml-2 text-base font-normal text-muted-foreground">
                из {formatMoney(totals.total)}
              </span>
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setConfirmNewPeriod(true)}
            disabled={payments.length === 0}
            className="shrink-0"
          >
            <RotateCcw className="size-4" />
            Новый период
          </Button>
        </div>
        <Progress value={percent} className="mt-4 h-2" />
        <p className="mt-2 text-sm text-muted-foreground">
          {totals.count === 0
            ? 'Пока нет платежей — добавьте первый'
            : `${totals.paidCount} из ${totals.count} ${totals.count === 1 ? 'платежа' : 'платежей'} отмечено · ${percent}%`}
        </p>
      </section>

      {/* Список платежей, сгруппированный по дню оплаты */}
      {payments.length > 0 ? (
        <div className="grid grid-cols-1 gap-4">
          {groups.map((group, index) => (
            <Fragment key={`${group.paid}-${group.day}`}>
              {index === firstPaidGroup && (
                <h2 className="px-1 text-sm font-medium text-muted-foreground">Оплаченные платежи</h2>
              )}
              <section aria-label={`${group.paid ? 'Оплаченные' : 'Неоплаченные'} платежи ${group.day}-го числа`}>
                {/* Заголовок дня с суммой */}
                <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 px-1">
                  <h2
                    className={cn(
                      'text-sm font-medium',
                      group.paid ? 'text-muted-foreground' : 'text-foreground',
                    )}
                  >
                    {groupLabel(group.day)}
                  </h2>
                  <p className={cn(
                    'min-w-0 text-sm font-semibold tabular-nums [overflow-wrap:anywhere]',
                    group.paid ? 'text-muted-foreground' : 'text-foreground',
                  )}>
                    {formatMoney(group.total)}
                  </p>
                </div>

                <ul className="grid grid-cols-1 gap-2">
                  {group.items.map((p) => {
                    const paid = group.paid
                    const status = dueStatus(p, paid)
                    return (
                      <li
                        key={p.id}
                        className={cn(
                          'group grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 rounded-2xl border bg-card p-4 shadow-sm transition-colors sm:flex',
                          paid && 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/30',
                        )}
                      >
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={paid}
                          aria-label={paid ? `Снять отметку об оплате: ${p.name}` : `Отметить оплаченным: ${p.name}`}
                          onClick={() => onTogglePaid(p.id)}
                          className={cn(
                            'row-span-2 flex size-11 shrink-0 items-center justify-center rounded-full border-2 transition-colors cursor-pointer',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                            paid
                              ? 'border-emerald-600 bg-emerald-600 text-white'
                              : 'border-muted-foreground/30 bg-background hover:border-emerald-500 hover:text-emerald-600',
                          )}
                        >
                          <Check className={cn('size-5', !paid && 'opacity-0 group-hover:opacity-40')} />
                        </button>

                        <div className="col-start-2 min-w-0 flex-1">
                          <p className={cn('font-medium leading-tight [overflow-wrap:anywhere]', paid && 'text-muted-foreground line-through')}>
                            {p.name}
                          </p>
                          {(status || p.note) && (
                            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                              {status && (
                                <Badge
                                  variant="secondary"
                                  className={cn(
                                    'font-normal',
                                    status.tone === 'overdue' && 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
                                    status.tone === 'soon' && 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
                                    status.tone === 'paid' && 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
                                  )}
                                >
                                  {status.label}
                                </Badge>
                              )}
                              {p.note && (
                                <span className="truncate text-xs text-muted-foreground">{p.note}</span>
                              )}
                            </div>
                          )}
                        </div>

                        <p className={cn(
                          'col-start-2 row-start-2 min-w-0 text-lg font-semibold tabular-nums [overflow-wrap:anywhere] sm:max-w-[40%] sm:shrink-0',
                          paid && 'text-muted-foreground',
                        )}>
                          {formatMoney(p.amount)}
                        </p>

                        <div className="col-start-3 row-span-2 row-start-1 flex shrink-0 flex-col gap-1 sm:flex-row">
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Редактировать: ${p.name}`}
                            onClick={() => onEdit(p)}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Удалить: ${p.name}`}
                            onClick={() => setConfirmDelete(p)}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </section>
            </Fragment>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground">
          <p className="text-lg font-medium text-foreground">Список пуст</p>
          <p className="mt-1 text-sm">
            Добавьте обязательные платежи: квартира, интернет, подписки, кредит — и отмечайте их по мере оплаты.
          </p>
        </div>
      )}

      {/* Подтверждение нового периода */}
      <AlertDialog open={confirmNewPeriod} onOpenChange={setConfirmNewPeriod}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Начать новый период?</AlertDialogTitle>
            <AlertDialogDescription>
              Текущий период «{periodLabel}» уйдёт в историю вместе со статусами оплаты, а все отметки обнулятся.
              Сам список платежей останется.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onStartNewPeriod()
                setConfirmNewPeriod(false)
              }}
            >
              Начать заново
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Подтверждение удаления */}
      <AlertDialog open={Boolean(confirmDelete)} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить платёж?</AlertDialogTitle>
            <AlertDialogDescription>
              «{confirmDelete?.name}» ({confirmDelete ? formatMoney(confirmDelete.amount) : ''}) будет удалён из
              списка. Записи в истории прошлых периодов сохранятся.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmDelete) onDelete(confirmDelete.id)
                setConfirmDelete(null)
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
