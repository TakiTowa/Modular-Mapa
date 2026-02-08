import folium
from shapely.geometry import Point, Polygon
from shapely.ops import unary_union 
import json
import os


# --- CONFIGURACIÓN ---
LAT_INICIAL, LON_INICIAL = 20.65723843858684, -103.32558015040448  # CUCEI
BUFFER_RADIO_GRADOS = 0.0002 

# 1. SIMULACIÓN DE MOVIMIENTO
ruta_simulada = [
    (20.65723843858684, -103.32558015040448), 
    (20.65733843858684, -103.32568015040448), 
    (20.65743843858684, -103.32578015040448), 
    (20.65753843858684, -103.32588015040448), 
    (20.65763843858684, -103.32598015040448), 
    (20.65773843858684, -103.32608015040448),
    (20.65783843858684, -103.32618015040448)
]

# 2. LÓGICA DE DESCUBRIMIENTO
lista_buffers = []
for lat, lon in ruta_simulada:
    punto_actual = Point(lon, lat)
    nuevo_buffer = punto_actual.buffer(BUFFER_RADIO_GRADOS)
    lista_buffers.append(nuevo_buffer)

if lista_buffers:
    area_total_visitada = unary_union(lista_buffers)
else:
    area_total_visitada = None

# 3. VISUALIZACIÓN CON FOLIUM (Niebla de Guerra Global)

# Usamos un mapa base CLARO y un zoom bajo para ver la niebla global
m = folium.Map(
    location=[LAT_INICIAL, LON_INICIAL], 
    zoom_start=4, # Zoom bajo para ver el contexto continental/global
    tiles='OpenStreetMap' 
)

if area_total_visitada:
    # 3a. Definir el polígono global (La "Tierra") 🌎
    # Coordenadas extremas: -180, -90 a 180, 90
    global_bbox = [
        (-180, -90), # Suroeste
        (-180, 90),  # Noroeste
        (180, 90),   # Noreste
        (180, -90),  # Sureste
        (-180, -90)  # Cerrar
    ]
    global_polygon = Polygon(global_bbox)

    # 3b. Restar el área visitada (el 'agujero') del polígono global
    # Usamos el método .difference() del objeto global_polygon
    area_no_descubierta = global_polygon.difference(area_total_visitada)

    # 3c. Agregar la Niebla de Guerra (lo NO descubierto)
    geojson_data_niebla = area_no_descubierta.__geo_interface__

    folium.GeoJson(
        geojson_data_niebla,
        name='Niebla de Guerra',
        style_function=lambda x: {
            'fillColor': '#000000',  # Color Negro (Niebla)
            'color': '#000000',
            'weight': 0.1,
            'fillOpacity': 0.95      # 👈 Cambia este valor a 0.95 o 0.99
        }
    ).add_to(m)

    # Opcional: Agregar un contorno a lo visitado para resaltarlo (lo Claro)
    folium.GeoJson(
        area_total_visitada.__geo_interface__,
        name='Área Descubierta Borde',
        style_function=lambda x: {
            'color': '#FFD700',      # Borde Dorado Brillante
            'weight': 2,
            'fillOpacity': 0.0       # Sin relleno (para mostrar el mapa CLARO debajo)
        }
    ).add_to(m)

    

# Opcional: Agregar marcadores
for lat, lon in ruta_simulada:
    folium.CircleMarker(
        location=[lat, lon],
        radius=3,
        color='#FF0000',
        fill=True,
        fill_color='#FF3333'
    ).add_to(m)

# 4. GUARDAR EL PROTOTIPO
directorio_script = os.path.dirname(os.path.abspath(__file__)) 
nombre_archivo = "prototipo_niebla_guerra_global.html"
ruta_completa = os.path.join(directorio_script, nombre_archivo)

m.save(ruta_completa)

print(f"✅ Prototipo creado exitosamente.")
print(f"Ruta de guardado: {ruta_completa}")