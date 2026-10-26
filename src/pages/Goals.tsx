import type { DayType } from '../core/types'
import { useObjects } from '../db'
import { Icon } from '../ui'

const FIELDS = [['kcal', 'kcal', ''], ['protein', 'Proteína', 'protein'], ['carbs', 'Hidratos', 'carbs'], ['fat', 'Grasa', 'fat']] as const

export default function GoalsPage() {
  const { items, save, remove, error } = useObjects<DayType>('dayType')

  const create = () => save({ id: crypto.randomUUID(), name: items.length ? 'Nuevo tipo' : 'Entreno', goal: { kcal: 2000, protein: 150, carbs: 200, fat: 65 } })

  return (
    <>
      <h1>Objetivos</h1>
      <p className="muted">Cada día del menú tiene un tipo (entreno, descanso…) con su objetivo diario. Se cumple si queda a ±20 kcal y ±5 g por macro.</p>
      {error && <p role="alert" className="error">{error}</p>}
      <ul className="list goals">
        {items.map(t => (
          // Saves on blur; keyed by its values so it refreshes when changed on another device
          <li key={t.id + JSON.stringify(t)} className="card">
            <div className="row">
              <input className="title" defaultValue={t.name} aria-label="Nombre del tipo de día"
                onBlur={e => e.target.value.trim() && e.target.value !== t.name && save({ ...t, name: e.target.value.trim() })} />
              <button className="icon-btn" aria-label={`Borrar ${t.name}`} onClick={() => confirm(`¿Borrar ${t.name}?`) && remove(t.id)}><Icon n="close" /></button>
            </div>
            <div className="fields">
              {FIELDS.map(([k, label, cls]) => (
                <label key={k} className={cls}>{label}
                  <input type="number" inputMode="decimal" min="0" defaultValue={t.goal[k]}
                    onBlur={e => {
                      const v = Number(e.target.value)
                      if (e.target.value !== '' && v !== t.goal[k]) save({ ...t, goal: { ...t.goal, [k]: v } })
                    }} />
                </label>
              ))}
            </div>
          </li>
        ))}
      </ul>
      <button className="primary" style={{ marginTop: 16 }} onClick={create}><Icon n="plus" size={18} /> Añadir tipo de día</button>
    </>
  )
}
