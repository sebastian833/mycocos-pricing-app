# Negocio: marcas, IVA, tiers, costos, calendario, packs

## Marcas y países
| id (`lib/brands.ts`) | Marca | País | Moneda | IVA | Datos |
|---|---|---|---|---|---|
| `mycocos` | MyCOCOS | Chile | CLP | 19 % | 2024–2025 publicados (2026 sin cargar) |
| `myhuevos` | MyHUEVOS | **Colombia** | COP | 19 % | 2025 y 2026 (ene–ago) |
| `mennt` | MENNT | Chile | CLP | 19 % | 2025 y 2026 (hasta 18‑sep) |
| `myhuevos-mx` | MyHUEVOS México | México | MXN | 16 % | sin reporte (archivos vacíos) |
Notas: `myhuevos` = Colombia. MyHUEVOS Colombia también vende rasuradoras con marca MyCOCOS (ej. "Rasuradora Mycocos 3.0 Pro"). Las 4 marcas pertenecen al mismo grupo (Shopylibre). La marca activa se guarda en `localStorage`.

## IVA y margen (regla central)
- Precio al público = con IVA. Neto = precio ÷ 1,19. Ganancia por unidad = neto − costo (costo neto). Margen % = ganancia ÷ neto.
- Ejemplo: $49.990 con IVA = $42.008 neto + $7.982 de IVA; costo $14.603 → ganancia $27.405 = 65,2 %.
- Chile: en MyCOCOS y MENNT `Precio Bruto Unitario = Precio Neto Unitario × 1,19` exacto en el 100 % de las líneas.
- Colombia: el export de órdenes trae `Valor impuesto` ≈ 0,19 % del precio (aplica 0,19 como si fuera porcentaje); el usuario confirmó que **el IVA real es 19 %**. `Base total` y `Precio con descuento` incluyen IVA → neto = ÷ 1,19. (Antes del arreglo, el Informe de MyHUEVOS tomaba el precio con IVA como neto e inflaba el margen: 71,4 % → 66,0 % en la Rasuradora 4.0 de marzo.)
- México: 16 %, **pendiente de implementar**.

## Tiers (`lib/pricing-tiers.ts`)
Margen meta por tier y tipo: ver tabla en `CLAUDE.md`. `precioPorMargen(costo, margen) = roundChilean(costo/(1−margen) × 1,19)`; `roundChilean` redondea al millar más cercano menos 10 (…990; bajo $3.000 a la centena menos 10).
- **kit** = combo de productos distintos; **pack** = varias unidades iguales (`detectarCategoria`: ≤1 SKU único ⇒ pack). El usuario puede cambiarlo con dos botones.
- "Precio 'antes'" (tachado) = precio normal × (1 + %), por defecto 12 %.
- Elasticidad (`calcularElasticidad`): promedio de |ΔQ/ΔP| entre meses consecutivos con cambio de precio >2 %; >1,5 elástico, <0,7 inelástico. Es indicativa (no separa efecto evento del efecto precio).

## Costos
- **Fuente única:** la maestra de productos (Google Sheets; ver `INTEGRACIONES.md`). Siempre **neto**. "Último costo" = el costo vigente de la maestra.
- Para MyCOCOS y MENNT el reporte de ventas trae el "Costo neto unitario" real de cada venta (histórico, promediado por el sistema); se usa para el **histórico mensual** del Informe. Para precios sugeridos y packs se usa la **maestra**. Las diferencias entre ambas son normales (lotes con distinto costo): ej. Daily Shaver, maestra $11.492 neto vs 2026 en reporte $9.111 (lote anterior más barato).
- MyHUEVOS Colombia: el reporte no trae costo; se usa el neto de la maestra (pestaña `MYHUEVOS COL Antigua`, por SKU) + `costos_manuales_myhuevos.json` (7 productos que no están ahí).
- **Costo aéreo:** ajuste por unidad que el usuario suma a un componente cuando llegó por avión y salió más caro (✈️ "Costo aéreo"). **Regalo:** producto que se regala: suma costo y baja la ganancia; su costo es editable.

## Packs
- *Los que más venden* (`packs-ganadores-<marca>.json`): combos actuales armados en Shopify, con costo por componente (MyCOCOS: 7; MyHUEVOS: 7 con costo directo de maestra; MENNT: ninguno).
- *Todos los packs* (`packs-<marca>.json`): recetas (BOM) del archivo `RECETAS_MY_COCOS.xlsx` (solo MyCOCOS, 68 packs; se muestran los que tienen precio y costo).
- *Armar nuevo*: usa `componentes-<marca>.json` (ítems sueltos; excluye `tipo === 'PACKS MY COCOS'` en el armador, pero el selector de regalos sí incluye kits).
- *Guardados*: `localStorage`; guardar con los 3 precios o con un solo precio; mismo nombre+marca = actualiza. Avisa si los costos cambiaron desde que se guardó.
- *Para aprobar*: `propuestas-mycocos.json` (Halloween). Estados: aprobar / ajustar / no aprobar; meta de margen 65 %.

## Calendario de tiers por país
`getCalendario(pais)` en `lib/pricing-tiers.ts`, armado desde el **BATTLEMAP 2026** de Asana (tareas por marca con fechas). Claves de cada país:
- **Chile:** Double Day 3/3, 4/4, 5/5; CyberDay en junio **y octubre** (MyCOCOS); Día del Padre; Black Friday/Aniversario en noviembre; Fiestas Patrias en septiembre.
- **Colombia:** Hot Sale (mar y oct), Black Days (jun), Amor y Amistad (sep), Black Friday (nov).
- **México:** El Buen Fin (nov), Prime Day, El Grito (sep), Gift Day (dic).
El tier asignado a cada mes es **clasificación propia** (hay meses con varios eventos): validar con el equipo.
