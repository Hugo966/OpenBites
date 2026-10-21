import { useEffect, useMemo, useRef, useState } from 'react'
import { ajustar, aplicar, type Opcion } from '../core/ajustador'
import { MACROS, MARGEN_COMIDA, totalComida } from '../core/macros'
import type { Alimentos, Comida, Item, Macros } from '../core/types'
import { Icono, r0 } from '../ui'

const ETIQUETA = { kcal: 'Calorías', p: 'Proteína', hc: 'Hidratos', g: 'Grasa' } as const
const UNIDAD = { kcal: 'kcal', p: 'g', hc: 'g', g: 'g' } as const
const signo = (n: number) => { const v = r0(n); return (v > 0 ? '+' : v < 0 ? '−' : '±') + Math.abs(v) }

export function Ajustador({ titulo, comida, alimentos, falta, onAplicar, onCerrar }: {
  titulo: string
  comida: Comida | null // null = cerrado
  alimentos: Alimentos
  falta?: Macros // lo que le falta al día para su objetivo
  onAplicar: (items: Item[]) => void
  onCerrar: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const [objetivo, setObjetivo] = useState<Record<string, string>>({})
  const [excluir, setExcluir] = useState<string[]>([])
  const [tol, setTol] = useState<Macros>(MARGEN_COMIDA)

  useEffect(() => {
    if (comida && !ref.current?.open) { setObjetivo({}); setExcluir([]); ref.current?.showModal() }
    if (!comida) ref.current?.close()
  }, [comida])

  const pedido: Partial<Macros> = Object.fromEntries(
    Object.entries(objetivo).filter(([, v]) => v !== '' && !isNaN(Number(v))).map(([k, v]) => [k, Number(v)]))

  const opciones = useMemo(
    () => (comida ? ajustar(alimentos, comida.items, { objetivo: pedido, tolerancia: tol, excluir }) : []),
    [comida, alimentos, JSON.stringify(pedido), tol, excluir]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!comida) return <dialog ref={ref} className="hoja" onClose={onCerrar} />
  const actual = totalComida(alimentos, comida)
  const nombre = (id: string) => alimentos[id]?.nombre ?? '?'
  const cant = (id: string, n: number) => `${n} ${alimentos[id]?.gUnidad ? 'ud' : 'g'}`

  function describir(c: Opcion['cambios'][number]) {
    if (c.de === 0) return <><b className="mas">+</b> {nombre(c.alimentoId)} <b>{cant(c.alimentoId, c.a)}</b></>
    if (c.a === 0) return <><b className="menos">−</b> Quitar {nombre(c.alimentoId)}</>
    return <>{nombre(c.alimentoId)} {cant(c.alimentoId, c.de)} → <b>{cant(c.alimentoId, c.a)}</b></>
  }

  return (
    <dialog ref={ref} className="hoja ajustador" onClose={onCerrar}>
      <div className="hoja-cuerpo">
        <div className="hoja-cabecera">
          <h2>Ajustar {titulo}</h2>
          <button type="button" className="icono" onClick={onCerrar} aria-label="Cerrar"><Icono n="cerrar" /></button>
        </div>
        <p className="tenue">Ahora: {r0(actual.kcal)} kcal · {r0(actual.p)} P · {r0(actual.hc)} HC · {r0(actual.g)} G. Indica cuánto quieres cambiar; deja vacío lo que te dé igual.</p>

        <div className="pedido">
          {MACROS.map(k => (
            <label key={k} className={k === 'kcal' ? '' : k}>{ETIQUETA[k]} ({UNIDAD[k]})
              <input type="number" inputMode="decimal" step="any" placeholder="libre" value={objetivo[k] ?? ''}
                onChange={e => setObjetivo(o => ({ ...o, [k]: e.target.value }))} />
              <small>± <input className="tol" type="number" min="0" step="any" value={tol[k]} aria-label={`Margen ${ETIQUETA[k]}`}
                onChange={e => setTol(t => ({ ...t, [k]: Number(e.target.value) || 0 }))} /></small>
            </label>
          ))}
        </div>
        {falta && (
          <button className="secundario" onClick={() => setObjetivo(Object.fromEntries(MACROS.map(k => [k, String(r0(falta[k]))])))}>
            Lo que le falta al día ({signo(falta.kcal)} kcal)
          </button>
        )}

        {excluir.length > 0 && (
          <div className="chips">
            <span className="tenue">Sin:</span>
            {excluir.map(id => (
              <button key={id} className="chip excluido" onClick={() => setExcluir(x => x.filter(e => e !== id))}>
                {nombre(id)} <Icono n="cerrar" size={12} />
              </button>
            ))}
          </div>
        )}

        <ol className="opciones">
          {!Object.keys(pedido).length && <li className="tenue">Pon al menos un macro.</li>}
          {Object.keys(pedido).length > 0 && !opciones.length && <li className="tenue">No encuentro nada que encaje.</li>}
          {opciones.map((o, i) => (
            <li key={i} className={`opcion tarjeta ${o.dentro ? 'ok' : ''}`}>
              <ul className="cambios">
                {o.cambios.map(c => (
                  <li key={c.alimentoId}>
                    <span>{describir(c)}</span>
                    <button className="icono mini" title="No usar este alimento" aria-label={`No usar ${nombre(c.alimentoId)}`}
                      onClick={() => setExcluir(x => [...x, c.alimentoId])}><Icono n="cerrar" size={14} /></button>
                  </li>
                ))}
              </ul>
              <div className="resultado">
                {MACROS.map(k => (
                  <span key={k} className={`${k} ${k in pedido ? 'fijado' : ''}`}>{signo(o.delta[k])}{k === 'kcal' ? ' kcal' : ` ${k.toUpperCase()}`}</span>
                ))}
                <button className="primario" onClick={() => { onAplicar(aplicar(comida.items, o)); onCerrar() }}>
                  {o.dentro ? '✓ ' : ''}Aplicar
                </button>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </dialog>
  )
}
