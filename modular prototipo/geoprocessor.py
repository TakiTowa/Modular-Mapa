import folium
from shapely.geometry import Point, Polygon, LineString 
import os
from shapely.geometry import CAP_STYLE, JOIN_STYLE 

class GeoProcessor:
    def __init__(self, lat_inicial, lon_inicial, buffer_grados):
        self.LAT_INICIAL, self.LON_INICIAL = lat_inicial, lon_inicial
        self.BUFFER_RADIO_GRADOS = buffer_grados
        self.ruta_simulada = [(lat_inicial, lon_inicial)]
        self.area_total_visitada = Point(lon_inicial, lat_inicial).buffer(buffer_grados)
        self.global_polygon = Polygon([(-180, -90), (-180, 90), (180, 90), (180, -90), (-180, -90)])
    
    def agregar_punto(self, lat, lon):
        punto_ant = self.ruta_simulada[-1]
        nueva_pos = (lat, lon)
        self.ruta_simulada.append(nueva_pos)
        linea = LineString([(punto_ant[1], punto_ant[0]), (lon, lat)])
        nuevo_buf = linea.buffer(self.BUFFER_RADIO_GRADOS, join_style=JOIN_STYLE.round, cap_style=CAP_STYLE.round)
        self.area_total_visitada = self.area_total_visitada.union(nuevo_buf)
        return len(self.ruta_simulada)
    
    def generar_mapa_html(self, skin_seleccionada='Punto', color_ruta='#3498DB', puntos_interes=None):
        dash_pattern = '5, 10' # Línea punteada azul para trayecto diario [cite: 14, 16]
        m = folium.Map(location=[self.LAT_INICIAL, self.LON_INICIAL], zoom_start=17)

        # 1. Niebla de Guerra (Mecánica Nuclear) 
        area_niebla = self.global_polygon.difference(self.area_total_visitada)
        folium.GeoJson(area_niebla.__geo_interface__, style_function=lambda x: {'fillColor': '#000000', 'fillOpacity': 0.95}).add_to(m)

        # 2. Trayecto (Caminatas diarias) [cite: 16]
        if len(self.ruta_simulada) > 1:
            folium.PolyLine(self.ruta_simulada, color=color_ruta, dash_array=dash_pattern).add_to(m)
        
        # 3. Puntos de Interés (Bitácora) [cite: 16]
        if puntos_interes:
            for poi in puntos_interes:
                folium.Marker([poi['lat'], poi['lon']], popup=poi['nota'], icon=folium.Icon(color='red')).add_to(m)

        # 4. Marcador de Posición (Skins: Flecha, Punto, Carrito) 
        lat, lon = self.ruta_simulada[-1]
        file = f"skin_{skin_seleccionada.lower()}.png"
        if os.path.exists(file):
            folium.Marker([lat, lon], icon=folium.CustomIcon(file, icon_size=(35, 35))).add_to(m)
        else:
            folium.CircleMarker([lat, lon], radius=6, color=color_ruta, fill=True).add_to(m)

        m.save("mapa_temp.html")
        return os.path.abspath("mapa_temp.html")