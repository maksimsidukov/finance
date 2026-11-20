import { useEffect, useState } from 'react'
import { CalendarDays, ChevronDown, Settings2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { useSalarySettings } from '@/hooks/useSalarySettings'
import { calcPayouts, salaryOnDate, summarizePayouts } from '@/lib/salary'
import { calcNextSalaryBudget, type SalaryBudgetPayments } from '@/lib/salaryBudget'
import { effectiveRate, marginalRate } from '@/lib/ndfl'
import { currentPeriodKey, formatDate, formatMoney, periodLabelForKey } from '@/lib/format'
import { cn } from '@/lib/utils'
import { workingDaysInMonth } from '@/lib/workCalendar'
import { SalaryBonuses } from '@/sections/SalaryBonuses'
import { SalaryChanges } from '@/sections/SalaryChanges'

function NumberField({
  id,
  label,
  value,
  onChange,
}: {
  id: string
  label: string
  value: number
  onChange?: (v: number) => void
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        inputMode="numeric"
        value={String(value)}
        readOnly={!onChange}
        onChange={(e) => {
          const v = Number(e.target.value.replace(/[^\d]/g, ''))
          if (Number.isFinite(v)) onChange?.(v)
        }}
      />
    </div>
  )
}

export function SalarySection({ payments, paidMap, periodKey }: SalaryBudgetPayments) {
  const { settings, update, addBonus, removeBonus, saveSalaryChange, removeSalaryChange } = useSalarySettings()
  const [today, setToday] = useState(() => new Date().setHours(0, 0, 0, 0))

  useEffect(() => {
    const updateToday = () => setToday(new Date().setHours(0, 0, 0, 0))
    const timer = window.setInterval(updateToday, 60_000)
    window.addEventListener('focus', updateToday)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', updateToday)
    }
  }, [])

  const date = new Date(today)
  const hasSalaryHistory = settings.salaryChanges.length > 0
  const year = date.getFullYear()
  const payouts = calcPayouts(settings, year)
  const budget = calcNextSalaryBudget(payouts, { payments, paidMap, periodKey }, date)
  const annual = summarizePayouts(payouts.filter((payout) => payout.date.getFullYear() === year))
  const months = Array.from({ length: 12 }, (_, index) => {
    const month = new Date(year, date.getMonth() + index, 1)
    const key = currentPeriodKey(month)
    const items = payouts.filter((payout) => currentPeriodKey(payout.date) === key)
    return { key, items, workingDays: workingDaysInMonth(month.getFullYear(), month.getMonth()), ...summarizePayouts(items) }
  })
  const yearTotal = summarizePayouts(months.flatMap((month) => month.items))

  return (
    <div className="grid grid-cols-1 gap-5">
      <section aria-labelledby="next-salary-heading" className="rounded-2xl border bg-card p-5 shadow-sm">
        <h2 id="next-salary-heading" className="font-medium">Ближайшая зарплата</h2>
        {budget ? (
          <>
            <p className="mt-1 text-sm text-muted-foreground">
              {budget.kind} · {formatDate(budget.date.toISOString())}
            </p>
            <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">
              {formatMoney(budget.net)}
              <span className="ml-2 text-base font-normal text-muted-foreground">на руки</span>
            </p>
            {budget.nextDate ? (
              <div className="mt-4 grid gap-2 border-t pt-4 text-sm">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="font-medium">Обязательные платежи</h3>
                  <span className="shrink-0 font-medium tabular-nums">{formatMoney(budget.dueTotal)}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Неоплаченные с этой выплаты до следующей · {formatDate(budget.nextDate.toISOString())}
                </p>
                {budget.duePayments.length > 0 && (
                  <ul className="grid gap-2 py-1">
                    {budget.duePayments.map(({ payment, dueDate }) => (
                      <li key={`${payment.id}-${dueDate.getTime()}`} className="flex items-start justify-between gap-3">
                        <div className="min-w-0 break-words">
                          <div>{payment.name}</div>
                          <div className="text-xs text-muted-foreground">{formatDate(dueDate.toISOString())}</div>
                        </div>
                        <span className="shrink-0 tabular-nums">{formatMoney(payment.amount)}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-1 flex items-baseline justify-between gap-3 border-t pt-3 font-semibold">
                  <span>Останется после платежей</span>
                  <span className={cn('shrink-0 text-lg tabular-nums', budget.remainder < 0 && 'text-destructive')}>
                    {formatMoney(budget.remainder)}
                  </span>
                </div>
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">Следующая выплата пока не запланирована.</p>
            )}
          </>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">Укажите оклад в настройках зарплаты.</p>
        )}
      </section>

      <Collapsible className="rounded-2xl border bg-card shadow-sm">
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="group h-auto w-full justify-start rounded-2xl px-5 py-4">
            <Settings2 className="size-4 text-muted-foreground" />
            Настройки зарплаты
            <ChevronDown className="ml-auto size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="gap-4 data-[state=open]:grid data-[state=open]:px-5 data-[state=open]:pb-5">
          <NumberField
            id="gross"
            label="Текущий оклад до НДФЛ, ₽"
            value={salaryOnDate(settings, date)}
            onChange={hasSalaryHistory ? undefined : (v) => update({ grossSalary: v })}
          />
          <div className="grid grid-cols-2 gap-4">
            <NumberField
              id="advance-day"
              label="День аванса"
              value={settings.advanceDay}
              onChange={(v) => update({ advanceDay: Math.min(31, Math.max(1, v)) })}
            />
            <NumberField
              id="salary-day"
              label="День расчёта"
              value={settings.salaryDay}
              onChange={(v) => update({ salaryDay: Math.min(31, Math.max(1, v)) })}
            />
          </div>

          <div className="grid gap-2">
            <Label>Расчёт за месяц приходит</Label>
            <RadioGroup
              value={String(settings.salaryMonthOffset)}
              onValueChange={(v) => update({ salaryMonthOffset: Number(v) as 0 | 1 })}
              className="grid grid-cols-2 gap-2"
            >
              <Label
                htmlFor="offset-0"
                className={cn(
                  'flex cursor-pointer items-center gap-2 rounded-xl border p-3 text-sm font-normal',
                  settings.salaryMonthOffset === 0 && 'border-primary bg-primary/5',
                )}
              >
                <RadioGroupItem value="0" id="offset-0" />
                В этом же месяце
              </Label>
              <Label
                htmlFor="offset-1"
                className={cn(
                  'flex cursor-pointer items-center gap-2 rounded-xl border p-3 text-sm font-normal',
                  settings.salaryMonthOffset === 1 && 'border-primary bg-primary/5',
                )}
              >
                <RadioGroupItem value="1" id="offset-1" />
                В следующем
              </Label>
            </RadioGroup>
          </div>

          <div className="grid gap-2">
            <Label>Аванс (за 1–15 число)</Label>
            <RadioGroup
              value={settings.advanceMode}
              onValueChange={(v) => update({ advanceMode: v as 'days' | 'percent' })}
              className="grid gap-2"
            >
              <Label
                htmlFor="mode-days"
                className={cn(
                  'flex cursor-pointer items-center gap-2 rounded-xl border p-3 text-sm font-normal',
                  settings.advanceMode === 'days' && 'border-primary bg-primary/5',
                )}
              >
                <RadioGroupItem value="days" id="mode-days" />
                По отработанным дням (произв. календарь)
              </Label>
              <Label
                htmlFor="mode-percent"
                className={cn(
                  'flex cursor-pointer items-center gap-2 rounded-xl border p-3 text-sm font-normal',
                  settings.advanceMode === 'percent' && 'border-primary bg-primary/5',
                )}
              >
                <RadioGroupItem value="percent" id="mode-percent" />
                Фиксированный процент от оклада
              </Label>
            </RadioGroup>
            {settings.advanceMode === 'percent' && (
              <div className="mt-1 max-w-40">
                <NumberField
                  id="advance-percent"
                  label="Процент, %"
                  value={settings.advancePercent}
                  onChange={(v) => update({ advancePercent: Math.min(100, Math.max(0, v)) })}
                />
              </div>
            )}
          </div>
          {hasSalaryHistory && (
            <NumberField
              id="base-gross"
              label="Базовый оклад до первого изменения, ₽"
              value={settings.grossSalary}
              onChange={(v) => update({ grossSalary: v })}
            />
          )}
          <SalaryChanges changes={settings.salaryChanges} onSave={saveSalaryChange} onRemove={removeSalaryChange} />
        </CollapsibleContent>
      </Collapsible>

      <SalaryBonuses payouts={payouts.filter((payout) => payout.kind === 'Премия')} onAdd={addBonus} onRemove={removeBonus} />

      {/* Сводка за год */}
      <section aria-label="Сводка за год" className="rounded-2xl border bg-card p-5 shadow-sm">
        <p className="text-sm text-muted-foreground">Доход и НДФЛ за {year} год</p>
        <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">
          {formatMoney(annual.net)}
          <span className="ml-2 text-base font-normal text-muted-foreground">на руки за год</span>
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge variant="secondary" className="font-normal">
            НДФЛ за год: {formatMoney(annual.tax)}
          </Badge>
          <Badge variant="secondary" className="font-normal">
            Эффективная ставка: {(effectiveRate(annual.gross) * 100).toLocaleString('ru-RU', { maximumFractionDigits: 1 })}%
          </Badge>
          <Badge variant="secondary" className="font-normal">
            Максимальная ставка: {marginalRate(annual.gross) * 100}%
          </Badge>
        </div>
      </section>

      {/* График выплат на 12 месяцев */}
      <section aria-label="График выплат">
        <div className="mb-2 flex items-center gap-2">
          <CalendarDays className="size-4 text-muted-foreground" />
          <h2 className="font-medium">График выплат на 12 месяцев</h2>
        </div>
        <Accordion type="multiple" className="grid gap-2">
          {months.map((m) => (
            <AccordionItem
              key={m.key}
              value={m.key}
              className="rounded-2xl border bg-card px-4 shadow-sm"
            >
              <AccordionTrigger className="py-4 hover:no-underline">
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1 text-left">
                  <span className="font-medium">{periodLabelForKey(m.key)}</span>
                  <span className="text-sm font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                    {formatMoney(m.net)}
                  </span>
                  {m.items.some((payout) => payout.approximateCalendar) && (
                    <Badge variant="secondary" className="font-normal text-amber-800 bg-amber-100 dark:bg-amber-950 dark:text-amber-300">
                      календарь примерный
                    </Badge>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid gap-1 pb-2 text-sm">
                  {m.items.map((payout) => (
                    <div key={payout.id} className="flex flex-wrap items-baseline justify-between gap-x-3 rounded-lg px-2 py-2">
                      <div>
                        <p>
                          {payout.kind} · {formatDate(payout.date.toISOString())}
                          {payout.shifted && <span className="ml-1 text-xs text-muted-foreground">(перенос)</span>}
                        </p>
                        <p className="text-xs text-muted-foreground">НДФЛ {formatMoney(payout.tax)}</p>
                      </div>
                      <span className="font-medium tabular-nums">{formatMoney(payout.net)}</span>
                    </div>
                  ))}
                  <p className="border-t px-2 pt-2 text-xs text-muted-foreground">
                    Рабочих дней {m.workingDays} · До налога {formatMoney(m.gross)} · НДФЛ {formatMoney(m.tax)}
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        <p className="mt-3 px-1 text-xs text-muted-foreground">
          Итого за 12 месяцев: {formatMoney(yearTotal.net)} на руки, НДФЛ {formatMoney(yearTotal.tax)}.
          НДФЛ рассчитан по датам выплат нарастающим итогом с января по шкале 13–22%.
        </p>
      </section>
    </div>
  )
}
