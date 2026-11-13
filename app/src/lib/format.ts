const MONTHS_RU = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
]

export function currentPeriodKey(date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

export function periodLabelForKey(key: string): string {
  const [y, m] = key.split('-').map(Number)
  if (!y || !m) return key
  return `${MONTHS_RU[m - 1]} ${y}`
}

const moneyFormatter = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  maximumFractionDigits: 2,
})

export function formatMoney(amount: number): string {
  return moneyFormatter.format(amount)
}

const dateFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

export function formatDate(iso: string): string {
  return dateFormatter.format(new Date(iso))
}

/** Склонение: 1 платёж, 2 платежа, 5 платежей */
export function pluralPayments(n: number): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return 'платёж'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'платежа'
  return 'платежей'
}
