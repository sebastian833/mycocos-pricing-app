# Pendientes (priorizados)

Estado al cierre de la sesión anterior. "Necesita del usuario" = no se puede avanzar sin su respuesta.

## Alta prioridad
1. **Confirmar que el repo local tiene lo último.** Último paquete: "app más fácil de entender". Verificar `app/ayuda/page.tsx`, que la portada no tenga carga de archivos y que `components/TierScenarios.tsx` muestre "Neto + IVA". Si falta algo, el repo local y `proyecto/` de este paquete difieren: `git status` lo muestra.
2. **Informe de MyCOCOS atrasado.** Lo publicado cubre 2024–2025. Hay reporte 2026 (1‑ene a 17‑jul) en `datos-fuente/ventas/`. Para cargarlo: en `scripts/build_data.py` cambiar `MARCAS['mycocos']` a `anterior=('ventas/mycocos_ventas_2025.xlsx', 2025)`, `actual=('ventas/mycocos_ventas_2026_hasta-17-jul.xlsx', 2026)`, `ranking='anterior'` (como MENNT); regenerar y alinear costos. *Necesita del usuario:* decisión (se le preguntó tres veces sin respuesta) y, idealmente, un reporte más reciente.
3. **Seguridad.** La app es pública y la clave de Groq se compartió en un chat: **rotarla** (console.groq.com → nueva clave → Vercel `GROQ_API_KEY` y `.env.local`). Proponer contraseña compartida por variable de entorno (middleware) antes de cualquier función de escritura.
4. **IVA por país.** México = 16 % pero el código usa 1,19 fijo. Hacerlo por país (`brands.ts` → `iva`) antes de cargar MyHUEVOS México. Chile y Colombia = 19 % (confirmado).

## Media
5. **MyHUEVOS México:** sin reporte de ventas (archivos `*-myhuevos-mx.json` vacíos). *Necesita del usuario:* el reporte (probablemente formato Shopify como Colombia). Su calendario ya existe en `lib/pricing-tiers.ts`.
6. **Base de datos compartida** para packs guardados y para registrar aprobaciones (hoy `localStorage` por navegador). Requiere login/contraseña primero. *Necesita del usuario:* decidir si lo quieren (se preguntó).
7. **Halloween (Tier 2).** MyCOCOS: 6 ofertas evaluadas y cargadas en `public/propuestas-mycocos.json` (pestaña "Para aprobar"; el artefacto no cambió precios ni productos al 20‑oct, solo aclaró nombres de hojillas). **MENNT: al 20‑oct (tarde) ya tiene 6 ofertas con precio Tier 2 (antes estaban en 0), sin evaluar a fondo.** Revisión preliminar solo de margen (costos de la maestra, meta 65 % combos / 68–69 % suelto): cumplen Carry On Pro 1.0 ($63.990, 66,0 %), Carry On Wheels ($119.990, 69,2 %), Carry On TOP Negro Híbrida ($73.990, 66,3 %) y Bolso Magnético GYM ($29.990, 72,7 %); **bajo la meta** Airless on TOP ($109.990, 64,7 %, −0,3 pts) y Bolso Deportivo PRO GYM ($37.990, 62,6 %, −2,4 pts). Falta histórico de precios, stock y cargarlas en la app (hacer `propuestas-mennt.json` y `propuestasFile` en `lib/brands.ts`). MyHUEVOS (13): sin Tier 2. Falta que los líderes decidan; ver `docs/ANALISIS_HALLOWEEN.md`. El artefacto **sigue cambiando**: releerlo antes de evaluar.
8. **Catálogo MENNT:** faltan 13 productos sueltos activos de la maestra (ej. The Roll Bag Navy/Beige, Airless on TOP, Creator Bag, Carry On Wheels) y hay 7 inactivos en el catálogo. *Necesita del usuario:* si los agregan / si se ocultan los inactivos.
9. **3 jabones sin costo en la maestra** (Tipo Encachao, WN Bacán, Mijito Rico): no están en el catálogo de MyCOCOS. Los 3 jabones con costo valen $1.962 neto. *Necesita del usuario:* confirmar si cuestan igual o poner el costo en la maestra.
10. **Packs ganadores de MyHUEVOS (7):** costos tomados a mano de una versión vieja de la maestra; los candidatos de la pestaña vigente están en `datos-fuente`/reporte (hojas "Packs"). Confirmar cuál corresponde a cada pack (hay variantes "3.0" y "4.0"). MENNT no tiene packs cargados (la maestra no trae costo confiable de sus combos).
11. **Costo de los "cepillos exfoliantes"** en PACK CYBER: se asumió capilar + corporal = $3.081 porque dice "cepillos" en plural. Confirmar.
12. **Calendario de tiers por mes** (`lib/pricing-tiers.ts`): sale del BATTLEMAP 2026 de Asana, pero **el tier asignado a cada mes es clasificación propia** (más de un evento por mes). Validar con el equipo. Hay otros proyectos de Asana aún sin usar (ver `INTEGRACIONES.md`).

## Baja / limpieza
13. **MyHUEVOS Colombia, tipo de producto:** todos quedaron con `tipo: 'Sin costo'` (placeholder), así que sus packs (KIT PRIME, THE MASTER PACK…) se tratan como unitarios en el Simulador. Asignar tipo por nombre.
14. **Código sin uso:** `lib/parser.ts`, `lib/parser-client.ts`, `app/api/parse/route.ts`, dependencias `xlsx` y `@anthropic-ai/sdk`.
15. **Sin pruebas automáticas.** Todo se ha verificado con `npm run build` y scripts ad hoc.
16. **Chat IA:** el modelo puede equivocarse en cuentas; solo ve el top‑20 de productos por marca.
17. **Cifras de la columna "Margen"** de MyHUEVOS usan el costo actual de la maestra en todos los meses (el reporte no trae costo): es una estimación.
