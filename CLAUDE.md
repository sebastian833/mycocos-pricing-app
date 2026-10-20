@AGENTS.md

# App de pricing multi‑marca (MyCOCOS · MyHUEVOS · MENNT)

Guía principal para Claude Code. **Léela completa antes de tocar nada.** El detalle está en `docs/` (índice al final).

## Qué es
App web interna para decidir precios: muestra el histórico de ventas, calcula precios sugeridos por tipo de oferta (Tier 1/2/3), arma y evalúa packs/combos, y deja propuestas para aprobación de los líderes. La usa un equipo comercial chico (2–5 personas, **no técnicas**). Hoy **es pública: no tiene login**.

- Producción: https://mycocos-pricing-app.vercel.app
- Repo: https://github.com/sebastian833/mycocos-pricing-app (rama `main`)
- Vercel: equipo `sebastian-rojas-projects1`, proyecto `mycocos-pricing-app`

## Cómo se corre y se despliega
```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # SIEMPRE antes de entregar cambios (compila TypeScript)
# despliegue (lo hace el usuario en su terminal; dale los comandos listos para pegar):
git add . && git commit -m "..." && git push && vercel --prod
```
- Node 24 (el usuario usa v24.14). En una carpeta nueva, la primera vez `vercel --prod` pregunta por el proyecto: `vercel link` → equipo `sebastian-rojas-projects1` → proyecto existente `mycocos-pricing-app` (las variables de entorno ya están en Vercel). Falta `vercel login` si la sesión caducó.
- Variables de entorno: `GROQ_API_KEY` (Vercel y `.env.local`), opcional `GROQ_MODEL`. **Nunca** versionar claves.
- Después de desplegar el navegador puede mostrar datos viejos: pedir **Cmd+Shift+R**.

## Stack
Next.js 16.2.9 (App Router) · React 19 · TypeScript · Tailwind v4 · chart.js (react-chartjs-2) · lucide-react · groq-sdk (Chat IA). Todo es cliente + archivos JSON estáticos en `public/`; no hay base de datos. (`@anthropic-ai/sdk`, `xlsx`, `lib/parser*.ts` y `app/api/parse` son restos sin uso.)

## Mapa del código
| Ruta / archivo | Qué hace |
|---|---|
| `app/page.tsx` | Portada: 4 atajos + resumen de ventas por año (sin carga de archivos) |
| `app/informe/page.tsx` | Histórico por producto: precio, descuento, margen %, margen en plata, unidades |
| `app/simulador/page.tsx` | Calculadora de precio + calendario "qué precio usar cada mes" |
| `app/packs/page.tsx` | 5 pestañas: Los que más venden · Todos los packs · Armar nuevo · Guardados · Para aprobar |
| `app/chat/page.tsx`, `app/api/chat/route.ts` | Chat IA (Groq). Prueba una lista de modelos en orden y salta al siguiente ante cualquier error que no sea 401 |
| `app/ayuda/page.tsx` | Guía en lenguaje simple |
| `components/TierScenarios.tsx` | Tarjetas de 3 precios, regalos, costo, precio propio, desglose IVA, "Guardar pack". Lo usan Simulador y Packs |
| `components/Nav.tsx` | Menú + selector de marca |
| `lib/brands.ts` | Las 4 marcas y qué archivos usa cada una |
| `lib/context.tsx` | Estado global: marca activa (localStorage `mycocos_marca_activa`), carga del JSON, arma el contexto del chat (moneda por país) |
| `lib/pricing-tiers.ts` | Reglas de precio: Tier 1/2/3, márgenes meta, IVA, redondeo .990, calendario por país, elasticidad |
| `lib/saved-packs.ts` | Packs guardados en `localStorage` (clave `pricing_packs_guardados_v1`), exportar/importar JSON |
| `lib/search.ts` | Búsqueda de productos (sin tildes, `+` para varios) |
| `public/*.json` | Datos (ver `docs/DATOS.md`) |
| `scripts/` | Python para regenerar datos y alinear costos con la maestra |

## Reglas que NO se pueden romper
1. **IVA.** Todos los precios al público llevan IVA (Chile 19 %, Colombia 19 %; México 16 % **pendiente**: hoy el código usa 1,19 fijo en `lib/pricing-tiers.ts`, `TierScenarios.tsx` y `simulador/page.tsx`). Neto = precio ÷ 1,19. Ganancia = neto − costo. Margen % = ganancia ÷ neto. En Chile el reporte confirma bruto = neto × 1,19 en el 100 % de las líneas. En Colombia el export de órdenes calcula el impuesto como 0,19 % (error del export) pero el precio **sí** lleva 19 %: el neto es `Base total ÷ 1,19`.
2. **Costos siempre netos** (sin IVA), desde la maestra (Google Sheets). Jamás usar la columna COSTO BRUTO. La maestra tiene 31 pestañas con duplicados: **no leerla como una sola tabla** (así se cargaron costos brutos y de pestañas viejas). Pestaña vigente: MyCOCOS → `MyCOCOS`; MyHUEVOS Colombia → `MYHUEVOS COL Antigua` (confirmado por el usuario); MENNT → `E COMPANY`. Detalle en `docs/DATOS.md`.
3. **Años en los JSON.** En `data-*.json` los campos `*25` son siempre el año **actual** (`años[1]`) y los `*24` el **anterior** (`años[0]`), sea cual sea el calendario. Ya hubo un error por invertirlos.
4. **Margen en % siempre con su monto en plata** (por unidad o pack), y precios con desglose "neto + IVA". Pedido explícito de los líderes.
5. **Lenguaje simple** en pantalla: "Último costo", "Precio de venta", "Precio normal", sin jerga (EVG, spread, Δ). Formato es‑CL ($49.990); decimales con coma en los textos.
6. **No inventar números.** Verifica contra los reportes (el total de la columna Margen del reporte coincide exacto con `resumen.margen_total`). Separa lo verificado de lo supuesto.
7. Packs guardados y marca activa viven en el **navegador de cada persona** (no se comparten). La aprobación de propuestas **no se registra** en la app.

## Reglas de precio (resumen; ver `docs/NEGOCIO.md`)
Margen meta por oferta — combos (productos distintos = `kit`), packs (mismo SKU repetido = `pack`) y producto suelto:
| Oferta | Cuándo | Combo | Pack | Suelto |
|---|---|---|---|---|
| Tier 1 · Oferta Fuerte | Cyber, Black Friday | 60 % | 55 % | 65–68 % |
| Tier 2 · Oferta Media | Promociones normales | 65 % | 60 % | 68–69 % |
| Tier 3 · Precio Normal | Todos los días | 68 % | 65 % | 70–75 % |
Precio = costo ÷ (1 − margen) × 1,19, redondeado a …990.

## Cómo actualizar datos (resumen; ver `docs/DATOS.md`)
1. Dejar el reporte nuevo en `../datos-fuente/ventas/` con el nombre canónico.
2. `python scripts/build_data.py --marca <mycocos|mennt|myhuevos> --datos ../datos-fuente` (reproduce los JSON actuales; verificado).
3. `python scripts/aplicar_costos_maestra.py` → revisar el reporte Excel → repetir con `--aplicar`.
4. `npm run build`, revisar, desplegar.
**Cuidado:** el Informe de MyCOCOS publicado cubre 2024–2025; existe el reporte 2026 (hasta 17‑jul) sin cargar (ver `docs/PENDIENTES.md`).

## Cómo trabajar con el usuario
- Español, simple, directo ("para dummies"). Explica el porqué de cada cambio.
- Entrega **comandos listos para pegar** en terminal (macOS/zsh) y qué debería verse al terminar. En esta colaboración se perdieron cambios por paquetes no aplicados: antes de partir, confirma con `git status` que el repo local es lo último.
- Antes de cambios masivos de datos (costos), muestra un **reporte de cambios** y espera el OK.
- Reconoce errores propios con transparencia (varios en `docs/HISTORIAL.md`) y verifica con datos antes de afirmar.
- Una pregunta a la vez. No guardes ni repitas claves.

## Estado al cierre de la sesión anterior
Último paquete entregado: "app más fácil de entender" (portada sin carga de archivos, página `/ayuda`, textos claros, resumen en frase de las ofertas para aprobar). **Verifica que esté aplicado** (existe `app/ayuda/page.tsx`; la portada no debe decir "Cargar otro archivo"). Pendientes priorizados en `docs/PENDIENTES.md`.

## Índice de docs
- `docs/PENDIENTES.md` — qué falta y qué se necesita del usuario
- `docs/NEGOCIO.md` — marcas, IVA, tiers, costos, calendario, packs
- `docs/DATOS.md` — reportes fuente, esquemas JSON, scripts, trampas
- `docs/INTEGRACIONES.md` — Drive, Asana, artefacto de ofertas, Groq, Vercel
- `docs/ANALISIS_HALLOWEEN.md` — revisión de los packs Tier 2 de Halloween
- `docs/HISTORIAL.md` — cronología, errores encontrados y aprendizajes
- `docs/VERIFICACION.md` — qué debe verse en cada pantalla (números correctos para comprobar que nada se rompió)
- `docs/historial-conversaciones/` — volcado en bruto de la primera sesión (jun–jul 2026), con claves ocultas. **Solo local** (en `.gitignore`: el repo es público y trae datos internos)
- Fuera de `proyecto/`: `../datos-fuente/` (reportes, maestra, recetas, `asana-battlemap-2026/`, `artefacto-armador-packs/`), `../reportes/`, `../referencias/`
