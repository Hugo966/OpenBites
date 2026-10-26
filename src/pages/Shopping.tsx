import { useEffect, useRef, useState } from 'react'
import { shoppingList, type PackageUsage } from '../core/packages'
import type { FoodMap, Menu } from '../core/types'
import { thousands } from '../format'
import { useT } from '../i18n'
import { Icon } from '../ui'

function useQty(foods: FoodMap) {
  const { t } = useT()
  return (id: string, n: number) => (foods[id]?.gramsPerUnit ? `${Math.round(n * 10) / 10} ${t.unit}` : `${thousands(n)} g`)
}

// Only the packages where something gets thrown away
export function PackageWarnings({ usages, foods, days }: { usages: PackageUsage[]; foods: FoodMap; days: number }) {
  const { t } = useT()
  const qty = useQty(foods)
  const bad = usages.filter(u => u.wasted > 1)
  if (!bad.length) return null
  return (
    <details className="warnings" open>
      <summary>⚠ {t.packagesOff(bad.length)}</summary>
      <ul>
        {bad.map(u => {
          const f = foods[u.foodId]
          const [pre, wasted, post] = t.wasteLine(qty(u.foodId, f.gramsPerUnit ? u.wasted / f.gramsPerUnit : u.wasted), days)
          return (
            <li key={u.foodId}>
              <b>{f.name}</b>{pre}<b>{wasted}</b>{post}
              {t.wasteDetail(f.package!.grams, f.package!.daysOpen, u.usesPerPackage)}
              <span className="muted"> {t.toFit}{u.suggestions.map(s => `${qty(u.foodId, s.amount)} × ${t.timesUses(s.uses)}`).join(' · ')}</span>
            </li>
          )
        })}
      </ul>
    </details>
  )
}

export function ShoppingDialog({ open, menu, foods, onClose }: { open: boolean; menu: Menu; foods: FoodMap; onClose: () => void }) {
  const { t } = useT()
  const qty = useQty(foods)
  const ref = useRef<HTMLDialogElement>(null)
  const [done, setDone] = useState<Set<string>>(new Set())
  useEffect(() => { if (open) ref.current?.showModal(); else ref.current?.close() }, [open])
  const lines = open ? shoppingList(foods, menu) : []

  return (
    <dialog ref={ref} className="sheet shopping" onClose={onClose}>
      <div className="sheet-body">
        <div className="sheet-header">
          <h2>{t.shoppingList}</h2>
          <button className="icon-btn" onClick={onClose} aria-label={t.close}><Icon n="close" /></button>
        </div>
        <p className="muted">{t.shoppingFor(menu.days.length, menu.name)}</p>
        <ul className="shopping-list">
          {lines.map(l => (
            <li key={l.foodId} className={done.has(l.foodId) ? 'done' : ''}>
              <label className="check">
                <input type="checkbox" checked={done.has(l.foodId)} onChange={() => setDone(d => {
                  const n = new Set(d)
                  if (!n.delete(l.foodId)) n.add(l.foodId)
                  return n
                })} />
                <span className="item-name">{foods[l.foodId].name}</span>
              </label>
              <span className="qty">
                {l.packages !== undefined
                  ? <><b>{t.packages(l.packages)}</b> <small>{qty(l.foodId, l.amount)}{l.wasted! > 1 && t.leftover(thousands(l.wasted!))}</small></>
                  : <b>{qty(l.foodId, l.amount)}</b>}
              </span>
            </li>
          ))}
        </ul>
        {!lines.length && <p className="muted">{t.emptyMenu}</p>}
      </div>
    </dialog>
  )
}
