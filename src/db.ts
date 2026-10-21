import { createClient } from '@supabase/supabase-js'
import { useCallback, useEffect, useState } from 'react'

export const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_KEY)

type Tipo = 'alimento' | 'plato' | 'tipoDia' | 'menu'

// Cada objeto es una fila de `objetos`; su `id` es el de la fila.
// Recarga al volver a la pestaña para ver lo cambiado desde otro dispositivo.
export function useObjetos<T extends { id: string }>(tipo: Tipo) {
  const [lista, setLista] = useState<T[]>([])
  const [error, setError] = useState<string | null>(null)
  const [cargado, setCargado] = useState(false)

  const cargar = useCallback(async () => {
    const { data, error } = await supabase.from('objetos').select('data').eq('tipo', tipo).order('updated_at')
    if (error) setError(error.message)
    else setLista(data.map(r => r.data as T))
    setCargado(true)
  }, [tipo])

  useEffect(() => {
    cargar()
    window.addEventListener('focus', cargar)
    return () => window.removeEventListener('focus', cargar)
  }, [cargar])

  const guardar = async (obj: T) => {
    const { error } = await supabase.from('objetos')
      .upsert({ id: obj.id, tipo, data: obj, updated_at: new Date().toISOString() })
    if (error) return setError(error.message)
    setLista(l => (l.some(o => o.id === obj.id) ? l.map(o => (o.id === obj.id ? obj : o)) : [...l, obj]))
  }

  const borrar = async (id: string) => {
    const { error } = await supabase.from('objetos').delete().eq('id', id)
    if (error) return setError(error.message)
    setLista(l => l.filter(o => o.id !== id))
  }

  return { lista, guardar, borrar, error, cargado }
}
