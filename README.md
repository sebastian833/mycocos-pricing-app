# MyCOCOS Pricing Dashboard

App de análisis de precios, márgenes y temporadas para ShopyLibre Chile.

## Stack
- Next.js 14 (App Router) + TypeScript
- Tailwind CSS
- Chart.js + react-chartjs-2
- SheetJS (xlsx parsing en servidor)
- Anthropic SDK (chat IA)

## Desarrollo local

```bash
npm install
cp .env.local.example .env.local
# Edita .env.local y agrega tu ANTHROPIC_API_KEY
npm run dev
```

## Deploy en Vercel

### 1 — Subir a GitHub
```bash
git init
git add .
git commit -m "init: mycocos pricing dashboard"
git remote add origin https://github.com/TU_USUARIO/mycocos-pricing.git
git push -u origin main
```

### 2 — Conectar en Vercel
1. vercel.com → New Project → Import desde GitHub
2. Framework: Next.js (auto-detectado)
3. Environment Variables → agregar:
   - Name: `ANTHROPIC_API_KEY`
   - Value: tu API key (console.anthropic.com → API Keys)

### 3 — Deploy
Clic en Deploy. Listo. Vercel da una URL pública que puedes compartir con tu equipo.

## Variables de entorno requeridas

| Variable | Dónde obtenerla |
|---|---|
| `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys |

## Cómo usar la app

1. Subir reporte de ventas ShopyLibre (.xlsx)
2. **Informe** → evolución de precio mes a mes por producto y temporada
3. **Simulador** → iterar precio nacional / internacional, ver margen en tiempo real
4. **Chat IA** → preguntas en lenguaje natural sobre precios, márgenes y estrategia
