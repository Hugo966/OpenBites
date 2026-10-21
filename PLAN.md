# OpenBites — PLAN v1

Basado en `SPEC.md`. Cada tarea es un corte vertical verificable; no se empieza la siguiente sin la anterior en verde.

## Estructura
```
src/
  core/        # TS puro, sin React ni Supabase. Aquí vive toda la lógica.
    types.ts       # Alimento, Plato, TipoDia, Menu, Dia, Comida, Item, Macros
    macros.ts      # totales ítem/comida/día/menú, unidades→g, dentro de margen
    ajustador.ts   # búsqueda 1–2 movimientos, mínimos cuadrados, redondeo, ranking
    envases.ts     # usos por ventana dias_abierto, avisos, cantidades que cuadran
    compra.ts      # lista de la compra
    *.test.ts      # Vitest
  db.ts        # cliente Supabase + load/save
  App.tsx      # rutas: Alimentos | Platos | Tipos de día | Menús
  pages/       # una página por sección
supabase/schema.sql   # tablas + RLS por user_id
```
Una sola tabla `objetos (tipo, data jsonb)` con RLS: cada alimento, plato, tipo de día o menú es una fila con su JSON. Al añadir un plato a una comida se copian sus ítems (los ítems siempre son alimento + cantidad).

## Tareas
1. ✅ **Scaffold**: Vite + React + TS, Vitest, `schema.sql`. Tú creas el proyecto Supabase y me pasas URL + anon key (`.env.local`).
2. ✅ **core/macros** + tests: totales, unidades, platos expandidos, comidas libres excluidas, margen día ±20 kcal / ±5 g.
3. ✅ **Login + Alimentos**: magic link, CRUD alimentos (por 100 g, g/unidad, envase, nunca_sugerir, mín/máx). Verificar sync PC ↔ móvil.
4. ✅ **Tipos de día** (pantalla Objetivos). Platos: pendiente, se añadirán desde la propia celda.
5. ✅ **Editor de menú = pantalla principal**: cuadrícula tipo hoja de cálculo (días en columnas, comidas en filas), totales por día vs objetivo en la cabecera, crear alimentos desde la celda. Alimentos es secundario.
6. ✅ **core/ajustador** + tests: movimientos simples, pares (2×2), redondeo 5 g / unidad, límites, exclusiones, ranking, top 5, margen ±5 kcal / ±2 g.
7. ✅ **UI ajustador**: panel en cada comida, elegir macros fijados, desmarcar alimentos, aplicar opción.
8. **core/envases** + UI avisos; preferencia de envase en el ranking del ajustador.
9. **core/compra** + página lista de la compra.
10. **Deploy** en Vercel + prueba manual en móvil.

## Riesgos
- Ajustador con muchos alimentos: pares = O(n²) ≈ 20k sistemas 2×2 con 200 alimentos, ms. Si crece mucho, limitar pares a ítems existentes × candidatos.
- Supabase free pausa el proyecto tras 1 semana sin uso; se reactiva desde el panel.

## Verificación
- `npm test` en verde (núcleo).
- Manual: menú 7 días con viernes libre, ajuste aplicado, aviso de envase, lista de la compra, mismos datos en móvil.
