# Historial, errores encontrados y aprendizajes

Cronología resumida (fechas aproximadas; el trabajo fue entre julio y el 20‑oct‑2026).

## Fases
1. **Origen (desde ~17‑jun‑2026 hasta ~jul).** (Volcado en bruto en `docs/historial-conversaciones/`.) Dashboard de MyCOCOS con reportes ShopyLibre 2024–2026, motor de pricing con 3 tiers, armador de packs con costos por receta (BOM), chat con Groq (`llama-3.3-70b-versatile`). Parsing de Excel en el navegador (límite de 4,5 MB de Vercel).
2. **Portal multi‑marca (~17‑sep).** Selector de 4 marcas, datos de MyCOCOS precargados, estructura lista para las demás. Se quitó el "comparador de competencia" y el "Recomendador" se fusionó en el Simulador.
3. **MyHUEVOS Colombia y MENNT (~18‑sep).** Se cargaron sus ventas; MENNT con costo real en el reporte, MyHUEVOS sin costo (se usó la maestra).
4. **Integración con la maestra (Drive)** y regalos/costo aéreo/"Último costo" en los packs; calendario de tiers por país desde el BATTLEMAP de Asana.
5. **Mejoras de uso (oct).** Buscador en el armador y en regalos; armador en pasos; **guardar packs** (3 precios o 1 precio); catálogos completos por marca.
6. **Halloween (19‑oct).** Revisión de los packs Tier 2 del artefacto; pestaña "Para aprobar".
7. **Margen en plata + IVA (19–20‑oct).** Margen total en el Informe, "$ por unidad/pack" junto a cada %, desglose neto + IVA, corrección de MyHUEVOS (años y IVA).
8. **App fácil de entender (20‑oct).** Portada sin carga de archivos, página `/ayuda`, textos sin jerga, frase resumen en cada oferta a aprobar.
9. **Traspaso a Claude Code (20‑oct).** Esta carpeta; `scripts/build_data.py` reconstruido y verificado.

## Errores propios encontrados (y cómo se corrigieron)
| Error | Efecto | Arreglo / aprendizaje |
|---|---|---|
| Años invertidos al armar `data-myhuevos.json` | El Informe de Colombia mostraba 2025 como "2026" (incluso meses sin reporte) | Rehecho con 2026 actual / 2025 anterior; verificar `Σ q25` contra el reporte |
| Margen de Colombia sobre precio con IVA | Margen inflado ~5 pts; margen total −23 % al corregir | Neto = ÷ 1,19 (export de órdenes calcula el impuesto en 0,19 %) |
| Catálogos de MyHUEVOS/MENNT con costo **bruto** | Costos +19 % en 25/30 y 34/41 productos | Se rehízo por SKU con costo neto; reporte de cambios antes de aplicar |
| Costo de la Daily Shaver ($8.899) tomado de un costo **histórico** de la maestra | Margen sobrestimado | Maestra vigente: $11.492 neto |
| Regla de búsqueda de la Rasuradora 4.0 con un `.` en vez de espacio normalizado | 7 packs ganadores sin actualizar el costo | Corregido y verificado componente por componente |
| "Jabones" tomó el jabón suelto ($1.962) en vez del pack de 3 ($5.887) | Costo de Wachito RICO subestimado | Mapeo explícito por nombre del SKU del pack |
| Catálogo de MyCOCOS "completo" sin compararlo con la maestra | Faltaban 22 productos (jabones, cepillos, bases…) | Se agregaron; **siempre comparar contra la maestra** |
| Dije que MENNT estaba "casi limpio" con una comparación que no cubría los 41 productos agregados | Falsa tranquilidad | Revisar con el criterio correcto antes de afirmar |
| Pantalla de "Cargar archivo" seguía en la portada | Pedido original sin cumplir | Portada reescrita |
| Paquetes de cambios no aplicados por el usuario (no descargados/extraídos) | "Me sale igual" | Pedir `git status` y mostrar qué archivos deben aparecer |

## Aprendizajes de proceso
- Mostrar un **reporte de cambios** antes de tocar costos (se hizo; el usuario lo revisó en Excel).
- Verificar con una **segunda pasada** que "ya no queda nada por cambiar".
- Comparar el resultado contra el reporte original (unidades, márgenes) y contra otra pantalla de la app (Informe vs Simulador).
- El **navegador cachea** datos: Cmd+Shift+R.
- El conector de Groq: los modelos desaparecen; el chat debe tener lista de respaldo.
