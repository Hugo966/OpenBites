import { gramos } from './macros'
import type { Alimentos, Menu } from './types'

export type Envase = {
  alimentoId: string
  usos: number // por vuelta de menú
  gramos: number // consumidos por vuelta
  envases: number // abiertos por vuelta (media)
  sobran: number // g tirados por vuelta (media)
  usosPorEnvase: number // usos dentro de la vida del envase, desde el primer uso
  sugerencias: { cantidad: number; usos: number }[] // en la unidad del alimento (g o ud)
}

const VUELTAS = 60 // el menú se repite; la primera vuelta solo calienta

// Usos de cada alimento en orden: día del menú y gramos. Las comidas libres no cuentan.
function usosPorAlimento(alimentos: Alimentos, menu: Menu) {
  const usos: Record<string, { dia: number; g: number }[]> = {}
  menu.dias.forEach((d, dia) => d.comidas.forEach(c => {
    if (c.libre) return
    for (const it of c.items) {
      const a = alimentos[it.alimentoId]
      if (!a || it.cantidad <= 0) continue
      ;(usos[a.id] ??= []).push({ dia, g: gramos(a, it.cantidad) })
    }
  }))
  return usos
}

function simular(tam: number, dias: number, usos: { dia: number; g: number }[], nDias: number) {
  let resto = 0, abierto = -Infinity, tirado = 0
  for (let v = 0; v < VUELTAS; v++) {
    const medir = v > 0
    for (const u of usos) {
      const dia = v * nDias + u.dia
      if (resto > 1e-6 && dia - abierto >= dias) { if (medir) tirado += resto; resto = 0 }
      let falta = u.g
      while (falta > 1e-6) {
        if (resto <= 1e-6) { resto = tam; abierto = dia }
        const t = Math.min(falta, resto)
        falta -= t
        resto -= t
      }
    }
  }
  const sobran = tirado / (VUELTAS - 1)
  // Todo lo que entra en casa se come o se tira
  return { envases: (usos.reduce((s, u) => s + u.g, 0) + sobran) / tam, sobran }
}

export function analizarEnvases(alimentos: Alimentos, menu: Menu): Envase[] {
  const nDias = Math.max(menu.dias.length, 1)
  return Object.entries(usosPorAlimento(alimentos, menu)).flatMap(([id, usos]) => {
    const a = alimentos[id]
    if (!a.envase) return []
    const { g: tam, diasAbierto } = a.envase
    const { envases, sobran } = simular(tam, diasAbierto, usos, nDias)
    // Usos que caen dentro de la vida del envase empezando en el primer uso (contando vueltas siguientes)
    const inicio = usos[0].dia
    let k = 0
    for (let v = 0; v * nDias < diasAbierto + nDias; v++)
      for (const u of usos) { const d = v * nDias + u.dia; if (d >= inicio && d - inicio < diasAbierto) k++ }
    const unidad = (g: number) => Math.round((a.gUnidad ? g / a.gUnidad : g) * 10) / 10
    const sugerencias = [k, k + 1, k - 1].filter(n => n > 0).map(n => ({ cantidad: unidad(tam / n), usos: n }))
    return [{ alimentoId: id, usos: usos.length, gramos: usos.reduce((s, u) => s + u.g, 0), envases, sobran, usosPorEnvase: k, sugerencias }]
  })
}

export type LineaCompra = { alimentoId: string; gramos: number; cantidad: number; envases?: number; sobran?: number }

// Lo necesario para una vuelta del menú. Con envase: cuántos comprar (redondeado arriba).
export function listaCompra(alimentos: Alimentos, menu: Menu): LineaCompra[] {
  const env = Object.fromEntries(analizarEnvases(alimentos, menu).map(e => [e.alimentoId, e]))
  return Object.entries(usosPorAlimento(alimentos, menu))
    .map(([id, usos]) => {
      const a = alimentos[id]
      const g = usos.reduce((s, u) => s + u.g, 0)
      const e = env[id]
      return {
        alimentoId: id, gramos: g, cantidad: a.gUnidad ? g / a.gUnidad : g,
        ...(e && { envases: Math.ceil(e.envases - 1e-6), sobran: e.sobran }),
      }
    })
    .sort((x, y) => alimentos[x.alimentoId].nombre.localeCompare(alimentos[y.alimentoId].nombre))
}
