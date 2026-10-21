# OpenBites — SPEC v1

## Contexto
App personal (un solo usuario) para montar menús propios (plantillas de N días) con alimentos que introduces tú, calcular macros automáticamente, y un **ajustador determinista** que te dice qué cambiar en una comida para llegar a un objetivo de macros. IA generativa de platos: fuera de v1.

Fase actual: spec cerrada → **plan**.

## Stack
- React + TypeScript + Vite. Web responsive (móvil y PC). UI en español.
- Supabase: Postgres + auth magic link (un usuario, RLS por `user_id`). Datos sincronizados entre dispositivos.
- Deploy gratis en Vercel/Netlify.
- Lógica de cálculo (macros, ajustador, envases, compra) en TS puro, sin dependencias, testeada con Vitest.

## Modelo de datos
- **Alimento**: nombre, kcal/prot/HC/grasa **por 100 g**; opcional `gramos_por_unidad` (si existe, se usa en unidades: "2 huevos"); opcional envase (`tamaño_g`, `dias_abierto`); flag `nunca_sugerir`; mín/máx g opcionales.
- **Plato** (receta): nombre + lista (alimento, cantidad). Se añade a una comida de golpe; se puede expandir/editar en la comida.
- **Tipo de día**: nombre (entreno, descanso…) + objetivo diario kcal/P/HC/G.
- **Menú** (plantilla sin fecha): nombre, lista de días ordenados.
- **Día**: nombre libre ("Lunes", "Día 3"), tipo de día, lista de comidas.
- **Comida**: nombre libre (configurable, varía por día), flag `libre`, lista de ítems (alimento o plato + cantidad en g o unidades).

## Funcionalidades v1
1. **CRUD alimentos y platos.**
2. **Editor de menú**: crear/duplicar menús, días y comidas; duplicar día o comida; añadir alimentos/platos con cantidad.
3. **Totales en vivo**: por comida, por día (vs objetivo del tipo de día: falta/sobra) y por menú. Un día está "en objetivo" si queda dentro de **±20 kcal y ±5 g por macro**.
4. **Comidas libres**: marcadas como libres → no cuentan en totales ni en objetivo diario. (Semanal: solo informativo; sin lógica extra en v1.)
5. **Ajustador** (sobre una comida):
   - Entrada: deltas objetivo para uno o varios macros (`+20 g prot`, `±0 kcal`); los no fijados quedan libres pero se muestra cómo varían. Tolerancia por macro.
   - Movimientos: cambiar cantidad de ítem existente, añadir alimento, quitar ítem, sustituir ítem; combinaciones de **hasta 2 movimientos**.
   - Candidatos: todos los alimentos menos `nunca_sugerir` y los desmarcados en esa petición.
   - Cantidades: múltiplos de 5 g; alimentos con unidad → unidades enteras; respeta mín/máx del alimento.
   - Algoritmo: para cada alimento o par de alimentos, mínimos cuadrados (1D / 2×2) sobre los macros fijados, redondeo al paso, filtrar límites. Ranking: error ponderado → nº de cambios → menor cambio en gramos. Devuelve top N opciones ("+30 g arroz y −5 g aceite → +21 g prot, +40 kcal").
   - Bonus: prefiere cantidades que cuadran con envases (ver 6).
   - Tolerancia por defecto (editable en cada petición): **±5 kcal, ±2 g por macro**. Muestra **5 opciones**.
6. **Regla de envases** (aviso + sugerencia): para alimentos con envase, cuenta los usos del menú dentro de `dias_abierto` y avisa si `tamaño / usos` no cuadra (sobra o falta). Propone cantidades que cuadran (envase ÷ nº usos) o añadir/quitar un uso.
7. **Lista de la compra**: total por alimento del menú (g o unidades) → nº de envases si tiene tamaño, y sobrante.

## Fuera de v1 (futuro)
- IA para generar platos a partir de macros objetivo.
- Fibra, azúcares, sal.
- Calendario con fechas, registro de lo comido real.
- Import CSV / Open Food Facts.
- Lógica de compensación semanal por la comida libre.

## Decisiones cerradas
- Regla de envases: porción = tamaño del envase ÷ nº de usos dentro de `dias_abierto`. (Guacamole 200 g, 7 días abierto, 1 uso/semana → 200 g; 2 usos → 100 g.)
- Márgenes: comida/ajustador ±5 kcal y ±2 g; día ±20 kcal y ±5 g.

## Verificación (fase test)
- Vitest sobre el núcleo de cálculo: totales, conversión unidades, ajustador (casos conocidos con solución exacta), regla de envases, lista de compra.
- Prueba manual en navegador (móvil y PC) contra Supabase: crear alimentos, menú de 7 días con viernes libre, pedir un ajuste y aplicarlo, ver lista de compra.
