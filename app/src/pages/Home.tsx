import { useState } from 'react'
import { Plus, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PaymentDialog } from '@/components/PaymentDialog'
import { CurrentPeriod } from '@/sections/CurrentPeriod'
import { HistorySection } from '@/sections/HistorySection'
import { usePayments } from '@/hooks/usePayments'
import type { Payment } from '@/types/payment'

export default function Home() {
  const {
    payments,
    paidMap,
    history,
    periodLabel,
    totals,
    addPayment,
    updatePayment,
    deletePayment,
    togglePaid,
    startNewPeriod,
  } = usePayments()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Payment | null>(null)

  return (
    <div className="mx-auto min-h-dvh w-full max-w-xl px-4 pb-28 pt-6 sm:pt-10">
      <header className="mb-6 flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <Wallet className="size-5" />
        </span>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Обязательные платежи</h1>
          <p className="text-sm text-muted-foreground">Текущий период: {periodLabel}</p>
        </div>
      </header>

      <Tabs defaultValue="current">
        <TabsList className="mb-5 grid w-full grid-cols-2">
          <TabsTrigger value="current">Текущие</TabsTrigger>
          <TabsTrigger value="history">
            История{history.length > 0 ? ` (${history.length})` : ''}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="current">
          <CurrentPeriod
            payments={payments}
            paidMap={paidMap}
            periodLabel={periodLabel}
            totals={totals}
            onTogglePaid={togglePaid}
            onEdit={(p) => {
              setEditing(p)
              setDialogOpen(true)
            }}
            onDelete={deletePayment}
            onStartNewPeriod={startNewPeriod}
          />
        </TabsContent>

        <TabsContent value="history">
          <HistorySection history={history} />
        </TabsContent>
      </Tabs>

      {/* Кнопка добавления */}
      <Button
        size="lg"
        onClick={() => {
          setEditing(null)
          setDialogOpen(true)
        }}
        className="fixed bottom-6 right-6 z-40 h-14 gap-2 rounded-full px-6 shadow-lg"
        aria-label="Добавить платёж"
      >
        <Plus className="size-5" />
        Добавить
      </Button>

      <PaymentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={editing}
        onSubmit={(draft) => {
          if (editing) updatePayment(editing.id, draft)
          else addPayment(draft)
        }}
      />
    </div>
  )
}
