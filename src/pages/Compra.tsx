import { useEffect, useRef, useState } from 'react'
import { listaCompra, type Envase } from '../core/envases'
import type { Alimentos, Menu } from '../core/types'
import { Icono, r0 } from '../ui'

const miles = (n: number) => r0(n).toLocaleString('es-ES')
const ud = (alimentos: Alimentos, id: string, n: number) =>
  alimentos[id]?.gUnidad ? `${Math.round(n * 10) / 10} ud` : `${miles(n)} g`

// Solo los envases donde se tira algo
export function AvisosEnvase({ envases, alimentos, dias }: { envases: Envase[]; alimentos: Alimentos; dias: number }) {
  const malos = envases.filter(e => e.sobran > 1)
  if (!malos.length) return null
  return (
    <details className="avisos" open>
      <summary>⚠ {malos.length === 1 ? '1 envase no cuadra' : `${malos.length} envases no cuadran`}</summary>
      <ul>
        {malos.map(e => {
          const a = alimentos[e.alimentoId]
          return (
            <li key={e.alimentoId}>
              <b>{a.nombre}</b>: tiras <b>{ud(alimentos, e.alimentoId, a.gUnidad ? e.sobran / a.gUnidad : e.sobran)}</b> cada {dias} días
              {' '}(envase de {a.envase!.g} g, dura {a.envase!.diasAbierto} días abierto, lo usas {e.usosPorEnvase} {e.usosPorEnvase === 1 ? 'vez' : 'veces'} en ese tiempo).
              <span className="tenue"> Para que cuadre: {e.sugerencias.map(s => `${ud(alimentos, e.alimentoId, s.cantidad)} × ${s.usos} ${s.usos === 1 ? 'uso' : 'usos'}`).join(' · ')}</span>
            </li>
          )
        })}
      </ul>
    </details>
  )
}

export function DialogoCompra({ abierto, menu, alimentos, onCerrar }: { abierto: boolean; menu: Menu; alimentos: Alimentos; onCerrar: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const [hecho, setHecho] = useState<Set<string>>(new Set())
  useEffect(() => { if (abierto) ref.current?.showModal(); else ref.current?.close() }, [abierto])
  const lineas = abierto ? listaCompra(alimentos, menu) : []

  return (
    <dialog ref={ref} className="hoja compra" onClose={onCerrar}>
      <div className="hoja-cuerpo">
        <div className="hoja-cabecera">
          <h2>Lista de la compra</h2>
          <button className="icono" onClick={onCerrar} aria-label="Cerrar"><Icono n="cerrar" /></button>
        </div>
        <p className="tenue">Para los {menu.dias.length} días de «{menu.nombre}», sin comidas libres.</p>
        <ul className="lista-compra">
          {lineas.map(l => (
            <li key={l.alimentoId} className={hecho.has(l.alimentoId) ? 'hecho' : ''}>
              <label className="check">
                <input type="checkbox" checked={hecho.has(l.alimentoId)} onChange={() => setHecho(h => {
                  const n = new Set(h)
                  if (!n.delete(l.alimentoId)) n.add(l.alimentoId)
                  return n
                })} />
                <span className="item-nombre">{alimentos[l.alimentoId].nombre}</span>
              </label>
              <span className="cuanto">
                {l.envases !== undefined
                  ? <><b>{l.envases} {l.envases === 1 ? 'envase' : 'envases'}</b> <small>{ud(alimentos, l.alimentoId, l.cantidad)}{l.sobran! > 1 && ` · sobran ${miles(l.sobran!)} g`}</small></>
                  : <b>{ud(alimentos, l.alimentoId, l.cantidad)}</b>}
              </span>
            </li>
          ))}
        </ul>
        {!lineas.length && <p className="tenue">El menú está vacío.</p>}
      </div>
    </dialog>
  )
}
