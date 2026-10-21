import type { TipoDia } from '../core/types'
import { useObjetos } from '../db'
import { Icono } from '../ui'

const CAMPOS = [['kcal', 'kcal', ''], ['p', 'Proteína', 'p'], ['hc', 'Hidratos', 'hc'], ['g', 'Grasa', 'g']] as const

export default function ObjetivosPage() {
  const { lista, guardar, borrar, error } = useObjetos<TipoDia>('tipoDia')

  const nuevo = () => guardar({ id: crypto.randomUUID(), nombre: lista.length ? 'Nuevo tipo' : 'Entreno', objetivo: { kcal: 2000, p: 150, hc: 200, g: 65 } })

  return (
    <>
      <h1>Objetivos</h1>
      <p className="tenue">Cada día del menú tiene un tipo (entreno, descanso…) con su objetivo diario. Se cumple si queda a ±20 kcal y ±5 g por macro.</p>
      {error && <p role="alert" className="error">{error}</p>}
      <ul className="lista objetivos">
        {lista.map(t => (
          // Guarda al salir de cada campo; key con los valores para refrescar si cambian desde otro dispositivo
          <li key={t.id + JSON.stringify(t)} className="tarjeta">
            <div className="fila">
              <input className="titulo" defaultValue={t.nombre} aria-label="Nombre del tipo de día"
                onBlur={e => e.target.value.trim() && e.target.value !== t.nombre && guardar({ ...t, nombre: e.target.value.trim() })} />
              <button className="icono" aria-label={`Borrar ${t.nombre}`} onClick={() => confirm(`¿Borrar ${t.nombre}?`) && borrar(t.id)}><Icono n="cerrar" /></button>
            </div>
            <div className="campos">
              {CAMPOS.map(([k, etiqueta, clase]) => (
                <label key={k} className={clase}>{etiqueta}
                  <input type="number" inputMode="decimal" min="0" defaultValue={t.objetivo[k]}
                    onBlur={e => {
                      const v = Number(e.target.value)
                      if (e.target.value !== '' && v !== t.objetivo[k]) guardar({ ...t, objetivo: { ...t.objetivo, [k]: v } })
                    }} />
                </label>
              ))}
            </div>
          </li>
        ))}
      </ul>
      <button className="primario" style={{ marginTop: 16 }} onClick={nuevo}><Icono n="mas" size={18} /> Añadir tipo de día</button>
    </>
  )
}
