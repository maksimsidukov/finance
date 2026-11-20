import { useState, type FormEvent } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatDate, formatMoney } from '@/lib/format'
import type { PayoutInfo, SalaryBonus } from '@/lib/salary'

interface SalaryBonusesProps {
  payouts: PayoutInfo[]
  onAdd: (bonus: SalaryBonus) => void
  onRemove: (id: string) => void
}

export function SalaryBonuses({ payouts, onAdd, onRemove }: SalaryBonusesProps) {
  const [date, setDate] = useState('')
  const [amount, setAmount] = useState('')
  const [error, setError] = useState('')

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const normalized = amount.trim().replace(',', '.')
    const cents = Math.round(Number(normalized) * 100)
    if (!/^[0-9]+(?:\.[0-9]{1,2})?$/.test(normalized) || !Number.isSafeInteger(cents) || cents <= 0) {
      setError('Введите сумму больше нуля, при необходимости с копейками.')
      return
    }

    onAdd({ id: crypto.randomUUID?.() ?? `bonus-${Date.now()}-${Math.random()}`, date, gross: cents / 100 })
    setDate('')
    setAmount('')
    setError('')
  }

  return (
    <section aria-labelledby="salary-bonuses-heading" className="min-w-0 rounded-2xl border bg-card p-5 shadow-sm">
      <h2 id="salary-bonuses-heading" className="font-medium">Премии</h2>
      <form onSubmit={submit} className="mt-3 grid gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid min-w-0 gap-2">
            <Label htmlFor="bonus-date">Дата выплаты премии</Label>
            <Input id="bonus-date" type="date" min="2025-01-01" max="9999-12-31" required value={date} onChange={(event) => setDate(event.target.value)} />
          </div>
          <div className="grid min-w-0 gap-2">
            <Label htmlFor="bonus-gross">Премия до НДФЛ, ₽</Label>
            <Input id="bonus-gross" inputMode="decimal" required value={amount} onChange={(event) => setAmount(event.target.value)} />
          </div>
        </div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button type="submit" variant="outline" className="justify-self-start">
          <Plus className="size-4" />
          Добавить премию
        </Button>
      </form>

      {payouts.length > 0 && (
        <ul className="mt-4 grid gap-3 border-t pt-4 text-sm">
          {payouts.map((payout) => {
            const label = formatDate(payout.date.toISOString())
            return (
              <li key={payout.id} className="flex items-start justify-between gap-2">
                <div className="min-w-0 [overflow-wrap:anywhere]">
                  <p className="font-medium">{label} · {formatMoney(payout.net)} на руки</p>
                  <p className="text-xs text-muted-foreground">
                    До налога {formatMoney(payout.gross)} · НДФЛ {formatMoney(payout.tax)}
                  </p>
                </div>
                <Button type="button" variant="ghost" size="icon" aria-label={`Удалить премию за ${label}`} onClick={() => onRemove(payout.id)}>
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
