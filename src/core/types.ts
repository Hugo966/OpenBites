export type Macros = { kcal: number; p: number; hc: number; g: number }

export type Alimento = {
  id: string
  nombre: string
  por100: Macros
  gUnidad?: number // si existe, las cantidades de este alimento van en unidades
  envase?: { g: number; diasAbierto: number }
  nuncaSugerir?: boolean
  minG?: number
  maxG?: number
}

// cantidad: unidades si el alimento tiene gUnidad, gramos si no
export type Item = { alimentoId: string; cantidad: number }

// Al añadir un plato a una comida se copian sus ítems (se puede editar después)
export type Plato = { id: string; nombre: string; items: Item[] }

export type TipoDia = { id: string; nombre: string; objetivo: Macros }

// Cuadrícula: menu.comidas son las filas (Desayuno, Comida…); cada día tiene una celda por fila, mismo índice.
// Una celda vacía = ese día no tiene esa comida.
export type Comida = { libre?: boolean; items: Item[] }
export type Dia = { nombre: string; tipoDiaId?: string; comidas: Comida[] }
export type Menu = { id: string; nombre: string; comidas: string[]; dias: Dia[] }

export type Alimentos = Record<string, Alimento>
