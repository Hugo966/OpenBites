import { useEffect, useMemo, useRef, useState } from 'react'
import { dentroMargen, diaLibre, MACROS, MARGEN_DIA, macrosItem, restar, totalComida, totalDia } from '../core/macros'
import type { Alimento, Alimentos, Comida, Macros, Menu, TipoDia } from '../core/types'
import { useObjetos } from '../db'
import { ChipsMacros, Icono, r0 } from '../ui'
import { analizarEnvases } from '../core/envases'
import { Ajustador } from './Ajustador'
import { AvisosEnvase, DialogoCompra } from './Compra'
import { DialogoAlimento, dominante } from './Alimentos'

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
const FILAS = ['Desayuno', 'Comida', 'Merienda', 'Cena']
const celdas = (n: number): Comida[] => Array.from({ length: n }, () => ({ items: [] }))
const miles = (n: number) => r0(n).toLocaleString('es-ES')

const menuNuevo = (): Menu => ({
  id: crypto.randomUUID(), nombre: 'Mi menú', comidas: [...FILAS],
  dias: DIAS.map(nombre => ({ nombre, comidas: celdas(FILAS.length) })),
})

const ls = {
  get: (k: string) => { try { return localStorage.getItem(k) } catch { return null } },
  set: (k: string, v: string) => { try { localStorage.setItem(k, v) } catch { /* sin almacenamiento */ } },
}

export default function MenuPage() {
  const menus = useObjetos<Menu>('menu')
  const al = useObjetos<Alimento>('alimento')
  const tipos = useObjetos<TipoDia>('tipoDia')
  const alimentos: Alimentos = useMemo(() => Object.fromEntries(al.lista.map(a => [a.id, a])), [al.lista])

  const [selId, setSelId] = useState(() => ls.get('menu'))
  const guardado = menus.lista.find(m => m.id === selId) ?? menus.lista[0]
  // Copia local mientras se edita; se guarda 600 ms después del último cambio
  const [draft, setDraft] = useState<Menu | null>(null)
  const menu = draft && draft.id === guardado?.id ? draft : guardado
  const pendiente = useRef<{ m: Menu; t: number } | null>(null)

  const [destino, setDestino] = useState<{ d: number; f: number } | null>(null)
  const [nuevoAl, setNuevoAl] = useState<Partial<Alimento> | null>(null)
  const [ajustando, setAjustando] = useState<{ d: number; f: number } | null>(null)
  const [compra, setCompra] = useState(false)

  const guardarYa = async (m: Menu) => {
    pendiente.current = null
    await menus.guardar(m)
    setDraft(d => (d === m ? null : d))
  }
  // Al salir de la página no se pierde lo último escrito
  useEffect(() => () => { if (pendiente.current) { clearTimeout(pendiente.current.t); menus.guardar(pendiente.current.m) } }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function cambiar(f: (m: Menu) => void) {
    if (!menu) return
    const m = structuredClone(menu)
    f(m)
    setDraft(m)
    if (pendiente.current) clearTimeout(pendiente.current.t)
    pendiente.current = { m, t: window.setTimeout(() => guardarYa(m), 600) }
  }

  function elegir(id: string) { setSelId(id); ls.set('menu', id) }
  async function crear(m: Menu) { await menus.guardar(m); elegir(m.id) }

  function añadir(a: Alimento) {
    if (!destino) return
    const { d, f } = destino
    cambiar(m => { m.dias[d].comidas[f].items.push({ alimentoId: a.id, cantidad: a.gUnidad ? 1 : 100 }) })
    setDestino(null)
  }

  if (!menus.cargado) return null
  if (!menu) return (
    <div className="vacio">
      <h1>Tu menú</h1>
      <p>Crea un menú semanal: 7 días × desayuno, comida, merienda y cena. Luego lo adaptas a lo que quieras.</p>
      <button className="primario" onClick={() => crear(menuNuevo())}>Crear mi primer menú</button>
    </div>
  )

  const tiposPorId = Object.fromEntries(tipos.lista.map(t => [t.id, t]))
  const envases = analizarEnvases(alimentos, menu)
  const desperdicio = new Set(envases.filter(e => e.sobran > 1).map(e => e.alimentoId))
  const diasNormales = menu.dias.filter(d => !diaLibre(d))
  const media = diasNormales.length ? diasNormales.reduce((s, d) => s + totalDia(alimentos, d).kcal, 0) / diasNormales.length : 0

  return (
    <>
      <div className="barra-menu">
        <input className="titulo-menu" value={menu.nombre} aria-label="Nombre del menú"
          onChange={e => cambiar(m => { m.nombre = e.target.value })} />
        {menus.lista.length > 1 && (
          <select value={menu.id} onChange={e => elegir(e.target.value)} aria-label="Cambiar de menú">
            {[...menus.lista].sort((a, b) => a.nombre.localeCompare(b.nombre)).map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
          </select>
        )}
        <div className="acciones-menu">
          <button className="secundario" onClick={() => setCompra(true)}><Icono n="compra" size={18} /> Compra</button>
          <button className="secundario" onClick={() => crear(menuNuevo())}><Icono n="mas" size={18} /> Nuevo</button>
          <button className="secundario" onClick={() => crear({ ...structuredClone(menu), id: crypto.randomUUID(), nombre: `${menu.nombre} (copia)` })}><Icono n="copiar" size={18} /> Duplicar</button>
          <button className="icono" aria-label="Borrar menú" onClick={async () => {
            if (confirm(`¿Borrar el menú «${menu.nombre}»?`)) { setDraft(null); await menus.borrar(menu.id) }
          }}><Icono n="borrar" size={18} /></button>
        </div>
        <span className="tenue estado">{draft ? 'Guardando…' : 'Guardado'}</span>
      </div>
      <p className="tenue resumen">{menu.dias.length} días · media <b>{miles(media)} kcal/día</b>{diasNormales.length < menu.dias.length && ' (sin contar días libres)'}</p>
      {menus.error && <p role="alert" className="error">{menus.error}</p>}
      <AvisosEnvase envases={envases} alimentos={alimentos} dias={menu.dias.length} />

      <div className="cuadricula-scroll">
        <table className="cuadricula">
          <thead>
            <tr>
              <th className="esquina" />
              {menu.dias.map((dia, d) => (
                <th key={d} scope="col">
                  <div className="dia-cab">
                    <div className="fila">
                      <input className="dia-nombre" value={dia.nombre} aria-label="Nombre del día"
                        onChange={e => cambiar(m => { m.dias[d].nombre = e.target.value })} />
                      <button className="icono mini" aria-label={`Duplicar ${dia.nombre}`}
                        onClick={() => cambiar(m => { m.dias.splice(d + 1, 0, { ...structuredClone(m.dias[d]), nombre: `${m.dias[d].nombre} (copia)` }) })}><Icono n="copiar" size={16} /></button>
                      <button className="icono mini" aria-label={`Borrar ${dia.nombre}`}
                        onClick={() => confirm(`¿Borrar ${dia.nombre}?`) && cambiar(m => { m.dias.splice(d, 1) })}><Icono n="borrar" size={16} /></button>
                    </div>
                    <select value={dia.tipoDiaId ?? ''} aria-label="Tipo de día"
                      onChange={e => cambiar(m => { m.dias[d].tipoDiaId = e.target.value || undefined })}>
                      <option value="">{tipos.lista.length ? 'Sin objetivo' : 'Sin objetivo (créalos en Objetivos)'}</option>
                      {tipos.lista.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                    </select>
                    <ResumenDia total={totalDia(alimentos, dia)} objetivo={tiposPorId[dia.tipoDiaId ?? '']?.objetivo} libre={diaLibre(dia)} />
                  </div>
                </th>
              ))}
              <th className="añadir-col">
                <button className="fantasma" onClick={() => cambiar(m => {
                  m.dias.push({ nombre: DIAS[m.dias.length % 7], comidas: celdas(m.comidas.length) })
                })}><Icono n="mas" /> Día</button>
              </th>
            </tr>
          </thead>
          <tbody>
            {menu.comidas.map((fila, f) => (
              <tr key={f}>
                <th scope="row">
                  <input className="fila-nombre" value={fila} aria-label="Nombre de la comida"
                    onChange={e => cambiar(m => { m.comidas[f] = e.target.value })} />
                  <button className="icono mini" aria-label={`Borrar fila ${fila}`}
                    onClick={() => confirm(`¿Borrar la fila «${fila}» en todos los días?`) && cambiar(m => {
                      m.comidas.splice(f, 1)
                      m.dias.forEach(dia => dia.comidas.splice(f, 1))
                    })}><Icono n="borrar" size={16} /></button>
                </th>
                {menu.dias.map((dia, d) => (
                  <td key={d}>
                    <Celda titulo={fila} comida={dia.comidas[f]} alimentos={alimentos} desperdicio={desperdicio}
                      onAñadir={() => setDestino({ d, f })}
                      onAjustar={() => setAjustando({ d, f })}
                      onCambio={fn => cambiar(m => fn(m.dias[d].comidas[f]))} />
                  </td>
                ))}
                <td />
              </tr>
            ))}
            <tr>
              <th scope="row">
                <button className="fantasma" onClick={() => cambiar(m => {
                  m.comidas.push('Nueva comida')
                  m.dias.forEach(dia => dia.comidas.push({ items: [] }))
                })}><Icono n="mas" /> Comida</button>
              </th>
            </tr>
          </tbody>
        </table>
      </div>

      {(() => {
        const dia = ajustando && menu.dias[ajustando.d]
        const obj = dia && !diaLibre(dia) ? tiposPorId[dia.tipoDiaId ?? '']?.objetivo : undefined
        return (
          <Ajustador alimentos={alimentos} onCerrar={() => setAjustando(null)}
            titulo={dia ? `${menu.comidas[ajustando.f].toLowerCase()} · ${dia.nombre}` : ''}
            comida={dia ? dia.comidas[ajustando.f] : null}
            falta={dia && obj ? restar(obj, totalDia(alimentos, dia)) : undefined}
            onAplicar={items => cambiar(m => { m.dias[ajustando!.d].comidas[ajustando!.f].items = items })} />
        )
      })()}
      {/* Al crear un alimento el selector se cierra pero el destino se mantiene hasta guardarlo */}
      <SelectorAlimento abierto={!!destino && !nuevoAl} alimentos={al.lista} onElegir={añadir}
        onCrear={nombre => setNuevoAl({ nombre })} onCerrar={() => !nuevoAl && setDestino(null)} />
      <DialogoCompra abierto={compra} menu={menu} alimentos={alimentos} onCerrar={() => setCompra(false)} />
      <DialogoAlimento alimento={nuevoAl} onCerrar={() => { setNuevoAl(null); setDestino(null) }}
        onGuardar={async a => { await al.guardar(a); añadir(a) }} />
    </>
  )
}

function ResumenDia({ total, objetivo, libre }: { total: Macros; objetivo?: Macros; libre: boolean }) {
  if (libre) return <div className="resumen-dia libre"><b>{miles(total.kcal)}</b> kcal · día libre</div>
  if (!objetivo) return <div className="resumen-dia"><b>{miles(total.kcal)}</b> kcal<ChipsMacros m={total} /></div>
  const ok = dentroMargen(total, objetivo, MARGEN_DIA)
  const pct = Math.min(100, (total.kcal / (objetivo.kcal || 1)) * 100)
  return (
    <div className={`resumen-dia ${ok ? 'ok' : ''}`}>
      <div><b>{miles(total.kcal)}</b> / {miles(objetivo.kcal)} kcal {ok && '✓'}</div>
      <div className="progreso"><span style={{ width: `${pct}%` }} /></div>
      <div className="vs">
        {MACROS.slice(1).map(k => {
          const dif = total[k] - objetivo[k]
          return (
            <span key={k} className={k} title={`${dif > 0 ? 'sobran' : 'faltan'} ${Math.abs(r0(dif))} g`}>
              <b>{r0(total[k])}</b>/{r0(objetivo[k])}
              {Math.abs(dif) > MARGEN_DIA[k] && <small>{dif > 0 ? '+' : '−'}{Math.abs(r0(dif))}</small>}
            </span>
          )
        })}
      </div>
    </div>
  )
}

function Celda({ titulo, comida, alimentos, desperdicio, onAñadir, onAjustar, onCambio }: {
  titulo: string
  comida: Comida
  alimentos: Alimentos
  desperdicio: Set<string>
  onAñadir: () => void
  onAjustar: () => void
  onCambio: (f: (c: Comida) => void) => void
}) {
  const total = totalComida(alimentos, comida)
  return (
    <div className={`celda ${comida.libre ? 'es-libre' : ''}`}>
      <div className="celda-titulo">{titulo}</div>
      {comida.libre
        ? <div className="libre-texto">Comida libre</div>
        : comida.items.map((it, i) => {
          const a = alimentos[it.alimentoId]
          return (
            <div className="item" key={i}>
              <span className={`punto ${a ? dominante(a.por100) : ''}`} />
              <span className={`item-nombre ${desperdicio.has(it.alimentoId) ? 'aviso' : ''}`}
                title={desperdicio.has(it.alimentoId) ? `${a?.nombre}: el envase no cuadra, mira los avisos` : a?.nombre}>{a?.nombre ?? 'Alimento borrado'}</span>
              <Cantidad valor={it.cantidad} paso={a?.gUnidad ? 1 : 5}
                onCambio={v => onCambio(c => { c.items[i].cantidad = v })} />
              <span className="ud">{a?.gUnidad ? 'ud' : 'g'}</span>
              <span className="item-kcal">{r0(macrosItem(alimentos, it).kcal)}</span>
              <button className="quitar" aria-label={`Quitar ${a?.nombre ?? 'alimento'}`}
                onClick={() => onCambio(c => { c.items.splice(i, 1) })}><Icono n="cerrar" size={14} /></button>
            </div>
          )
        })}
      <div className="celda-pie">
        {!comida.libre && <button className="añadir" onClick={onAñadir}><Icono n="mas" size={16} /> Añadir</button>}
        {!comida.libre && comida.items.length > 0 && <button className="añadir" onClick={onAjustar} aria-label={`Ajustar ${titulo}`} title="Ajustar macros"><Icono n="ajustar" size={16} /></button>}
        <button className={`etiqueta-libre ${comida.libre ? 'activa' : ''}`} aria-pressed={!!comida.libre}
          onClick={() => onCambio(c => { c.libre = !c.libre || undefined })}>Libre</button>
        {!comida.libre && comida.items.length > 0 && <span className="celda-total">{r0(total.kcal)} kcal</span>}
      </div>
    </div>
  )
}

// Input numérico que deja borrar y reescribir sin saltar a 0
function Cantidad({ valor, paso, onCambio }: { valor: number; paso: number; onCambio: (v: number) => void }) {
  const [texto, setTexto] = useState(String(valor))
  const [foco, setFoco] = useState(false)
  const mostrado = foco ? texto : String(valor)
  return (
    <input className="cant" type="number" inputMode="decimal" min="0" step={paso} value={mostrado} aria-label="Cantidad"
      onFocus={e => { setTexto(String(valor)); setFoco(true); e.target.select() }}
      onBlur={() => setFoco(false)}
      onChange={e => {
        setTexto(e.target.value)
        if (e.target.value !== '' && Number(e.target.value) >= 0) onCambio(Number(e.target.value))
      }} />
  )
}

function SelectorAlimento({ abierto, alimentos, onElegir, onCrear, onCerrar }: {
  abierto: boolean
  alimentos: Alimento[]
  onElegir: (a: Alimento) => void
  onCrear: (nombre: string) => void
  onCerrar: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const [q, setQ] = useState('')
  useEffect(() => {
    if (abierto) { setQ(''); ref.current?.showModal() } else ref.current?.close()
  }, [abierto])

  const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
  const res = alimentos.filter(a => norm(a.nombre).includes(norm(q))).sort((a, b) => a.nombre.localeCompare(b.nombre)).slice(0, 40)
  const crear = () => onCrear(q.trim())

  return (
    <dialog ref={ref} className="hoja selector" onClose={onCerrar}>
      <div className="selector-cab">
        <label className="buscador">
          <Icono n="buscar" size={18} />
          <input autoFocus placeholder="Buscar o crear alimento" value={q} onChange={e => setQ(e.target.value)} aria-label="Buscar alimento"
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (res[0]) onElegir(res[0]); else if (q.trim()) crear() } }} />
        </label>
        <button className="icono" onClick={onCerrar} aria-label="Cerrar"><Icono n="cerrar" /></button>
      </div>
      <ul className="selector-lista">
        {res.map(a => (
          <li key={a.id}>
            <button onClick={() => onElegir(a)}>
              <span className={`punto ${dominante(a.por100)}`} />
              <span className="item-nombre">{a.nombre}</span>
              <span className="tenue">{r0(a.por100.kcal)} kcal/100 g{a.gUnidad ? ` · ${a.gUnidad} g/ud` : ''}</span>
            </button>
          </li>
        ))}
        <li>
          <button className="crear" onClick={crear}>
            <Icono n="mas" size={18} /> {q.trim() ? <>Crear «{q.trim()}»</> : 'Crear alimento nuevo'}
          </button>
        </li>
      </ul>
    </dialog>
  )
}
