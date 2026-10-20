# Verificación: qué debe verse en cada pantalla

Números **comprobados** durante el trabajo (20‑oct‑2026). Úsalos después de cada cambio o despliegue para confirmar que nada se rompió. Si un número no coincide, probablemente cambiaron los datos o hay un error: investigar antes de seguir.

## Portada (`/`)
- Cuatro atajos (Informe, Packs, Simulador, Chat IA) + enlace "¿Primera vez? Lee la guía rápida". **No** debe decir "Cargar otro archivo". Menú con **Ayuda**.
- Resumen de ventas (vendido con IVA · margen total): MyCOCOS 2024 85.994 un. / $3.980,8 M / margen $2.148,5 M · 2025 109.519 un. / $4.158,8 M / $2.295,9 M. MENNT 2025 57.531 un. / $2.283,9 M / $1.193,0 M · 2026 43.948 un. / $1.662,9 M / $889,0 M. MyHUEVOS (COP) 2025 41.506 un. / $8.607,3 M · 2026 58.959 un. / $9.215,3 M (sin margen total).
- MyHUEVOS México: mensaje "Todavía no hay ventas cargadas".

## Informe
- **MyCOCOS → RASURADORA MyCOCOS® 4.0  BLACK:** Precio máximo $57.591 (May), mínimo $44.990 (Jun); "Margen total 2025" **$393,1 M** (13.281 un. · $29.599 por unidad); "Mes que más margen dejó" Dic ($62,5 M); "Mes que más se vendió" Jun (2.382 un.). Fila de totales: 13.281 un. · $393,1 M; 2024: $184,5 M. Enero: margen 74,1 % y $34.231 por unidad. 2024 sin datos de enero a junio (el producto aparece en julio de 2024). Ver `../referencias/informe-…pdf`.
- **MyHUEVOS → Rasuradora MyHUEVOS® 4.0 - NEGRO:** marzo 2026: precio $199.900, margen **66,0 %**, $110.880 por unidad, **1.270 un.**; enero 67,6 %; de septiembre a diciembre "—" (el reporte llega hasta agosto); margen total 2026 ≈ $1.047 M (9.697 un. en el año).
- Columna de cambio de precio con formato "−$10.800" (no "$-10.800").

## Simulador / Costos
- MyCOCOS RASURADORA 4.0 BLACK: "Último costo" **$11.322**. MyHUEVOS Rasuradora 4.0 - NEGRO: **$57.103**.
- Cualquier precio muestra "Neto + IVA": $49.990 → **Neto $42.008 + IVA $7.982**; y la nota "Todos los precios incluyen IVA (19%)".

## Packs
- **Los que más venden (MyCOCOS), costo total:** THE CRACK PACK **$44.636** · Wachito RICO **$34.982** (ya no pide costos manuales) · PACK CYBER **$48.087** · THE FATHER'S KIT **$16.185**.
- **Armar nuevo:** MyHUEVOS "Base de Carga para Rasuradora Myhuevos Azul" **$12.185** (no $14.500). Buscar "jabon" en el selector de regalos de MyCOCOS → 3 jabones a $1.962. Pasos "1. Elige…", "2. Ponle un nombre…", "3. Mira a qué precio…", "4. Guardar este pack".
- **Guardados:** guardar con nombre → aparece en la pestaña; mismo nombre y marca → actualiza (no duplica).
- **Para aprobar (solo MyCOCOS), 6 tarjetas ordenadas aprobar → ajustar → no:** Daily + hojilla (costo $14.603, 65,2 %) y Pack de jabones ($6.435, 65,2 %) recomendados; Rasuradora 4.0 + hojilla ($13.825; su $55.990 = 70,6 %; recomendado $47.990 = 65,7 %) y Crack Pack ($44.989; su $147.990 = 63,8 %; recomendado $152.990) con ajuste; Trío Dinámico ($33.666; 58,3 %) y Barber Kit ($29.745; 52,2 %) no recomendados. Cada tarjeta empieza con una frase resumen y trae "Neto + IVA".

## Chat IA
- Con MyHUEVOS seleccionado responde en **COP** (no CLP). Si falla con un modelo de Groq, debe probar el siguiente de la lista.

## Comprobaciones técnicas
- `npm run build` sin errores (11 rutas, incluye `/ayuda`).
- `python scripts/aplicar_costos_maestra.py` (sin `--aplicar`): "cambian 0" en las 3 marcas.
- `python scripts/build_data.py --marca mennt` reproduce `public/data-mennt.json` sin diferencias.
