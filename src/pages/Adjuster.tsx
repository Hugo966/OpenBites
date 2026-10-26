import { useEffect, useMemo, useRef, useState } from 'react'
import { adjust, apply, type Option } from '../core/adjuster'
import { MACROS, MEAL_TOLERANCE, mealTotal } from '../core/macros'
import type { FoodMap, Item, Macros, Meal } from '../core/types'
import { r0 } from '../format'
import { Icon } from '../ui'

const LABEL = { kcal: 'Calorías', protein: 'Proteína', carbs: 'Hidratos', fat: 'Grasa' } as const
const UNIT = { kcal: 'kcal', protein: 'g', carbs: 'g', fat: 'g' } as const
const SHORT = { kcal: ' kcal', protein: ' P', carbs: ' HC', fat: ' G' } as const
const signed = (n: number) => { const v = r0(n); return (v > 0 ? '+' : v < 0 ? '−' : '±') + Math.abs(v) }

export function Adjuster({ title, meal, foods, missing, onApply, onClose }: {
  title: string
  meal: Meal | null // null = closed
  foods: FoodMap
  missing?: Macros // what the day is missing to reach its goal
  onApply: (items: Item[]) => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const [target, setTarget] = useState<Record<string, string>>({})
  const [exclude, setExclude] = useState<string[]>([])
  const [tol, setTol] = useState<Macros>(MEAL_TOLERANCE)

  useEffect(() => {
    if (meal && !ref.current?.open) { setTarget({}); setExclude([]); ref.current?.showModal() }
    if (!meal) ref.current?.close()
  }, [meal])

  const request: Partial<Macros> = useMemo(() => Object.fromEntries(
    Object.entries(target).filter(([, v]) => v !== '' && !isNaN(Number(v))).map(([k, v]) => [k, Number(v)])), [target])

  const options = useMemo(
    () => (meal ? adjust(foods, meal.items, { target: request, tolerance: tol, exclude }) : []),
    [meal, foods, request, tol, exclude])

  if (!meal) return <dialog ref={ref} className="sheet" onClose={onClose} />
  const now = mealTotal(foods, meal)
  const name = (id: string) => foods[id]?.name ?? '?'
  const qty = (id: string, n: number) => `${n} ${foods[id]?.gramsPerUnit ? 'ud' : 'g'}`

  function describe(c: Option['changes'][number]) {
    if (c.from === 0) return <><b className="plus">+</b> {name(c.foodId)} <b>{qty(c.foodId, c.to)}</b></>
    if (c.to === 0) return <><b className="minus">−</b> Quitar {name(c.foodId)}</>
    return <>{name(c.foodId)} {qty(c.foodId, c.from)} → <b>{qty(c.foodId, c.to)}</b></>
  }

  return (
    <dialog ref={ref} className="sheet adjuster" onClose={onClose}>
      <div className="sheet-body">
        <div className="sheet-header">
          <h2>Ajustar {title}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Cerrar"><Icon n="close" /></button>
        </div>
        <p className="muted">Ahora: {r0(now.kcal)} kcal · {r0(now.protein)} P · {r0(now.carbs)} HC · {r0(now.fat)} G. Indica cuánto quieres cambiar; deja vacío lo que te dé igual.</p>

        <div className="request">
          {MACROS.map(k => (
            <label key={k} className={k === 'kcal' ? '' : k}>{LABEL[k]} ({UNIT[k]})
              <input type="number" inputMode="decimal" step="any" placeholder="libre" value={target[k] ?? ''}
                onChange={e => setTarget(t => ({ ...t, [k]: e.target.value }))} />
              <small>± <input className="tol" type="number" min="0" step="any" value={tol[k]} aria-label={`Margen ${LABEL[k]}`}
                onChange={e => setTol(t => ({ ...t, [k]: Number(e.target.value) || 0 }))} /></small>
            </label>
          ))}
        </div>
        {missing && (
          <button className="secondary" onClick={() => setTarget(Object.fromEntries(MACROS.map(k => [k, String(r0(missing[k]))])))}>
            Lo que le falta al día ({signed(missing.kcal)} kcal)
          </button>
        )}

        {exclude.length > 0 && (
          <div className="chips">
            <span className="muted">Sin:</span>
            {exclude.map(id => (
              <button key={id} className="chip excluded" onClick={() => setExclude(x => x.filter(e => e !== id))}>
                {name(id)} <Icon n="close" size={12} />
              </button>
            ))}
          </div>
        )}

        <ol className="options">
          {!Object.keys(request).length && <li className="muted">Pon al menos un macro.</li>}
          {Object.keys(request).length > 0 && !options.length && <li className="muted">No encuentro nada que encaje.</li>}
          {options.map((o, i) => (
            <li key={i} className={`option card ${o.within ? 'ok' : ''}`}>
              <ul className="changes">
                {o.changes.map(c => (
                  <li key={c.foodId}>
                    <span>{describe(c)}</span>
                    <button className="icon-btn mini" title="No usar este alimento" aria-label={`No usar ${name(c.foodId)}`}
                      onClick={() => setExclude(x => [...x, c.foodId])}><Icon n="close" size={14} /></button>
                  </li>
                ))}
              </ul>
              <div className="result">
                {MACROS.map(k => (
                  <span key={k} className={`${k} ${k in request ? 'fixed' : ''}`}>{signed(o.delta[k])}{SHORT[k]}</span>
                ))}
                <button className="primary" onClick={() => { onApply(apply(meal.items, o)); onClose() }}>
                  {o.within ? '✓ ' : ''}Aplicar
                </button>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </dialog>
  )
}
