import { useCallback, useEffect, useState } from 'react'
import { DEFAULT_SALARY_SETTINGS, type SalaryBonus, type SalaryChange, type SalarySettings } from '@/lib/salary'

const STORAGE_KEY = 'mandatory-payments/salary/v1'

function load(): SalarySettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_SALARY_SETTINGS
    const parsed = JSON.parse(raw) as Partial<SalarySettings>
    return {
      ...DEFAULT_SALARY_SETTINGS,
      ...parsed,
      bonuses: Array.isArray(parsed.bonuses) ? parsed.bonuses : [],
      salaryChanges: Array.isArray(parsed.salaryChanges) ? parsed.salaryChanges : [],
    }
  } catch {
    return DEFAULT_SALARY_SETTINGS
  }
}

export function useSalarySettings() {
  const [settings, setSettings] = useState<SalarySettings>(load)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    } catch {
      // ignore
    }
  }, [settings])

  const update = useCallback((patch: Partial<SalarySettings>) => {
    setSettings((s) => ({ ...s, ...patch }))
  }, [])

  const addBonus = useCallback((bonus: SalaryBonus) => {
    setSettings((s) => ({ ...s, bonuses: [...s.bonuses, bonus] }))
  }, [])

  const removeBonus = useCallback((id: string) => {
    setSettings((s) => ({ ...s, bonuses: s.bonuses.filter((bonus) => bonus.id !== id) }))
  }, [])

  const saveSalaryChange = useCallback((change: SalaryChange) => {
    setSettings((s) => ({
      ...s,
      salaryChanges: [...s.salaryChanges.filter((item) => item.date !== change.date), change]
        .sort((a, b) => a.date.localeCompare(b.date)),
    }))
  }, [])

  const removeSalaryChange = useCallback((date: string) => {
    setSettings((s) => ({ ...s, salaryChanges: s.salaryChanges.filter((change) => change.date !== date) }))
  }, [])

  return { settings, update, addBonus, removeBonus, saveSalaryChange, removeSalaryChange }
}
