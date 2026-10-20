import { TIERS } from '@/lib/pricing-tiers'

const pct = (n: number) => `${Math.round(n * 100)}%`

const OFERTAS = [
  { nombre: 'Oferta Fuerte (Tier 1)', cuando: 'Fechas de descuento grande: Cyber Day, Black Friday.', caja: 'bg-red-50 border-red-200', texto: 'text-red-700', t: TIERS[0] },
  { nombre: 'Oferta Media (Tier 2)', cuando: 'Promociones normales, como Día de la Madre o Halloween.', caja: 'bg-amber-50 border-amber-200', texto: 'text-amber-700', t: TIERS[1] },
  { nombre: 'Precio Normal (Tier 3)', cuando: 'El precio de todos los días, sin oferta.', caja: 'bg-green-50 border-green-200', texto: 'text-green-700', t: TIERS[2] },
]

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="bg-white border border-gray-200 rounded-2xl p-5 mb-4">
      <h2 className="text-base font-semibold text-gray-900 mb-3">{titulo}</h2>
      <div className="space-y-2 text-sm text-gray-700">{children}</div>
    </section>
  )
}

export default function Ayuda() {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900 mb-1">Guía rápida</h1>
        <p className="text-sm text-gray-500">Qué hace cada pantalla y qué significan las palabras que vas a ver. Léela una vez y listo.</p>
      </div>

      <Seccion titulo="¿Qué hace cada pantalla?">
        <p><b>Inicio:</b> resumen de la marca que elegiste arriba (MyCOCOS, MyHUEVOS o MENNT).</p>
        <p><b>Informe:</b> cómo se vendió un producto mes a mes: precio, descuento, unidades y cuánto margen dejó. Sirve para ver qué pasó en cada época del año.</p>
        <p><b>Packs:</b> aquí ves cuánto cuesta cada combo y a qué precio venderlo. También armas combos nuevos, los guardas y revisas los que están propuestos para aprobar.</p>
        <p><b>Simulador:</b> escribes un precio y te dice cuánto ganas. También te dice qué precio usar en cada mes del año.</p>
        <p><b>Chat IA:</b> le haces preguntas en palabras normales sobre las ventas de la marca elegida. Puede equivocarse en las cuentas: si es algo importante, confírmalo en el Informe.</p>
      </Seccion>

      <Seccion titulo="El IVA: cómo se separan los precios">
        <p>Todos los precios que ves llevan IVA (19%), porque son los que paga el cliente. Pero el IVA no es ganancia, así que la app lo separa:</p>
        <p className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
          Precio con IVA ÷ 1,19 = precio neto. <b>Ejemplo:</b> $49.990 con IVA = $42.008 neto + $7.982 de IVA.
        </p>
        <p>El <b>costo</b> siempre es neto (sin IVA) y sale de la maestra de productos. El <b>«último costo»</b> es el costo más reciente que figura en la maestra.</p>
      </Seccion>

      <Seccion titulo="Margen: lo que de verdad ganas">
        <p>El margen es lo que queda del precio neto después de pagar el costo. Se ve de dos formas:</p>
        <p><b>En porcentaje:</b> de cada $100 de venta sin IVA, cuántos son ganancia. Un margen de 65% significa que $65 son ganancia y $35 pagan el producto.</p>
        <p><b>En plata:</b> los mismos números en pesos. <b>Ejemplo:</b> precio neto $42.008 − costo $14.603 = $27.405 de ganancia por pack, que es 65,2%.</p>
        <p><b>Margen total</b> es lo que dejó el mes o el año completo, sumando todas las ventas. Si cada unidad deja $27.405 y se venden 100, quedan $2.740.500.</p>
      </Seccion>

      <Seccion titulo="Las tres ofertas (Tier) y cuánto queremos ganar en cada una">
        <p>Cada oferta tiene un margen mínimo que queremos cuidar. Cuanto más fuerte es el descuento, menos margen aceptamos:</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          {OFERTAS.map(o => (
            <div key={o.nombre} className={`border-2 rounded-xl p-3 ${o.caja}`}>
              <p className={`text-sm font-bold ${o.texto}`}>{o.nombre}</p>
              <p className="text-xs text-gray-600 mt-0.5 mb-2">{o.cuando}</p>
              <p className="text-xs text-gray-700">Combos: <b>{pct(o.t.margenes.kit)}</b></p>
              <p className="text-xs text-gray-700">Packs iguales: <b>{pct(o.t.margenes.pack)}</b></p>
              <p className="text-xs text-gray-700">Un producto: <b>{pct(o.t.margenes.unitario[0])} a {pct(o.t.margenes.unitario[1])}</b></p>
            </div>
          ))}
        </div>
        <p><b>Combo</b> son productos distintos juntos (rasuradora + cortaúñas + bolso). <b>Pack</b> son varias unidades iguales (3 desodorantes). La app te deja cambiar cuál es cuál con dos botones.</p>
      </Seccion>

      <Seccion titulo="Armar un pack, paso a paso">
        <p><b>1.</b> En Packs → «Armar nuevo», busca y elige los productos. Puedes escribir parte del nombre en el buscador.</p>
        <p><b>2.</b> Ponle un nombre (lo necesitas para guardarlo).</p>
        <p><b>3.</b> Mira los tres precios sugeridos y cuánto ganas con cada uno. Si quieres probar otro precio, escríbelo en la caja negra.</p>
        <p><b>4.</b> Si te sirve, guárdalo con los 3 precios o con uno solo. Queda en la pestaña «Guardados».</p>
        <p><b>Regalo:</b> un producto que se regala suma costo y baja la ganancia. Agrégalo con «Agregar regalo» para ver el número real.</p>
        <p><b>Costo aéreo:</b> si un producto llegó por avión y salió más caro, toca «Costo aéreo» y suma la diferencia: el cálculo se actualiza solo.</p>
      </Seccion>

      <Seccion titulo="Los colores">
        <p><b>Informe:</b> el precio más alto del año sale en verde y el más bajo en rojo. En el margen: verde desde 50%, amarillo entre 30% y 50%, rojo bajo 30%.</p>
        <p><b>Ofertas para aprobar:</b> verde significa que cumple la meta de margen; rojo, que no la cumple.</p>
        <p><b>Caja negra «otro precio»:</b> verde desde 55% de margen, amarillo entre 40% y 55%, rojo bajo 40%.</p>
      </Seccion>

      <Seccion titulo="Tres cosas que conviene tener presentes">
        <p><b>1.</b> Los packs que guardas quedan en tu navegador: no los ve el resto del equipo. Para pasarlos, usa Exportar e Importar.</p>
        <p><b>2.</b> En «Para aprobar», la app no registra quién aprobó ni cuándo: eso se responde por fuera.</p>
        <p><b>3.</b> En MyHUEVOS Colombia el reporte de ventas no trae costo, así que su margen histórico usa el costo actual de la maestra. Es una estimación.</p>
      </Seccion>
    </div>
  )
}
