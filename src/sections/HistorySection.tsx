import { Check, X } from 'lucide-react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { PeriodSnapshot } from '@/types/payment'
import { formatDate, formatMoney, pluralPayments } from '@/lib/format'
import { cn } from '@/lib/utils'

interface HistorySectionProps {
  history: PeriodSnapshot[]
  periodKey: string
  onSettle: (key: string, paymentId: string, settled: boolean) => void
}

export function HistorySection({ history, periodKey, onSettle }: HistorySectionProps) {
  if (history.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground">
        <p className="text-lg font-medium text-foreground">История пуста</p>
        <p className="mt-1 text-sm">
          Закрытые периоды появятся здесь автоматически со сменой месяца или после нажатия «Новый период».
        </p>
      </div>
    )
  }

  return (
    <Accordion type="multiple" className="grid grid-cols-1 gap-2">
      {history.map((period) => {
        const total = period.items.reduce((s, i) => s + i.amount, 0)
        const paidItems = period.items.filter((item) => item.paid || item.settledAt)
        const paid = paidItems.reduce((sum, item) => sum + item.amount, 0)
        const paidCount = paidItems.length
        const allPaid = paidCount === period.items.length

        return (
          <AccordionItem
            key={period.id}
            value={period.id}
            className="rounded-2xl border bg-card px-4 shadow-sm"
          >
            <AccordionTrigger className="py-4 hover:no-underline">
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1 text-left">
                <span className="font-medium">{period.label}</span>
                <Badge
                  variant="secondary"
                  className={cn(
                    'font-normal',
                    allPaid
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
                  )}
                >
                  {paidCount}/{period.items.length} · {formatMoney(paid)} из {formatMoney(total)}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  закрыт {formatDate(period.closedAt)}
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <ul className="grid grid-cols-1 gap-1 pb-2">
                {period.items.map((item) => {
                  const isPaid = item.paid || Boolean(item.settledAt)
                  const canSettle = period.key < periodKey && !item.paid
                  return (
                    <li
                      key={item.paymentId}
                        className="flex items-center gap-2 rounded-lg px-1 py-2 text-sm sm:gap-3 sm:px-2"
                    >
                      <span
                        className={cn(
                          'flex size-6 shrink-0 items-center justify-center rounded-full',
                          isPaid
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
                        )}
                        aria-label={isPaid ? 'Оплачено' : 'Не оплачено'}
                      >
                        {isPaid ? <Check className="size-4" /> : <X className="size-4" />}
                      </span>
                        <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">
                        {item.name}
                        <span className="ml-2 text-xs text-muted-foreground">до {item.dueDay}-го</span>
                      </span>
                      <span className="shrink-0 font-medium tabular-nums">{formatMoney(item.amount)}</span>
                      {canSettle && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          aria-label={`${item.settledAt ? 'Снять отметку о погашении' : 'Отметить долг погашенным'}: ${item.name}`}
                          onClick={() => onSettle(period.key, item.paymentId, !item.settledAt)}
                        >
                          {item.settledAt ? 'Отменить' : 'Погашен'}
                        </Button>
                      )}
                    </li>
                  )
                })}
              </ul>
              <p className="border-t px-2 py-2 text-xs text-muted-foreground">
                {period.items.length} {pluralPayments(period.items.length)} · оплачено {formatMoney(paid)} из{' '}
                {formatMoney(total)}
              </p>
            </AccordionContent>
          </AccordionItem>
        )
      })}
    </Accordion>
  )
}
