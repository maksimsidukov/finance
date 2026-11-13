import { useMemo } from 'react'
import { CalendarDays, Settings2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
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
import { calcYearAhead } from '@/lib/salary'
import { effectiveRate, marginalRate, taxOnCumulative } from '@/lib/ndfl'
import { formatDate, formatMoney } from '@/lib/format'
import { cn } from '@/lib/utils'

function NumberField({
  id,
  label,
  value,
  onChange,
}: {
  id: string
  label: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        inputMode="numeric"
        value={String(value)}
        onChange={(e) => {
          const v = Number(e.target.value.replace(/[^\d]/g, ''))
          if (Number.isFinite(v)) onChange(v)
        }}
      />
    </div>
  )
}

export function SalarySection() {
  const { settings, update } = useSalarySettings()
  const months = useMemo(() => calcYearAhead(settings), [settings])

  const annualGross = settings.grossSalary * 12
  const annualTax = taxOnCumulative(annualGross)
  const yearTotal = useMemo(
    () =>
      months.reduce(
        (acc, m) => ({
          net: acc.net + m.net,
          tax: acc.tax + m.tax,
        }),
        { net: 0, tax: 0 },
      ),
    [months],
  )

  return (
    <div className="grid gap-5">
      {/* Настройки */}
      <section aria-label="Настройки зарплаты" className="rounded-2xl border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Settings2 className="size-4 text-muted-foreground" />
          <h2 className="font-medium">Правила начисления</h2>
        </div>
        <div className="grid gap-4">
          <NumberField
            id="gross"
            label="Оклад до НДФЛ, ₽"
            value={settings.grossSalary}
            onChange={(v) => update({ grossSalary: v })}
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
        </div>
      </section>

      {/* Сводка за год */}
      <section aria-label="Сводка за год" className="rounded-2xl border bg-card p-5 shadow-sm">
        <p className="text-sm text-muted-foreground">Годовой доход и НДФЛ (нарастающим итогом с января)</p>
        <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">
          {formatMoney(annualGross - annualTax)}
          <span className="ml-2 text-base font-normal text-muted-foreground">на руки за год</span>
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge variant="secondary" className="font-normal">
            НДФЛ за год: {formatMoney(annualTax)}
          </Badge>
          <Badge variant="secondary" className="font-normal">
            Эффективная ставка: {(effectiveRate(annualGross) * 100).toLocaleString('ru-RU', { maximumFractionDigits: 1 })}%
          </Badge>
          <Badge variant="secondary" className="font-normal">
            Максимальная ставка: {marginalRate(annualGross) * 100}%
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
              key={`${m.year}-${m.month}`}
              value={`${m.year}-${m.month}`}
              className="rounded-2xl border bg-card px-4 shadow-sm"
            >
              <AccordionTrigger className="py-4 hover:no-underline">
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1 text-left">
                  <span className="font-medium">{m.label}</span>
                  <span className="text-sm font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                    {formatMoney(m.net)}
                  </span>
                  {m.approximateCalendar && (
                    <Badge variant="secondary" className="font-normal text-amber-800 bg-amber-100 dark:bg-amber-950 dark:text-amber-300">
                      календарь примерный
                    </Badge>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid gap-1 pb-2 text-sm">
                  <div className="flex items-baseline justify-between gap-3 rounded-lg px-2 py-2">
                    <span>
                      Аванс · {formatDate(m.advance.date.toISOString())}
                      {m.advance.shifted && (
                        <span className="ml-1 text-xs text-muted-foreground">(перенесён на рабочий день)</span>
                      )}
                    </span>
                    <span className="shrink-0 font-medium tabular-nums">{formatMoney(m.advance.net)}</span>
                  </div>
                  <div className="flex items-baseline justify-between gap-3 rounded-lg px-2 py-2">
                    <span>
                      Расчёт · {formatDate(m.salary.date.toISOString())}
                      {m.salary.shifted && (
                        <span className="ml-1 text-xs text-muted-foreground">(перенесён на рабочий день)</span>
                      )}
                    </span>
                    <span className="shrink-0 font-medium tabular-nums">{formatMoney(m.salary.net)}</span>
                  </div>
                  <p className="border-t px-2 pt-2 text-xs text-muted-foreground">
                    Рабочих дней: {m.workingDays} · Начислено: {formatMoney(m.gross)} · НДФЛ:{' '}
                    {formatMoney(m.tax)} (аванс {formatMoney(m.advance.tax)}, расчёт{' '}
                    {formatMoney(m.salary.tax)})
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        <p className="mt-3 px-1 text-xs text-muted-foreground">
          Итого за 12 месяцев: {formatMoney(yearTotal.net)} на руки, НДФЛ {formatMoney(yearTotal.tax)}.
          Налог считается нарастающим итогом с января по пятиступенчатой шкале 13–22% (ФЗ № 176-ФЗ);
          если день выплаты — выходной или праздник, деньгами считается предыдущий рабочий день (ст. 136 ТК РФ).
        </p>
      </section>
    </div>
  )
}
