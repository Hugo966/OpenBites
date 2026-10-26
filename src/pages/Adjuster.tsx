import { useEffect, useMemo, useRef, useState } from 'react'
import { adjust, apply, type Option } from '../core/adjuster'
import { MACROS, MEAL_TOLERANCE, mealTotal } from '../core/macros'
import type { FoodMap, Item, Macros, Meal } from '../core/types'
import { r0 } from '../format'
import { useT } from '../i18n'
import { Icon } from '../ui'

const UNIT = { kcal: 'kcal', protein: 'g', carbs: 'g', fat: 'g' } as const
const signed = (n: number) => { const v = r0(n); return (v > 0 ? '+' : v < 0 ? '−' : '±') + Math.abs(v) }

export function Adjuster({ title, meal, foods, missing, onApply, onClose }: {
  title: string
  meal: Meal | null // null = closed
  foods: FoodMap
  missing?: Macros // what the day is missing to reach its goal
  onApply: (items: Item[]) => void
  onClose: () => void
}) {
  const { t } = useT()
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
  const qty = (id: string, n: number) => `${n} ${foods[id]?.gramsPerUnit ? t.unit : 'g'}`
  const short = (k: (typeof MACROS)[number]) => (k === 'kcal' ? ' kcal' : ` ${t.short[k]}`)

  function describe(c: Option['changes'][number]) {
    if (c.from === 0) return <><b className="plus">+</b> {name(c.foodId)} <b>{qty(c.foodId, c.to)}</b></>
    if (c.to === 0) return <><b className="minus">−</b> {t.removeFood(name(c.foodId))}</>
    return <>{name(c.foodId)} {qty(c.foodId, c.from)} → <b>{qty(c.foodId, c.to)}</b></>
  }

  return (
    <dialog ref={ref} className="sheet adjuster" onClose={onClose}>
      <div className="sheet-body">
        <div className="sheet-header">
          <h2>{t.adjustTitle(title)}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label={t.close}><Icon n="close" /></button>
        </div>
        <p className="muted">{t.now(r0(now.kcal), r0(now.protein), r0(now.carbs), r0(now.fat))}</p>

        <div className="request">
          {MACROS.map(k => (
            <label key={k} className={k === 'kcal' ? '' : k}>{t.macro[k]} ({UNIT[k]})
              <input type="number" inputMode="decimal" step="any" placeholder={t.any} value={target[k] ?? ''}
                onChange={e => setTarget(x => ({ ...x, [k]: e.target.value }))} />
              <small>± <input className="tol" type="number" min="0" step="any" value={tol[k]} aria-label={t.tolerance(t.macro[k])}
                onChange={e => setTol(x => ({ ...x, [k]: Number(e.target.value) || 0 }))} /></small>
            </label>
          ))}
        </div>
        {missing && (
          <button className="secondary" onClick={() => setTarget(Object.fromEntries(MACROS.map(k => [k, String(r0(missing[k]))])))}>
            {t.missingForDay(signed(missing.kcal))}
          </button>
        )}

        {exclude.length > 0 && (
          <div className="chips">
            <span className="muted">{t.without}</span>
            {exclude.map(id => (
              <button key={id} className="chip excluded" onClick={() => setExclude(x => x.filter(e => e !== id))}>
                {name(id)} <Icon n="close" size={12} />
              </button>
            ))}
          </div>
        )}

        <ol className="options">
          {!Object.keys(request).length && <li className="muted">{t.pickAMacro}</li>}
          {Object.keys(request).length > 0 && !options.length && <li className="muted">{t.nothingFits}</li>}
          {options.map((o, i) => (
            <li key={i} className={`option card ${o.within ? 'ok' : ''}`}>
              <ul className="changes">
                {o.changes.map(c => (
                  <li key={c.foodId}>
                    <span>{describe(c)}</span>
                    <button className="icon-btn mini" title={t.dontUse} aria-label={t.dontUseX(name(c.foodId))}
                      onClick={() => setExclude(x => [...x, c.foodId])}><Icon n="close" size={14} /></button>
                  </li>
                ))}
              </ul>
              <div className="result">
                {MACROS.map(k => (
                  <span key={k} className={`${k} ${k in request ? 'fixed' : ''}`}>{signed(o.delta[k])}{short(k)}</span>
                ))}
                <button className="primary" onClick={() => { onApply(apply(meal.items, o)); onClose() }}>
                  {o.within ? '✓ ' : ''}{t.apply}
                </button>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </dialog>
  )
}
