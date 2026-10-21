import type { Macros } from './core/types'

const ICONOS = {
  menu: 'M4 5h16M4 12h16M4 19h10',
  alimentos: 'M12 3c-4 0-7 3.5-7 8 0 5 3.5 10 7 10s7-5 7-10c0-4.5-3-8-7-8zM12 3c0-1 .5-2 2-2',
  platos: 'M3 12a9 9 0 0 0 18 0zM2 12h20M8 8c0-2 1-3 2-4M13 8c0-2 1-3 2-4',
  objetivos: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 12h.01',
  mas: 'M12 5v14M5 12h14',
  buscar: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-5-5',
  cerrar: 'M6 6l12 12M18 6L6 18',
  salir: 'M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H3',
}

export function Icono({ n, size = 22 }: { n: keyof typeof ICONOS; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={ICONOS[n]} />
    </svg>
  )
}

export const r0 = (n: number) => Math.round(n)
export const r1 = (n: number) => Math.round(n * 10) / 10

// Reparto de calorías entre proteína, hidratos y grasa
export function BarraMacros({ m }: { m: Macros }) {
  const p = m.p * 4, hc = m.hc * 4, g = m.g * 9, total = p + hc + g || 1
  return (
    <div className="barra" role="img" aria-label={`Proteína ${r1(m.p)} g, hidratos ${r1(m.hc)} g, grasa ${r1(m.g)} g`}>
      {p > 0 && <span className="p" style={{ width: `${(p / total) * 100}%` }} />}
      {hc > 0 && <span className="hc" style={{ width: `${(hc / total) * 100}%` }} />}
      {g > 0 && <span className="g" style={{ width: `${(g / total) * 100}%` }} />}
    </div>
  )
}

export function ChipsMacros({ m }: { m: Macros }) {
  return (
    <div className="chips">
      <span className="chip p"><b>{r1(m.p)}</b> P</span>
      <span className="chip hc"><b>{r1(m.hc)}</b> HC</span>
      <span className="chip g"><b>{r1(m.g)}</b> G</span>
    </div>
  )
}
