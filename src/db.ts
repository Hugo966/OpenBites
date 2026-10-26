import { createClient } from '@supabase/supabase-js'
import { useCallback, useEffect, useState } from 'react'

export const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_KEY)

type Kind = 'food' | 'dish' | 'dayType' | 'menu'

// Each object is a row in `objects`; its `id` is the row id.
// Reloads when the tab regains focus to pick up changes made on another device.
export function useObjects<T extends { id: string }>(kind: Kind) {
  const [items, setItems] = useState<T[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('objects').select('data').eq('kind', kind).order('updated_at')
    if (error) setError(error.message)
    else setItems(data.map(r => r.data as T))
    setLoaded(true)
  }, [kind])

  useEffect(() => {
    load()
    window.addEventListener('focus', load)
    return () => window.removeEventListener('focus', load)
  }, [load])

  const save = async (obj: T) => {
    const { error } = await supabase.from('objects')
      .upsert({ id: obj.id, kind, data: obj, updated_at: new Date().toISOString() })
    if (error) return setError(error.message)
    setItems(l => (l.some(o => o.id === obj.id) ? l.map(o => (o.id === obj.id ? obj : o)) : [...l, obj]))
  }

  const remove = async (id: string) => {
    const { error } = await supabase.from('objects').delete().eq('id', id)
    if (error) return setError(error.message)
    setItems(l => l.filter(o => o.id !== id))
  }

  return { items, save, remove, error, loaded }
}
