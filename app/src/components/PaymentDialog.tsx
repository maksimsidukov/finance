import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Payment } from '@/types/payment'
import type { PaymentDraft } from '@/hooks/usePayments'

interface PaymentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Если передан — режим редактирования */
  initial?: Payment | null
  onSubmit: (draft: PaymentDraft) => void
}

export function PaymentDialog({ open, onOpenChange, initial, onSubmit }: PaymentDialogProps) {
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [dueDay, setDueDay] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? '')
      setAmount(initial ? String(initial.amount) : '')
      setDueDay(initial ? String(initial.dueDay) : '')
      setNote(initial?.note ?? '')
      setError(null)
    }
  }, [open, initial])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedName = name.trim()
    const parsedAmount = Number(amount.replace(',', '.'))
    const parsedDay = Number(dueDay)

    if (!trimmedName) return setError('Укажите название платежа')
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0)
      return setError('Сумма должна быть больше нуля')
    if (!Number.isInteger(parsedDay) || parsedDay < 1 || parsedDay > 31)
      return setError('День месяца — число от 1 до 31')

    onSubmit({
      name: trimmedName,
      amount: Math.round(parsedAmount * 100) / 100,
      dueDay: parsedDay,
      note: note.trim() || undefined,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? 'Редактировать платёж' : 'Новый платёж'}</DialogTitle>
          <DialogDescription>
            Название, сумма и день месяца, до которого нужно заплатить.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4" noValidate>
          <div className="grid gap-2">
            <Label htmlFor="payment-name">Название</Label>
            <Input
              id="payment-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Например, Квартира"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="payment-amount">Сумма, ₽</Label>
              <Input
                id="payment-amount"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="15000"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="payment-day">День месяца</Label>
              <Input
                id="payment-day"
                inputMode="numeric"
                value={dueDay}
                onChange={(e) => setDueDay(e.target.value)}
                placeholder="5"
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="payment-note">Комментарий (необязательно)</Label>
            <Input
              id="payment-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Лицевой счёт, детали…"
            />
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit">{initial ? 'Сохранить' : 'Добавить'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
