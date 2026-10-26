import type { DayType } from '../core/types'
import { useObjects } from '../db'
import { useT } from '../i18n'
import { Icon } from '../ui'

const FIELDS = [['kcal', ''], ['protein', 'protein'], ['carbs', 'carbs'], ['fat', 'fat']] as const

export default function GoalsPage() {
  const { t } = useT()
  const { items, save, remove, error } = useObjects<DayType>('dayType')

  const create = () => save({ id: crypto.randomUUID(), name: items.length ? t.newDayType : t.firstDayType, goal: { kcal: 2000, protein: 150, carbs: 200, fat: 65 } })

  return (
    <>
      <h1>{t.nav.goals}</h1>
      <p className="muted">{t.goalsIntro}</p>
      {error && <p role="alert" className="error">{error}</p>}
      <ul className="list goals">
        {items.map(dt => (
          // Saves on blur; keyed by its values so it refreshes when changed on another device
          <li key={dt.id + JSON.stringify(dt)} className="card">
            <div className="row">
              <input className="title" defaultValue={dt.name} aria-label={t.dayTypeName}
                onBlur={e => e.target.value.trim() && e.target.value !== dt.name && save({ ...dt, name: e.target.value.trim() })} />
              <button className="icon-btn" aria-label={t.deleteX(dt.name)} onClick={() => confirm(t.confirmDelete(dt.name)) && remove(dt.id)}><Icon n="close" /></button>
            </div>
            <div className="fields">
              {FIELDS.map(([k, cls]) => (
                <label key={k} className={cls}>{k === 'kcal' ? 'kcal' : t.macro[k]}
                  <input type="number" inputMode="decimal" min="0" defaultValue={dt.goal[k]}
                    onBlur={e => {
                      const v = Number(e.target.value)
                      if (e.target.value !== '' && v !== dt.goal[k]) save({ ...dt, goal: { ...dt.goal, [k]: v } })
                    }} />
                </label>
              ))}
            </div>
          </li>
        ))}
      </ul>
      <button className="primary" style={{ marginTop: 16 }} onClick={create}><Icon n="plus" size={18} /> {t.addDayType}</button>
    </>
  )
}
