import { useState } from 'react'
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

function dueStatus(payment: Payment, paid: boolean): { label: string; tone: 'ok' | 'soon' | 'overdue' | 'paid' } {
  if (paid) return { label: 'Оплачено', tone: 'paid' }
  const today = new Date().getDate()
  const left = payment.dueDay - today
  if (left < 0) return { label: `Просрочено на ${-left} дн.`, tone: 'overdue' }
  if (left === 0) return { label: 'Оплатить сегодня', tone: 'overdue' }
  if (left <= 3) return { label: `Осталось ${left} дн.`, tone: 'soon' }
  return { label: `До ${payment.dueDay}-го числа`, tone: 'ok' }
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

  return (
    <div className="grid gap-5">
      {/* Сводка по периоду */}
      <section aria-label="Сводка по периоду" className="rounded-2xl border bg-card p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
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

      {/* Список платежей */}
      {payments.length > 0 ? (
        <ul className="grid gap-2">
          {payments.map((p) => {
            const paid = Boolean(paidMap[p.id])
            const status = dueStatus(p, paid)
            return (
              <li
                key={p.id}
                className={cn(
                  'group flex items-center gap-3 rounded-2xl border bg-card p-4 shadow-sm transition-colors',
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
                    'flex size-11 shrink-0 items-center justify-center rounded-full border-2 transition-colors cursor-pointer',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                    paid
                      ? 'border-emerald-600 bg-emerald-600 text-white'
                      : 'border-muted-foreground/30 bg-background hover:border-emerald-500 hover:text-emerald-600',
                  )}
                >
                  <Check className={cn('size-5', !paid && 'opacity-0 group-hover:opacity-40')} />
                </button>

                <div className="min-w-0 flex-1">
                  <p className={cn('font-medium leading-tight', paid && 'text-muted-foreground line-through')}>
                    {p.name}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
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
                    {p.note && (
                      <span className="truncate text-xs text-muted-foreground">{p.note}</span>
                    )}
                  </div>
                </div>

                <p className={cn('shrink-0 text-lg font-semibold tabular-nums', paid && 'text-muted-foreground')}>
                  {formatMoney(p.amount)}
                </p>

                <div className="flex shrink-0 flex-col gap-1 sm:flex-row">
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
