import { useEffect, useRef, useState } from 'react'
import type { Food } from '../core/types'
import { useObjects } from '../db'
import { Icon, MacroBar, MacroChips, r0 } from '../ui'

const num = (f: FormData, k: string) => {
  const v = f.get(k) as string
  return v === '' ? undefined : Number(v)
}

function readForm(f: FormData, id: string): Food {
  const pkgGrams = num(f, 'pkgGrams'), daysOpen = num(f, 'daysOpen')
  return {
    id,
    name: (f.get('name') as string).trim(),
    per100: { kcal: num(f, 'kcal')!, protein: num(f, 'protein')!, carbs: num(f, 'carbs')!, fat: num(f, 'fat')! },
    gramsPerUnit: num(f, 'gramsPerUnit'),
    package: pkgGrams && daysOpen ? { grams: pkgGrams, daysOpen } : undefined,
    minGrams: num(f, 'minGrams'),
    maxGrams: num(f, 'maxGrams'),
    neverSuggest: f.get('neverSuggest') === 'on' || undefined,
  }
}

// Avatar color: the macro that contributes the most calories
export const dominantMacro = ({ protein, carbs, fat }: Food['per100']) =>
  protein * 4 >= carbs * 4 && protein * 4 >= fat * 9 ? 'protein' : carbs * 4 >= fat * 9 ? 'carbs' : 'fat'

// `food`: null = closed; without id = new (may come with the name already typed)
export function FoodDialog({ food, onSave, onDelete, onClose }: {
  food: Partial<Food> | null
  onSave: (f: Food) => void | Promise<void>
  onDelete?: (f: Food) => void | Promise<void>
  onClose: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    if (food && !ref.current?.open) ref.current?.showModal()
    if (!food) ref.current?.close()
  }, [food])

  const f = food ?? {}
  const existing = f.id ? (f as Food) : null

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    await onSave(readForm(new FormData(e.currentTarget), f.id ?? crypto.randomUUID()))
    onClose()
  }

  return (
    <dialog ref={ref} className="sheet" onClose={onClose}>
      {food && (
        <form key={f.id ?? f.name ?? 'new'} onSubmit={submit}>
          <div className="sheet-header">
            <h2>{existing ? 'Editar alimento' : 'Nuevo alimento'}</h2>
            <button type="button" className="icon-btn" onClick={onClose} aria-label="Cerrar"><Icon n="close" /></button>
          </div>
          <label>Nombre <input name="name" required defaultValue={f.name} autoFocus={!f.name} /></label>
          <fieldset>
            <legend>Por 100 g</legend>
            <label>kcal <input name="kcal" type="number" inputMode="decimal" step="any" min="0" required defaultValue={f.per100?.kcal} autoFocus={!!f.name && !existing} /></label>
            <label className="protein">Proteína <input name="protein" type="number" inputMode="decimal" step="any" min="0" required defaultValue={f.per100?.protein} /></label>
            <label className="carbs">Hidratos <input name="carbs" type="number" inputMode="decimal" step="any" min="0" required defaultValue={f.per100?.carbs} /></label>
            <label className="fat">Grasa <input name="fat" type="number" inputMode="decimal" step="any" min="0" required defaultValue={f.per100?.fat} /></label>
          </fieldset>
          <details open={!!(f.gramsPerUnit || f.package || f.minGrams || f.maxGrams || f.neverSuggest)}>
            <summary>Más opciones</summary>
            <fieldset>
              <label>g por unidad <input name="gramsPerUnit" type="number" inputMode="decimal" step="any" min="0.1" placeholder="huevo: 60" defaultValue={f.gramsPerUnit} /></label>
              <label>Envase (g) <input name="pkgGrams" type="number" inputMode="decimal" step="any" min="1" defaultValue={f.package?.grams} /></label>
              <label>Días abierto <input name="daysOpen" type="number" inputMode="numeric" min="1" defaultValue={f.package?.daysOpen} /></label>
              <label>Mín g <input name="minGrams" type="number" inputMode="decimal" step="any" min="0" defaultValue={f.minGrams} /></label>
              <label>Máx g <input name="maxGrams" type="number" inputMode="decimal" step="any" min="0" defaultValue={f.maxGrams} /></label>
            </fieldset>
            <label className="check"><input name="neverSuggest" type="checkbox" defaultChecked={f.neverSuggest} /> No sugerirlo en el ajustador</label>
          </details>
          <div className="actions">
            {existing && onDelete && (
              <button type="button" className="danger" onClick={async () => {
                if (confirm(`¿Borrar ${existing.name}?`)) { await onDelete(existing); onClose() }
              }}>Borrar</button>
            )}
            <button className="primary">{existing ? 'Guardar' : 'Añadir'}</button>
          </div>
        </form>
      )}
    </dialog>
  )
}

export default function FoodsPage() {
  const { items, save, remove, error } = useObjects<Food>('food')
  const [editing, setEditing] = useState<Partial<Food> | null>(null)
  const [query, setQuery] = useState('')

  const visible = items
    .filter(f => f.name.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name))

  return (
    <>
      <h1>Alimentos</h1>
      {error && <p role="alert" className="error">{error}</p>}

      <label className="search">
        <Icon n="search" size={18} />
        <input type="search" placeholder="Buscar alimento" value={query} onChange={e => setQuery(e.target.value)} aria-label="Buscar alimento" />
      </label>

      <ul className="list">
        {visible.map(f => (
          <li key={f.id}>
            <button className="card food-card" onClick={() => setEditing(f)}>
              <span className={`avatar ${dominantMacro(f.per100)}`}>{f.name[0]?.toUpperCase()}</span>
              <span className="info">
                <span className="name">{f.name}</span>
                <span className="muted">
                  {['por 100 g', f.gramsPerUnit && `${f.gramsPerUnit} g/ud`, f.package && `envase ${f.package.grams} g · ${f.package.daysOpen} d`, f.neverSuggest && 'no sugerir'].filter(Boolean).join(' · ')}
                </span>
                <MacroBar m={f.per100} />
                <MacroChips m={f.per100} />
              </span>
              <span className="kcal"><b>{r0(f.per100.kcal)}</b> kcal</span>
            </button>
          </li>
        ))}
      </ul>
      {!items.length && (
        <div className="empty">
          <p>Aún no tienes alimentos. También puedes crearlos desde el menú.</p>
          <button className="primary" onClick={() => setEditing({})}>Añadir el primero</button>
        </div>
      )}

      <button className="fab" onClick={() => setEditing({})} aria-label="Nuevo alimento"><Icon n="plus" size={26} /></button>
      <FoodDialog food={editing} onSave={save} onDelete={f => remove(f.id)} onClose={() => setEditing(null)} />
    </>
  )
}
