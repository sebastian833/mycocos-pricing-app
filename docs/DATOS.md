# Datos: reportes fuente, esquemas, scripts y trampas

## Carpeta `datos-fuente/` (al lado de `proyecto/`)
```
ventas/   mycocos_ventas_2024.xlsx · mycocos_ventas_2025.xlsx · mycocos_ventas_2026_hasta-17-jul.xlsx
          mennt_ventas_2025.xlsx · mennt_ventas_2026_hasta-18-sep.xlsx
          myhuevos-col_ventas_2025.xlsx · myhuevos-col_ventas_2026_hasta-31-ago.xlsx
maestra/  MAESTRA_PRODUCTOS.xlsx            (export de la maestra de Drive; mismos costos que la versión de Drive al 2026‑10‑20)
recetas/  RECETAS_MY_COCOS.xlsx             (BOM de 68 packs de MyCOCOS)
artefacto-armador-packs/                    (HTML + toda la base del artefacto de ofertas; ver su LEEME)
asana-battlemap-2026/                       (152 tareas con fecha del BATTLEMAP; ver su LEEME)
costos_manuales_myhuevos.json               (7 costos que no salen de la maestra)
```
Los nombres originales de los reportes eran confusos (dos archivos distintos llamados "Detalle_de_ventas_-_01_01_2025_-_31_12_2025"); aquí están renombrados.

## Formatos de reporte
**ShopyLibre (MyCOCOS, MENNT; Bsale):** una fila por línea de venta. Columnas usadas: `Tipo Movimiento` (solo `venta`), `Fecha de Emisión` (dd/mm/AAAA), `Producto / Servicio`, `Tipo de Producto / Servicio`, `SKU`, `Cantidad`, `Precio Bruto Unitario` (con IVA), `Precio de Lista`, `Precio Neto Unitario`, `Costo neto unitario`, `% Descuento`, `Venta Total Bruta`, `Venta Total Neta`, `Margen`, `Sucursal`, `Numero del documento`, `Nombre de dcto`, `Detalle de Productos/Servicios Pack/Promo`. Σ`Margen` por año = `resumen.margen_total` de la app. Los packs/kits vienen como **una sola línea** (con sus componentes en la columna de detalle; ~21 % de las líneas): no se ve la co‑compra de componentes vendidos dentro de un pack.
**Colombia (Shopify, "reporte de facturación con detalle de orden"):** `Fecha de creación`, `Producto`, `SKU/EAN` (trae el SKU `MH…` de la maestra), `Cantidad`, `Precio con descuento` (con IVA), `Base total` (con IVA), `% Descuento`, `Estado de la Orden` (usar `Entregado`), sin costo. Excluir "SEGURO DE ENVÍO" y "GARANTÍA EXTENDIDA".

## Esquema de `public/data-<marca>.json`
`{ productos[20], resumen[2], años:[anterior, actual], tiendas[] }`
- `resumen[]`: `año, ventas_brutas, ventas_netas, unidades, margen_total, num_skus` (MyHUEVOS: `margen_total = 0`, no hay costos de todo el negocio).
- `productos[]`: `nombre` (máx. 70 car.), `tipo`, `costo_avg`, `precio_bruto_avg`, `precio_lista_avg`, `margen_avg`, `volumen_total`, `venta_bruta_total`, `meses[12]`.
- `meses[]`: `mes` + año **actual** `pb25` (precio de venta, mediana), `pl25` (lista), `pn25` (neto), `c25` (costo), `d25` (% desc.), `q25` (unidades), `mg25` (margen %), `m25` (**margen total en plata**, suma real) + año **anterior** `pb24`, `q24`, `m24`. Meses sin ventas: ceros; `pb24/q24` solo si hubo ventas.
- Top 20 = más vendidos del "año de ranking" (MyCOCOS: actual; MENNT y MyHUEVOS: anterior), sin glosas/garantías/seguros.
- `margen_avg` y `costo_avg` se recalculan con la maestra (`aplicar_costos_maestra.py`); el `c25` mensual de MyCOCOS/MENNT es el costo histórico real de cada venta y **no** se toca.

## Otros JSON
`componentes-<marca>.json` `[{sku,nombre,costo,tipo}]` · `packs-<marca>.json` (recetas: `sku, nombre, componentes[{sku,nombre,qty,costo_unit}], costo_real_bom, costo_registrado, precio_venta`) · `packs-ganadores-<marca>.json` (`nombre, componentes[{nombre,qty,costo,regalo}]`) · `propuestas-mycocos.json`.

## Scripts (`proyecto/scripts/`, requieren `pip install -r scripts/requirements.txt`)
- **`build_data.py`** regenera `data-<marca>.json`. **Verificado el 2026‑10‑20 contra los archivos publicados:** MyCOCOS y MENNT idénticos (2.802 y 2.948 campos, 0 diferencias); MyHUEVOS idéntico salvo los 2 KIT PRIME (costo $82.386 de la maestra vs $82.714 puesto a mano, 0,4 %).
- **`aplicar_costos_maestra.py`** compara/aplica el costo neto de la maestra en `data-*`, `componentes-*`, `packs-ganadores-mycocos` y `packs-mycocos`. Sin `--aplicar` solo genera `../reportes/reporte_cambios_costos.xlsx` (con fórmulas; Excel las calcula al abrir). Regla: neto por SKU, tolerancia 0,5 %; productos sin SKU en la maestra se quedan como están. Los packs ganadores de MyHUEVOS **no** se cambian solos (se marcan "Revisar").
- Dato útil: `lib/parser.ts` / `lib/parser-client.ts` son un parser TypeScript antiguo del formato ShopyLibre (sin uso).

## Trampas conocidas (todas ocurrieron)
1. **Leer la maestra como una sola tabla** mezcló pestañas, trajo costos brutos en vez de netos y un costo histórico como si fuera vigente (Daily Shaver $8.899 = neto del lote más barato). Leer por pestaña y por SKU.
2. **Años invertidos** en `data-myhuevos.json` (lo que decía 2026 era 2025). Verificar siempre `Σ q25` contra el reporte del año actual.
3. **Catálogos con costo bruto** (25/30 en MyHUEVOS, 34/41 en MENNT) por tomar la columna equivocada.
4. **Dos archivos con el mismo nombre** (MyCOCOS 2025 vs MENNT 2025).
5. **Impuesto 0,19 %** del export de Colombia (ver `NEGOCIO.md`).
6. **Navegador con datos viejos** tras desplegar (Cmd+Shift+R).
7. Fechas: ShopyLibre usa texto dd/mm/AAAA (parsear con `format=`).
