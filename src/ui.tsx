import type { Macros } from './core/types'

const ICONS = {
  menu: 'M4 5h16M4 12h16M4 19h10',
  foods: 'M12 3c-4 0-7 3.5-7 8 0 5 3.5 10 7 10s7-5 7-10c0-4.5-3-8-7-8zM12 3c0-1 .5-2 2-2',
  goals: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 12h.01',
  plus: 'M12 5v14M5 12h14',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-5-5',
  close: 'M6 6l12 12M18 6L6 18',
  adjust: 'M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1M15 4v4M9 10v4M17 16v4',
  cart: 'M3 4h2l2.5 11h11L21 7H6.5M9 20h.01M18 20h.01',
  copy: 'M9 9h10v10H9zM5 15V5h10',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  logout: 'M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H3',
}

export function Icon({ n, size = 22 }: { n: keyof typeof ICONS; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={ICONS[n]} />
    </svg>
  )
}

export const r0 = (n: number) => Math.round(n)
export const r1 = (n: number) => Math.round(n * 10) / 10
export const thousands = (n: number) => r0(n).toLocaleString('es-ES')

// Calorie split between protein, carbs and fat
export function MacroBar({ m }: { m: Macros }) {
  const p = m.protein * 4, c = m.carbs * 4, f = m.fat * 9, total = p + c + f || 1
  return (
    <div className="macro-bar" role="img" aria-label={`Proteína ${r1(m.protein)} g, hidratos ${r1(m.carbs)} g, grasa ${r1(m.fat)} g`}>
      {p > 0 && <span className="protein" style={{ width: `${(p / total) * 100}%` }} />}
      {c > 0 && <span className="carbs" style={{ width: `${(c / total) * 100}%` }} />}
      {f > 0 && <span className="fat" style={{ width: `${(f / total) * 100}%` }} />}
    </div>
  )
}

export function MacroChips({ m }: { m: Macros }) {
  return (
    <div className="chips">
      <span className="chip protein"><b>{r1(m.protein)}</b> P</span>
      <span className="chip carbs"><b>{r1(m.carbs)}</b> HC</span>
      <span className="chip fat"><b>{r1(m.fat)}</b> G</span>
    </div>
  )
}
