import { useCallback, useEffect, useState } from 'react'
import { DEFAULT_SALARY_SETTINGS, type SalarySettings } from '@/lib/salary'

const STORAGE_KEY = 'mandatory-payments/salary/v1'

function load(): SalarySettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_SALARY_SETTINGS
    const parsed = JSON.parse(raw) as Partial<SalarySettings>
    return { ...DEFAULT_SALARY_SETTINGS, ...parsed }
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

  return { settings, update }
}
