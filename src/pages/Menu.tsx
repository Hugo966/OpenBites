import { useEffect, useMemo, useRef, useState } from 'react'
import { DAY_TOLERANCE, dayTotal, isFreeDay, itemMacros, MACROS, mealTotal, subtract, withinTolerance } from '../core/macros'
import { analyzePackages } from '../core/packages'
import type { DayType, Food, FoodMap, Macros, Meal, Menu } from '../core/types'
import { useObjects } from '../db'
import { Icon, MacroChips, r0, thousands } from '../ui'
import { Adjuster } from './Adjuster'
import { dominantMacro, FoodDialog } from './Foods'
import { PackageWarnings, ShoppingDialog } from './Shopping'

const DAY_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
const MEAL_NAMES = ['Desayuno', 'Comida', 'Merienda', 'Cena']
const emptyMeals = (n: number): Meal[] => Array.from({ length: n }, () => ({ items: [] }))

const newMenu = (): Menu => ({
  id: crypto.randomUUID(), name: 'Mi menú', mealNames: [...MEAL_NAMES],
  days: DAY_NAMES.map(name => ({ name, meals: emptyMeals(MEAL_NAMES.length) })),
})

const storage = {
  get: (k: string) => { try { return localStorage.getItem(k) } catch { return null } },
  set: (k: string, v: string) => { try { localStorage.setItem(k, v) } catch { /* no storage available */ } },
}

type Cell = { d: number; m: number } // day index, meal row index

export default function MenuPage() {
  const menus = useObjects<Menu>('menu')
  const foodList = useObjects<Food>('food')
  const dayTypes = useObjects<DayType>('dayType')
  const foods: FoodMap = useMemo(() => Object.fromEntries(foodList.items.map(f => [f.id, f])), [foodList.items])

  const [selectedId, setSelectedId] = useState(() => storage.get('menu'))
  const saved = menus.items.find(m => m.id === selectedId) ?? menus.items[0]
  // Local copy while editing; saved 600 ms after the last change
  const [draft, setDraft] = useState<Menu | null>(null)
  const menu = draft && draft.id === saved?.id ? draft : saved
  const pending = useRef<{ m: Menu; t: number } | null>(null)

  const [addTo, setAddTo] = useState<Cell | null>(null)
  const [newFood, setNewFood] = useState<Partial<Food> | null>(null)
  const [adjusting, setAdjusting] = useState<Cell | null>(null)
  const [shopping, setShopping] = useState(false)

  const saveNow = async (m: Menu) => {
    pending.current = null
    await menus.save(m)
    setDraft(d => (d === m ? null : d))
  }
  // Leaving the page doesn't lose the last edit
  useEffect(() => () => { if (pending.current) { clearTimeout(pending.current.t); menus.save(pending.current.m) } }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function edit(f: (m: Menu) => void) {
    if (!menu) return
    const m = structuredClone(menu)
    f(m)
    setDraft(m)
    if (pending.current) clearTimeout(pending.current.t)
    pending.current = { m, t: window.setTimeout(() => saveNow(m), 600) }
  }

  function select(id: string) { setSelectedId(id); storage.set('menu', id) }
  async function create(m: Menu) { await menus.save(m); select(m.id) }

  function addFood(f: Food) {
    if (!addTo) return
    const { d, m: row } = addTo
    edit(m => { m.days[d].meals[row].items.push({ foodId: f.id, amount: f.gramsPerUnit ? 1 : 100 }) })
    setAddTo(null)
  }

  if (!menus.loaded) return null
  if (!menu) return (
    <div className="empty">
      <h1>Tu menú</h1>
      <p>Crea un menú semanal: 7 días × desayuno, comida, merienda y cena. Luego lo adaptas a lo que quieras.</p>
      <button className="primary" onClick={() => create(newMenu())}>Crear mi primer menú</button>
    </div>
  )

  const typesById = Object.fromEntries(dayTypes.items.map(t => [t.id, t]))
  const packages = analyzePackages(foods, menu)
  const wasteful = new Set(packages.filter(p => p.wasted > 1).map(p => p.foodId))
  const regularDays = menu.days.filter(d => !isFreeDay(d))
  const average = regularDays.length ? regularDays.reduce((s, d) => s + dayTotal(foods, d).kcal, 0) / regularDays.length : 0

  return (
    <>
      <div className="menu-bar">
        <input className="menu-title" value={menu.name} aria-label="Nombre del menú"
          onChange={e => edit(m => { m.name = e.target.value })} />
        {menus.items.length > 1 && (
          <select value={menu.id} onChange={e => select(e.target.value)} aria-label="Cambiar de menú">
            {[...menus.items].sort((a, b) => a.name.localeCompare(b.name)).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        )}
        <div className="menu-actions">
          <button className="secondary" onClick={() => setShopping(true)}><Icon n="cart" size={18} /> Compra</button>
          <button className="secondary" onClick={() => create(newMenu())}><Icon n="plus" size={18} /> Nuevo</button>
          <button className="secondary" onClick={() => create({ ...structuredClone(menu), id: crypto.randomUUID(), name: `${menu.name} (copia)` })}><Icon n="copy" size={18} /> Duplicar</button>
          <button className="icon-btn" aria-label="Borrar menú" onClick={async () => {
            if (confirm(`¿Borrar el menú «${menu.name}»?`)) { setDraft(null); await menus.remove(menu.id) }
          }}><Icon n="trash" size={18} /></button>
        </div>
        <span className="muted save-state">{draft ? 'Guardando…' : 'Guardado'}</span>
      </div>
      <p className="muted summary">{menu.days.length} días · media <b>{thousands(average)} kcal/día</b>{regularDays.length < menu.days.length && ' (sin contar días libres)'}</p>
      {menus.error && <p role="alert" className="error">{menus.error}</p>}
      <PackageWarnings usages={packages} foods={foods} days={menu.days.length} />

      <div className="grid-scroll">
        <table className="grid">
          <thead>
            <tr>
              <th className="corner" />
              {menu.days.map((day, d) => (
                <th key={d} scope="col">
                  <div className="day-header">
                    <div className="row">
                      <input className="day-name" value={day.name} aria-label="Nombre del día"
                        onChange={e => edit(m => { m.days[d].name = e.target.value })} />
                      <button className="icon-btn mini" aria-label={`Duplicar ${day.name}`}
                        onClick={() => edit(m => { m.days.splice(d + 1, 0, { ...structuredClone(m.days[d]), name: `${m.days[d].name} (copia)` }) })}><Icon n="copy" size={16} /></button>
                      <button className="icon-btn mini" aria-label={`Borrar ${day.name}`}
                        onClick={() => confirm(`¿Borrar ${day.name}?`) && edit(m => { m.days.splice(d, 1) })}><Icon n="trash" size={16} /></button>
                    </div>
                    <select value={day.dayTypeId ?? ''} aria-label="Tipo de día"
                      onChange={e => edit(m => { m.days[d].dayTypeId = e.target.value || undefined })}>
                      <option value="">{dayTypes.items.length ? 'Sin objetivo' : 'Sin objetivo (créalos en Objetivos)'}</option>
                      {dayTypes.items.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                    <DaySummary total={dayTotal(foods, day)} goal={typesById[day.dayTypeId ?? '']?.goal} free={isFreeDay(day)} />
                  </div>
                </th>
              ))}
              <th className="add-col">
                <button className="ghost" onClick={() => edit(m => {
                  m.days.push({ name: DAY_NAMES[m.days.length % 7], meals: emptyMeals(m.mealNames.length) })
                })}><Icon n="plus" /> Día</button>
              </th>
            </tr>
          </thead>
          <tbody>
            {menu.mealNames.map((mealName, row) => (
              <tr key={row}>
                <th scope="row">
                  <input className="row-name" value={mealName} aria-label="Nombre de la comida"
                    onChange={e => edit(m => { m.mealNames[row] = e.target.value })} />
                  <button className="icon-btn mini" aria-label={`Borrar fila ${mealName}`}
                    onClick={() => confirm(`¿Borrar la fila «${mealName}» en todos los días?`) && edit(m => {
                      m.mealNames.splice(row, 1)
                      m.days.forEach(day => day.meals.splice(row, 1))
                    })}><Icon n="trash" size={16} /></button>
                </th>
                {menu.days.map((day, d) => (
                  <td key={d}>
                    <MealCell title={mealName} meal={day.meals[row]} foods={foods} wasteful={wasteful}
                      onAdd={() => setAddTo({ d, m: row })}
                      onAdjust={() => setAdjusting({ d, m: row })}
                      onChange={fn => edit(m => fn(m.days[d].meals[row]))} />
                  </td>
                ))}
                <td />
              </tr>
            ))}
            <tr>
              <th scope="row">
                <button className="ghost" onClick={() => edit(m => {
                  m.mealNames.push('Nueva comida')
                  m.days.forEach(day => day.meals.push({ items: [] }))
                })}><Icon n="plus" /> Comida</button>
              </th>
            </tr>
          </tbody>
        </table>
      </div>

      {(() => {
        const day = adjusting && menu.days[adjusting.d]
        const goal = day && !isFreeDay(day) ? typesById[day.dayTypeId ?? '']?.goal : undefined
        return (
          <Adjuster foods={foods} onClose={() => setAdjusting(null)}
            title={day ? `${menu.mealNames[adjusting.m].toLowerCase()} · ${day.name}` : ''}
            meal={day ? day.meals[adjusting.m] : null}
            missing={day && goal ? subtract(goal, dayTotal(foods, day)) : undefined}
            onApply={items => edit(m => { m.days[adjusting!.d].meals[adjusting!.m].items = items })} />
        )
      })()}
      {/* Creating a food closes the picker but keeps the target cell until the food is saved */}
      <FoodPicker open={!!addTo && !newFood} foods={foodList.items} onPick={addFood}
        onCreate={name => setNewFood({ name })} onClose={() => !newFood && setAddTo(null)} />
      <ShoppingDialog open={shopping} menu={menu} foods={foods} onClose={() => setShopping(false)} />
      <FoodDialog food={newFood} onClose={() => { setNewFood(null); setAddTo(null) }}
        onSave={async f => { await foodList.save(f); addFood(f) }} />
    </>
  )
}

function DaySummary({ total, goal, free }: { total: Macros; goal?: Macros; free: boolean }) {
  if (free) return <div className="day-summary free"><b>{thousands(total.kcal)}</b> kcal · día libre</div>
  if (!goal) return <div className="day-summary"><b>{thousands(total.kcal)}</b> kcal<MacroChips m={total} /></div>
  const ok = withinTolerance(total, goal, DAY_TOLERANCE)
  const pct = Math.min(100, (total.kcal / (goal.kcal || 1)) * 100)
  return (
    <div className={`day-summary ${ok ? 'ok' : ''}`}>
      <div><b>{thousands(total.kcal)}</b> / {thousands(goal.kcal)} kcal {ok && '✓'}</div>
      <div className="progress"><span style={{ width: `${pct}%` }} /></div>
      <div className="vs">
        {MACROS.slice(1).map(k => {
          const diff = total[k] - goal[k]
          return (
            <span key={k} className={k} title={`${diff > 0 ? 'sobran' : 'faltan'} ${Math.abs(r0(diff))} g`}>
              <b>{r0(total[k])}</b>/{r0(goal[k])}
              {Math.abs(diff) > DAY_TOLERANCE[k] && <small>{diff > 0 ? '+' : '−'}{Math.abs(r0(diff))}</small>}
            </span>
          )
        })}
      </div>
    </div>
  )
}

function MealCell({ title, meal, foods, wasteful, onAdd, onAdjust, onChange }: {
  title: string
  meal: Meal
  foods: FoodMap
  wasteful: Set<string>
  onAdd: () => void
  onAdjust: () => void
  onChange: (f: (m: Meal) => void) => void
}) {
  const total = mealTotal(foods, meal)
  return (
    <div className={`cell ${meal.free ? 'is-free' : ''}`}>
      <div className="cell-title">{title}</div>
      {meal.free
        ? <div className="free-label">Comida libre</div>
        : meal.items.map((it, i) => {
          const f = foods[it.foodId]
          return (
            <div className="item" key={i}>
              <span className={`dot ${f ? dominantMacro(f.per100) : ''}`} />
              <span className={`item-name ${wasteful.has(it.foodId) ? 'warn' : ''}`}
                title={wasteful.has(it.foodId) ? `${f?.name}: el envase no cuadra, mira los avisos` : f?.name}>{f?.name ?? 'Alimento borrado'}</span>
              <AmountInput value={it.amount} step={f?.gramsPerUnit ? 1 : 5}
                onChange={v => onChange(m => { m.items[i].amount = v })} />
              <span className="unit">{f?.gramsPerUnit ? 'ud' : 'g'}</span>
              <span className="item-kcal">{r0(itemMacros(foods, it).kcal)}</span>
              <button className="remove" aria-label={`Quitar ${f?.name ?? 'alimento'}`}
                onClick={() => onChange(m => { m.items.splice(i, 1) })}><Icon n="close" size={14} /></button>
            </div>
          )
        })}
      <div className="cell-footer">
        {!meal.free && <button className="add" onClick={onAdd}><Icon n="plus" size={16} /> Añadir</button>}
        {!meal.free && meal.items.length > 0 && <button className="add" onClick={onAdjust} aria-label={`Ajustar ${title}`} title="Ajustar macros"><Icon n="adjust" size={16} /></button>}
        <button className={`free-toggle ${meal.free ? 'active' : ''}`} aria-pressed={!!meal.free}
          onClick={() => onChange(m => { m.free = !m.free || undefined })}>Libre</button>
        {!meal.free && meal.items.length > 0 && <span className="cell-total">{r0(total.kcal)} kcal</span>}
      </div>
    </div>
  )
}

// Number input that can be cleared and retyped without jumping to 0
function AmountInput({ value, step, onChange }: { value: number; step: number; onChange: (v: number) => void }) {
  const [text, setText] = useState(String(value))
  const [focused, setFocused] = useState(false)
  return (
    <input className="amount" type="number" inputMode="decimal" min="0" step={step} value={focused ? text : String(value)} aria-label="Cantidad"
      onFocus={e => { setText(String(value)); setFocused(true); e.target.select() }}
      onBlur={() => setFocused(false)}
      onChange={e => {
        setText(e.target.value)
        if (e.target.value !== '' && Number(e.target.value) >= 0) onChange(Number(e.target.value))
      }} />
  )
}

function FoodPicker({ open, foods, onPick, onCreate, onClose }: {
  open: boolean
  foods: Food[]
  onPick: (f: Food) => void
  onCreate: (name: string) => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const [q, setQ] = useState('')
  useEffect(() => {
    if (open) { setQ(''); ref.current?.showModal() } else ref.current?.close()
  }, [open])

  const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
  const results = foods.filter(f => norm(f.name).includes(norm(q))).sort((a, b) => a.name.localeCompare(b.name)).slice(0, 40)
  const create = () => onCreate(q.trim())

  return (
    <dialog ref={ref} className="sheet picker" onClose={onClose}>
      <div className="picker-header">
        <label className="search">
          <Icon n="search" size={18} />
          <input autoFocus placeholder="Buscar o crear alimento" value={q} onChange={e => setQ(e.target.value)} aria-label="Buscar alimento"
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (results[0]) onPick(results[0]); else if (q.trim()) create() } }} />
        </label>
        <button className="icon-btn" onClick={onClose} aria-label="Cerrar"><Icon n="close" /></button>
      </div>
      <ul className="picker-list">
        {results.map(f => (
          <li key={f.id}>
            <button onClick={() => onPick(f)}>
              <span className={`dot ${dominantMacro(f.per100)}`} />
              <span className="item-name">{f.name}</span>
              <span className="muted">{r0(f.per100.kcal)} kcal/100 g{f.gramsPerUnit ? ` · ${f.gramsPerUnit} g/ud` : ''}</span>
            </button>
          </li>
        ))}
        <li>
          <button className="create" onClick={create}>
            <Icon n="plus" size={18} /> {q.trim() ? <>Crear «{q.trim()}»</> : 'Crear alimento nuevo'}
          </button>
        </li>
      </ul>
    </dialog>
  )
}
