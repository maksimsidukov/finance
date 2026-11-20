import { useState, type FormEvent } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatDate, formatMoney } from '@/lib/format'
import type { SalaryChange } from '@/lib/salary'

interface SalaryChangesProps {
  baseGross: number
  changes: SalaryChange[]
  onSave: (change: SalaryChange) => void
  onRemove: (date: string) => void
}

const changePercent = new Intl.NumberFormat('ru-RU', {
  style: 'percent',
  maximumFractionDigits: 2,
  signDisplay: 'exceptZero',
})

export function SalaryChanges({ baseGross, changes, onSave, onRemove }: SalaryChangesProps) {
  const [date, setDate] = useState('')
  const [amount, setAmount] = useState('')
  const [error, setError] = useState('')

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const normalized = amount.trim().replace(',', '.')
    const cents = Math.round(Number(normalized) * 100)
    if (!/^\d+(?:\.\d{1,2})?$/.test(normalized) || !Number.isSafeInteger(cents)) {
      setError('Введите оклад в рублях, при необходимости с копейками.')
      return
    }
    onSave({ date, gross: cents / 100 })
    setDate('')
    setAmount('')
    setError('')
  }

  return (
    <section aria-labelledby="salary-changes-heading" className="min-w-0 border-t pt-4">
      <h2 id="salary-changes-heading" className="font-medium">Изменения оклада</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Базовый оклад действует до первого изменения. В месяц изменения оклад считается по рабочим дням.
      </p>
      <form onSubmit={submit} className="mt-3 grid gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid min-w-0 gap-2">
            <Label htmlFor="salary-change-date">Дата изменения оклада</Label>
            <Input id="salary-change-date" type="date" min="1900-01-01" max="9999-12-31" required value={date} onChange={(event) => setDate(event.target.value)} />
          </div>
          <div className="grid min-w-0 gap-2">
            <Label htmlFor="salary-change-gross">Новый оклад до НДФЛ, ₽</Label>
            <Input id="salary-change-gross" inputMode="decimal" required value={amount} onChange={(event) => setAmount(event.target.value)} />
          </div>
        </div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button type="submit" variant="outline" className="justify-self-start">Сохранить изменение</Button>
      </form>

      {changes.length > 0 && (
        <ul className="mt-3 grid gap-1 text-sm">
          {changes.map((change, index) => {
            const label = formatDate(`${change.date}T00:00:00`)
            const previousGross = changes[index - 1]?.gross ?? baseGross
            const delta = (Math.round(change.gross * 100) - Math.round(previousGross * 100)) / 100
            return (
              <li key={change.date} className="flex items-center justify-between gap-2">
                <div className="min-w-0 [overflow-wrap:anywhere]">
                  <p>С {label} · {formatMoney(change.gross)}</p>
                  <p className="text-xs text-muted-foreground">
                    {delta === 0 ? 'Без изменений' : (
                      <>
                        {delta > 0 ? '+' : ''}{formatMoney(delta)}
                        {previousGross > 0 && ` (${changePercent.format(delta / previousGross)})`}
                      </>
                    )}
                  </p>
                </div>
                <Button type="button" variant="ghost" size="icon" aria-label={`Удалить изменение оклада с ${label}`} onClick={() => onRemove(change.date)}>
                  <Trash2 className="size-4 text-muted-foreground" />
                </Button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
