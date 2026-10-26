import { useEffect, useRef, useState } from 'react'
import { shoppingList, type PackageUsage } from '../core/packages'
import type { FoodMap, Menu } from '../core/types'
import { Icon, thousands } from '../ui'

const qty = (foods: FoodMap, id: string, n: number) =>
  foods[id]?.gramsPerUnit ? `${Math.round(n * 10) / 10} ud` : `${thousands(n)} g`

// Only the packages where something gets thrown away
export function PackageWarnings({ usages, foods, days }: { usages: PackageUsage[]; foods: FoodMap; days: number }) {
  const bad = usages.filter(u => u.wasted > 1)
  if (!bad.length) return null
  return (
    <details className="warnings" open>
      <summary>⚠ {bad.length === 1 ? '1 envase no cuadra' : `${bad.length} envases no cuadran`}</summary>
      <ul>
        {bad.map(u => {
          const f = foods[u.foodId]
          return (
            <li key={u.foodId}>
              <b>{f.name}</b>: tiras <b>{qty(foods, u.foodId, f.gramsPerUnit ? u.wasted / f.gramsPerUnit : u.wasted)}</b> cada {days} días
              {' '}(envase de {f.package!.grams} g, dura {f.package!.daysOpen} días abierto, lo usas {u.usesPerPackage} {u.usesPerPackage === 1 ? 'vez' : 'veces'} en ese tiempo).
              <span className="muted"> Para que cuadre: {u.suggestions.map(s => `${qty(foods, u.foodId, s.amount)} × ${s.uses} ${s.uses === 1 ? 'uso' : 'usos'}`).join(' · ')}</span>
            </li>
          )
        })}
      </ul>
    </details>
  )
}

export function ShoppingDialog({ open, menu, foods, onClose }: { open: boolean; menu: Menu; foods: FoodMap; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const [done, setDone] = useState<Set<string>>(new Set())
  useEffect(() => { if (open) ref.current?.showModal(); else ref.current?.close() }, [open])
  const lines = open ? shoppingList(foods, menu) : []

  return (
    <dialog ref={ref} className="sheet shopping" onClose={onClose}>
      <div className="sheet-body">
        <div className="sheet-header">
          <h2>Lista de la compra</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Cerrar"><Icon n="close" /></button>
        </div>
        <p className="muted">Para los {menu.days.length} días de «{menu.name}», sin comidas libres.</p>
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
                  ? <><b>{l.packages} {l.packages === 1 ? 'envase' : 'envases'}</b> <small>{qty(foods, l.foodId, l.amount)}{l.wasted! > 1 && ` · sobran ${thousands(l.wasted!)} g`}</small></>
                  : <b>{qty(foods, l.foodId, l.amount)}</b>}
              </span>
            </li>
          ))}
        </ul>
        {!lines.length && <p className="muted">El menú está vacío.</p>}
      </div>
    </dialog>
  )
}
