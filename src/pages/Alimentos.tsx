import { useState } from 'react'
import type { Alimento } from '../core/types'
import { useObjetos } from '../db'

const num = (f: FormData, k: string) => {
  const v = f.get(k) as string
  return v === '' ? undefined : Number(v)
}
const r1 = (n: number) => Math.round(n * 10) / 10

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

export default function AlimentosPage() {
  const { lista, guardar, borrar, error } = useObjetos<Alimento>('alimento')
  const [editando, setEditando] = useState<Alimento | null>(null)
  const [filtro, setFiltro] = useState('')

  const visibles = lista
    .filter(a => a.nombre.toLowerCase().includes(filtro.toLowerCase()))
    .sort((a, b) => a.nombre.localeCompare(b.nombre))

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    await guardar(leer(new FormData(form), editando?.id ?? crypto.randomUUID()))
    setEditando(null)
    form.reset()
  }

  return (
    <>
      {error && <p role="alert" className="error">{error}</p>}
      {/* key: remonta el formulario al cambiar de alimento para cargar sus valores */}
      <form key={editando?.id ?? 'nuevo'} onSubmit={enviar} className="ficha">
        <h2>{editando ? `Editar ${editando.nombre}` : 'Nuevo alimento'}</h2>
        <label className="ancho">Nombre <input name="nombre" required defaultValue={editando?.nombre} /></label>
        <fieldset>
          <legend>Por 100 g</legend>
          <label>kcal <input name="kcal" type="number" step="any" min="0" required defaultValue={editando?.por100.kcal} /></label>
          <label>Prot (g) <input name="p" type="number" step="any" min="0" required defaultValue={editando?.por100.p} /></label>
          <label>HC (g) <input name="hc" type="number" step="any" min="0" required defaultValue={editando?.por100.hc} /></label>
          <label>Grasa (g) <input name="g" type="number" step="any" min="0" required defaultValue={editando?.por100.g} /></label>
        </fieldset>
        <fieldset>
          <legend>Opcional</legend>
          <label>g por unidad <input name="gUnidad" type="number" step="any" min="0.1" placeholder="huevo: 60" defaultValue={editando?.gUnidad} /></label>
          <label>Envase (g) <input name="envaseG" type="number" step="any" min="1" defaultValue={editando?.envase?.g} /></label>
          <label>Días abierto <input name="diasAbierto" type="number" min="1" defaultValue={editando?.envase?.diasAbierto} /></label>
          <label>Mín g <input name="minG" type="number" step="any" min="0" defaultValue={editando?.minG} /></label>
          <label>Máx g <input name="maxG" type="number" step="any" min="0" defaultValue={editando?.maxG} /></label>
          <label className="check"><input name="nuncaSugerir" type="checkbox" defaultChecked={editando?.nuncaSugerir} /> Nunca sugerir</label>
        </fieldset>
        <div className="acciones">
          <button>{editando ? 'Guardar' : 'Añadir'}</button>
          {editando && <button type="button" className="secundario" onClick={() => setEditando(null)}>Cancelar</button>}
        </div>
      </form>

      <input type="search" placeholder="Buscar…" value={filtro} onChange={e => setFiltro(e.target.value)} aria-label="Buscar alimento" />
      <div className="tabla">
        <table>
          <thead><tr><th>Alimento</th><th>kcal</th><th>P</th><th>HC</th><th>G</th><th></th></tr></thead>
          <tbody>
            {visibles.map(a => (
              <tr key={a.id}>
                <td>
                  {a.nombre}
                  <small>{[a.gUnidad && `${a.gUnidad} g/ud`, a.envase && `envase ${a.envase.g} g · ${a.envase.diasAbierto} d`, a.nuncaSugerir && 'no sugerir'].filter(Boolean).join(' · ')}</small>
                </td>
                <td>{r1(a.por100.kcal)}</td><td>{r1(a.por100.p)}</td><td>{r1(a.por100.hc)}</td><td>{r1(a.por100.g)}</td>
                <td className="acciones">
                  <button className="secundario" onClick={() => { setEditando(a); scrollTo(0, 0) }}>Editar</button>
                  <button className="secundario" onClick={() => confirm(`¿Borrar ${a.nombre}?`) && borrar(a.id)}>Borrar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!lista.length && <p>Aún no hay alimentos.</p>}
      </div>
    </>
  )
}
