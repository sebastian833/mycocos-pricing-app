#!/usr/bin/env python3
"""
Genera public/data-<marca>.json (lo que leen Informe, Simulador y Chat) desde los reportes de ventas.

Uso (desde la carpeta proyecto/):
    python scripts/build_data.py --marca mennt    --datos ../datos-fuente
    python scripts/build_data.py --marca mycocos  --datos ../datos-fuente
    python scripts/build_data.py --marca myhuevos --datos ../datos-fuente
    (opcional: --salida otra/ruta.json; por defecto escribe public/data-<marca>.json)

Qué hace
  * Toma las ventas de dos años: ANTERIOR y ACTUAL (config en MARCAS). Los campos "25" del JSON
    (pb25, q25, mg25, m25...) son SIEMPRE el año actual y los "24" el año anterior, sea cual sea el año.
  * Se queda con los 20 productos más vendidos del año de ranking (excluye glosas, garantías, seguros).
  * Por producto y mes: precio de venta (mediana), precio de lista, precio neto, costo, % descuento,
    unidades, margen % y margen en plata (m25/m24).
  * MyCOCOS y MENNT (ShopyLibre): el reporte trae costo y margen reales por venta.
  * MyHUEVOS Colombia (Shopify): el reporte NO trae costo. Se usa el costo neto de la maestra (pestaña
    'MYHUEVOS COL Antigua', por SKU) + costos_manuales_myhuevos.json para los que no están ahí.
    Los precios de Colombia llevan IVA 19% (el export calcula mal el impuesto, ver CLAUDE.md): el neto
    es precio / 1,19.

Después de generar, correr scripts/aplicar_costos_maestra.py para alinear costos con la maestra.
"""
import argparse, json, os, sys, warnings
import pandas as pd
warnings.filterwarnings('ignore')

IVA = 1.19
EXCLUIR = ['GLOSA', 'GARANTÍA EXTENDIDA', 'GARANTIA EXTENDIDA', 'SEGURO DE ENVÍO', 'SEGURO DE ENVIO', 'PERSONALIZACIÓN', 'PERSONALIZACION']

MARCAS = {
    'mycocos': dict(tipo='shopylibre', anterior=('ventas/mycocos_ventas_2024.xlsx', 2024), actual=('ventas/mycocos_ventas_2025.xlsx', 2025),
                    ranking='actual', tiendas='Sucursal'),
    'mennt':   dict(tipo='shopylibre', anterior=('ventas/mennt_ventas_2025.xlsx', 2025), actual=('ventas/mennt_ventas_2026_hasta-18-sep.xlsx', 2026),
                    ranking='anterior', tiendas=['Casa Matriz']),
    'myhuevos': dict(tipo='shopify_col', anterior=('ventas/myhuevos-col_ventas_2025.xlsx', 2025), actual=('ventas/myhuevos-col_ventas_2026_hasta-31-ago.xlsx', 2026),
                     ranking='anterior', tiendas=['Shopify']),
}


def mediana(s):
    s = s.dropna(); s = s[s > 0]
    return float(s.median()) if len(s) else 0.0


def es_producto_real(nombre):
    n = str(nombre).upper()
    return not any(x in n for x in EXCLUIR)


# ------------------------------------------------------------------ carga
def cargar_shopylibre(ruta, año):
    cols = ['Tipo Movimiento', 'Fecha de Emisión', 'Producto / Servicio', 'Tipo de Producto / Servicio', 'Cantidad', 'Precio Bruto Unitario',
            'Precio de Lista', 'Precio Neto Unitario', 'Costo neto unitario', '% Descuento', 'Venta Total Bruta', 'Venta Total Neta', 'Margen', 'Sucursal']
    df = pd.read_excel(ruta, usecols=lambda c: c in cols)
    df = df[df['Tipo Movimiento'] == 'venta'].copy()
    df['mes'] = pd.to_datetime(df['Fecha de Emisión'], format='%d/%m/%Y', errors='coerce').dt.month
    df['producto'] = df['Producto / Servicio']
    df['año'] = año
    return df


def cargar_colombia(ruta, año):
    cols = ['Producto', 'SKU/EAN', 'Cantidad', 'Precio con descuento', 'Base total', '% Descuento', 'Fecha de creación', 'Estado de la Orden']
    df = pd.read_excel(ruta, usecols=lambda c: c in cols)
    df = df[df['Estado de la Orden'] == 'Entregado'].copy()
    df['mes'] = pd.to_datetime(df['Fecha de creación'], errors='coerce').dt.month
    df['producto'] = df['Producto']
    df['año'] = año
    return df


# ------------------------------------------------------------------ ShopyLibre (MyCOCOS, MENNT)
def producto_shopylibre(prod, ant, act, rank_df):
    r_ant, r_act = ant[ant['producto'] == prod], act[act['producto'] == prod]
    try:  # el tipo sale de las ventas del año con el que se armó el ranking
        tipo = str(rank_df[rank_df['producto'] == prod]['Tipo de Producto / Servicio'].mode()[0])
    except Exception:
        tipo = 'Otro'
    meses = []
    for m in range(1, 13):
        a, b = r_act[r_act['mes'] == m], r_ant[r_ant['mes'] == m]
        e = {'mes': m}
        if len(a):
            pb, pl, pn, c = (mediana(a['Precio Bruto Unitario']), mediana(a['Precio de Lista']), mediana(a['Precio Neto Unitario']), mediana(a['Costo neto unitario']))
            d = float(a['% Descuento'].mean()); d = d * 100 if d <= 1 else d
            e.update(pb25=round(pb), pl25=round(pl), pn25=round(pn), c25=round(c), d25=round(d, 1), q25=int(a['Cantidad'].sum()),
                     mg25=round((pn - c) / pn * 100, 1) if pn > 0 else 0)
        else:
            e.update(pb25=0, pl25=0, pn25=0, c25=0, d25=0, q25=0, mg25=0)
        if len(b):
            e['pb24'] = round(mediana(b['Precio Bruto Unitario'])); e['q24'] = int(b['Cantidad'].sum())
        e['m25'] = int(round(float(a['Margen'].sum()))) if len(a) else 0
        e['m24'] = int(round(float(b['Margen'].sum()))) if len(b) else 0
        meses.append(e)
    base = r_act if len(r_act) else r_ant
    costo_avg = round(mediana(base['Costo neto unitario']))
    pn_med = mediana(base['Precio Neto Unitario'])
    return {
        'nombre': prod[:70], 'tipo': tipo, 'meses': meses, 'costo_avg': costo_avg,
        'precio_bruto_avg': round(float(base['Precio Bruto Unitario'].mean())),
        'precio_lista_avg': round(float(base['Precio de Lista'].mean())),
        'margen_avg': round((pn_med - costo_avg) / pn_med * 100, 1) if pn_med > 0 else 0,
        'volumen_total': int(base['Cantidad'].sum()), 'venta_bruta_total': round(float(base['Venta Total Bruta'].sum())),
    }


# ------------------------------------------------------------------ Colombia (MyHUEVOS)
def costos_colombia(datos, ant, act):
    """costo neto por producto: maestra 'MYHUEVOS COL Antigua' (por SKU) + manuales."""
    import openpyxl
    costos = {}
    maestra = os.path.join(datos, 'maestra', 'MAESTRA_PRODUCTOS.xlsx')
    ws = openpyxl.load_workbook(maestra, data_only=True, read_only=False)['MYHUEVOS COL Antigua']
    neto_sku = {}
    for row in ws.iter_rows(min_row=1):
        s, e = row[0].value, row[4].value
        if isinstance(s, str) and s.startswith('MH') and isinstance(e, (int, float)) and e > 100:
            neto_sku.setdefault(s, round(e))
    todo = pd.concat([ant, act])
    sku_por_prod = todo.groupby('producto')['SKU/EAN'].agg(lambda x: str(x.mode()[0])).to_dict()
    for p, sku in sku_por_prod.items():
        if sku in neto_sku:
            costos[p[:70]] = neto_sku[sku]
    manual = os.path.join(datos, 'costos_manuales_myhuevos.json')
    if os.path.exists(manual):
        costos.update(json.load(open(manual, encoding='utf-8')))
    return costos


def producto_colombia(prod, ant, act, costo):
    r_ant, r_act = ant[ant['producto'] == prod], act[act['producto'] == prod]
    meses = []
    for m in range(1, 13):
        a, b = r_act[r_act['mes'] == m], r_ant[r_ant['mes'] == m]
        e = {'mes': m}
        if len(a):
            pb = mediana(a['Precio con descuento'])
            pn = mediana(a['Base total'] / a['Cantidad'].replace(0, 1)) / IVA       # neto = precio con IVA / 1,19
            e.update(pb25=round(pb), pl25=round(pb), pn25=round(pn), c25=costo, d25=round(float(a['% Descuento'].mean()), 1), q25=int(a['Cantidad'].sum()),
                     mg25=round((pn - costo) / pn * 100, 1) if pn > 0 and costo > 0 else 0,
                     m25=int(round(a['Base total'].sum() / IVA - costo * a['Cantidad'].sum())))
        else:
            e.update(pb25=0, pl25=0, pn25=0, c25=costo, d25=0, q25=0, mg25=0, m25=0)
        if len(b):
            e['pb24'] = round(mediana(b['Precio con descuento'])); e['q24'] = int(b['Cantidad'].sum())
            e['m24'] = int(round(b['Base total'].sum() / IVA - costo * b['Cantidad'].sum()))
        else:
            e['m24'] = 0
        meses.append(e)
    base = r_act if len(r_act) else r_ant
    pb_avg = round(float(base['Precio con descuento'].mean()))
    pn_aprox = pb_avg / IVA
    return {
        'nombre': prod[:70], 'tipo': 'Sin costo', 'meses': meses, 'costo_avg': costo,
        'precio_bruto_avg': pb_avg, 'precio_lista_avg': pb_avg,
        'margen_avg': round((pn_aprox - costo) / pn_aprox * 100, 1) if costo > 0 else 0,
        'volumen_total': int(base['Cantidad'].sum()),
        'venta_bruta_total': round(float((base['Precio con descuento'] * base['Cantidad']).sum())),
    }


# ------------------------------------------------------------------ principal
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--marca', required=True, choices=list(MARCAS))
    ap.add_argument('--datos', default='../datos-fuente')
    ap.add_argument('--salida')
    a = ap.parse_args()
    cfg = MARCAS[a.marca]
    salida = a.salida or os.path.join('public', f'data-{a.marca}.json')
    (f_ant, y_ant), (f_act, y_act) = cfg['anterior'], cfg['actual']
    cargar = cargar_shopylibre if cfg['tipo'] == 'shopylibre' else cargar_colombia
    print(f'Leyendo {f_ant} y {f_act} ...')
    ant, act = cargar(os.path.join(a.datos, f_ant), y_ant), cargar(os.path.join(a.datos, f_act), y_act)

    rank_df = ant if cfg['ranking'] == 'anterior' else act
    top = (rank_df[rank_df['producto'].apply(es_producto_real)].groupby('producto')['Cantidad'].sum().sort_values(ascending=False).head(20).index.tolist())
    print(f'Top 20 por unidades de {y_ant if cfg["ranking"] == "anterior" else y_act}')

    if cfg['tipo'] == 'shopylibre':
        productos = [producto_shopylibre(p, ant, act, rank_df) for p in top]
    else:
        costos = costos_colombia(a.datos, ant, act)
        faltan = [p[:50] for p in top if p[:70] not in costos]
        if faltan: print('  AVISO: sin costo (quedan en 0, agrégalos a costos_manuales_myhuevos.json):', faltan)
        productos = [producto_colombia(p, ant, act, costos.get(p[:70], 0)) for p in top]

    resumen = []
    for y, d in ((y_ant, ant), (y_act, act)):
        if cfg['tipo'] == 'shopylibre':
            resumen.append(dict(año=y, ventas_brutas=round(float(d['Venta Total Bruta'].sum())), ventas_netas=round(float(d['Venta Total Neta'].sum())),
                                unidades=int(d['Cantidad'].sum()), margen_total=round(float(d['Margen'].sum())), num_skus=int(d['producto'].nunique())))
        else:
            resumen.append(dict(año=y, ventas_brutas=round(float((d['Precio con descuento'] * d['Cantidad']).sum())), ventas_netas=round(float(d['Base total'].sum() / IVA)),
                                unidades=int(d['Cantidad'].sum()), margen_total=0, num_skus=int(d['producto'].nunique())))
    if cfg['tiendas'] == 'Sucursal':
        tiendas = [str(t) for t in act['Sucursal'].dropna().unique() if not str(t).upper().startswith('BODEGA')] if 'Sucursal' in act.columns else []
    else:
        tiendas = cfg['tiendas']
    data = {'productos': productos, 'resumen': resumen, 'años': [y_ant, y_act], 'tiendas': tiendas}
    os.makedirs(os.path.dirname(salida) or '.', exist_ok=True)
    json.dump(data, open(salida, 'w', encoding='utf-8'), ensure_ascii=False)
    print(f'Listo: {salida} ({len(productos)} productos)')
    for r in resumen: print(f"  {r['año']}: {r['unidades']:,} unidades · ventas ${r['ventas_brutas']/1e6:,.1f} M")


if __name__ == '__main__':
    main()
