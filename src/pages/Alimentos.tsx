import { useRef, useState } from 'react'
import type { Alimento } from '../core/types'
import { useObjetos } from '../db'
import { BarraMacros, ChipsMacros, Icono, r0 } from '../ui'

const num = (f: FormData, k: string) => {
  const v = f.get(k) as string
  return v === '' ? undefined : Number(v)
}

function leer(f: FormData, id: string): Alimento {
  const envaseG = num(f, 'envaseG'), dias = num(f, 'diasAbierto')
  return {
    id,
    nombre: (f.get('nombre') as string).trim(),
    por100: { kcal: num(f, 'kcal')!, p: num(f, 'p')!, hc: num(f, 'hc')!, g: num(f, 'g')! },
    gUnidad: num(f, 'gUnidad'),
    envase: envaseG && dias ? { g: envaseG, diasAbierto: dias } : undefined,
    minG: num(f, 'minG'),
    maxG: num(f, 'maxG'),
    nuncaSugerir: f.get('nuncaSugerir') === 'on' || undefined,
  }
}

// Color del avatar según el macro que más calorías aporta
const dominante = ({ p, hc, g }: Alimento['por100']) =>
  p * 4 >= hc * 4 && p * 4 >= g * 9 ? 'p' : hc * 4 >= g * 9 ? 'hc' : 'g'

export default function AlimentosPage() {
  const { lista, guardar, borrar, error } = useObjetos<Alimento>('alimento')
  const [editando, setEditando] = useState<Alimento | null>(null)
  const [filtro, setFiltro] = useState('')
  const dialogo = useRef<HTMLDialogElement>(null)

  const visibles = lista
    .filter(a => a.nombre.toLowerCase().includes(filtro.toLowerCase()))
    .sort((a, b) => a.nombre.localeCompare(b.nombre))

  function abrir(a: Alimento | null) {
    setEditando(a)
    dialogo.current?.showModal()
  }

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    await guardar(leer(new FormData(e.currentTarget), editando?.id ?? crypto.randomUUID()))
    dialogo.current?.close()
  }

  return (
    <>
      {error && <p role="alert" className="error">{error}</p>}

      <label className="buscador">
        <Icono n="buscar" size={18} />
        <input type="search" placeholder="Buscar alimento" value={filtro} onChange={e => setFiltro(e.target.value)} aria-label="Buscar alimento" />
      </label>

      <ul className="lista">
        {visibles.map(a => (
          <li key={a.id}>
            <button className="tarjeta alimento" onClick={() => abrir(a)}>
              <span className={`avatar ${dominante(a.por100)}`}>{a.nombre[0]?.toUpperCase()}</span>
              <span className="info">
                <span className="nombre">{a.nombre}</span>
                <span className="tenue">
                  {['por 100 g', a.gUnidad && `${a.gUnidad} g/ud`, a.envase && `envase ${a.envase.g} g · ${a.envase.diasAbierto} d`, a.nuncaSugerir && 'no sugerir'].filter(Boolean).join(' · ')}
                </span>
                <BarraMacros m={a.por100} />
                <ChipsMacros m={a.por100} />
              </span>
              <span className="kcal"><b>{r0(a.por100.kcal)}</b> kcal</span>
            </button>
          </li>
        ))}
      </ul>
      {!lista.length && (
        <div className="vacio">
          <p>Aún no tienes alimentos.</p>
          <button className="primario" onClick={() => abrir(null)}>Añadir el primero</button>
        </div>
      )}

      <button className="fab" onClick={() => abrir(null)} aria-label="Nuevo alimento"><Icono n="mas" size={26} /></button>

      <dialog ref={dialogo} className="hoja" onClose={() => setEditando(null)}>
        {/* key: remonta el formulario al cambiar de alimento para cargar sus valores */}
        <form key={editando?.id ?? 'nuevo'} onSubmit={enviar}>
          <div className="hoja-cabecera">
            <h2>{editando ? 'Editar alimento' : 'Nuevo alimento'}</h2>
            <button type="button" className="icono" onClick={() => dialogo.current?.close()} aria-label="Cerrar"><Icono n="cerrar" /></button>
          </div>
          <label>Nombre <input name="nombre" required defaultValue={editando?.nombre} /></label>
          <fieldset>
            <legend>Por 100 g</legend>
            <label>kcal <input name="kcal" type="number" inputMode="decimal" step="any" min="0" required defaultValue={editando?.por100.kcal} /></label>
            <label className="p">Proteína <input name="p" type="number" inputMode="decimal" step="any" min="0" required defaultValue={editando?.por100.p} /></label>
            <label className="hc">Hidratos <input name="hc" type="number" inputMode="decimal" step="any" min="0" required defaultValue={editando?.por100.hc} /></label>
            <label className="g">Grasa <input name="g" type="number" inputMode="decimal" step="any" min="0" required defaultValue={editando?.por100.g} /></label>
          </fieldset>
          <details open={!!(editando?.gUnidad || editando?.envase || editando?.minG || editando?.maxG || editando?.nuncaSugerir)}>
            <summary>Más opciones</summary>
            <fieldset>
              <label>g por unidad <input name="gUnidad" type="number" inputMode="decimal" step="any" min="0.1" placeholder="huevo: 60" defaultValue={editando?.gUnidad} /></label>
              <label>Envase (g) <input name="envaseG" type="number" inputMode="decimal" step="any" min="1" defaultValue={editando?.envase?.g} /></label>
              <label>Días abierto <input name="diasAbierto" type="number" inputMode="numeric" min="1" defaultValue={editando?.envase?.diasAbierto} /></label>
              <label>Mín g <input name="minG" type="number" inputMode="decimal" step="any" min="0" defaultValue={editando?.minG} /></label>
              <label>Máx g <input name="maxG" type="number" inputMode="decimal" step="any" min="0" defaultValue={editando?.maxG} /></label>
            </fieldset>
            <label className="check"><input name="nuncaSugerir" type="checkbox" defaultChecked={editando?.nuncaSugerir} /> No sugerirlo en el ajustador</label>
          </details>
          <div className="acciones">
            {editando && (
              <button type="button" className="peligro" onClick={async () => {
                if (confirm(`¿Borrar ${editando.nombre}?`)) { await borrar(editando.id); dialogo.current?.close() }
              }}>Borrar</button>
            )}
            <button className="primario">{editando ? 'Guardar' : 'Añadir'}</button>
          </div>
        </form>
      </dialog>
    </>
  )
}
