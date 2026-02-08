import folium
from shapely.geometry import Point, Polygon, LineString 
import os
from shapely.geometry import CAP_STYLE, JOIN_STYLE 

class GeoProcessor:
    def __init__(self, lat_inicial, lon_inicial, buffer_grados):
        self.LAT_INICIAL = lat_inicial
        self.LON_INICIAL = lon_inicial
        self.BUFFER_RADIO_GRADOS = buffer_grados
        self.ruta_simulada = [(lat_inicial, lon_inicial)]
        
        self.area_total_visitada = self._calcular_buffer_punto(lat_inicial, lon_inicial)

        # Polígono global para la niebla de guerra
        global_bbox = [(-180, -90), (-180, 90), (180, 90), (180, -90), (-180, -90)]
        self.global_polygon = Polygon(global_bbox)
    
    def _calcular_buffer_punto(self, lat, lon):
        punto = Point(lon, lat)
        return punto.buffer(self.BUFFER_RADIO_GRADOS)

    def _calcular_buffer_linea(self, punto1, punto2):
        lon1, lat1 = punto1[1], punto1[0]
        lon2, lat2 = punto2[1], punto2[0]
        linea = LineString([(lon1, lat1), (lon2, lat2)])
        return linea.buffer(
            self.BUFFER_RADIO_GRADOS, 
            join_style=JOIN_STYLE.round, 
            cap_style=CAP_STYLE.round
        )

    def agregar_punto(self, lat, lon):
        if self.ruta_simulada:
            punto_anterior = self.ruta_simulada[-1]
        else:
            punto_anterior = None
            
        nuevo_punto = (lat, lon)
        self.ruta_simulada.append(nuevo_punto)

        if punto_anterior is not None:
            nuevo_descubrimiento = self._calcular_buffer_linea(punto_anterior, nuevo_punto)
        else:
            nuevo_descubrimiento = self._calcular_buffer_punto(lat, lon)

        self.area_total_visitada = self.area_total_visitada.union(nuevo_descubrimiento)
        return len(self.ruta_simulada)
    
    def generar_mapa_html(self, skin_seleccionada='Punto', color_ruta='#3498DB', puntos_interes=None):
        """
            Genera el HTML del mapa incluyendo:
            1. Niebla de guerra 
            2. Skins de posición (Flecha, Punto, Carrito) [cite: 20]
            3. Registro de Puntos de Interés 
        """
        m = folium.Map(location=[self.LAT_INICIAL, self.LON_INICIAL], zoom_start=17)


        # 1. Niebla de Guerra
        area_no_descubierta = self.global_polygon.difference(self.area_total_visitada)
        folium.GeoJson(
            area_no_descubierta.__geo_interface__,
            name='Niebla de Guerra',
            style_function=lambda x: {
                'fillColor': '#000000', 
                'color': '#000000', 
                'fillOpacity': 0.95
            }
        ).add_to(m)

        # 2. Trayecto: Línea Punteada 
        if len(self.ruta_simulada) > 1:
            folium.PolyLine(
                locations=self.ruta_simulada,
                color=color_ruta,
                weight=3,
                dash_array=dash_pattern,
                line_cap='round'
            ).add_to(m)
        
        if puntos_interes:
            for poi in puntos_interes:
                folium.Marker(
                    location=[poi['lat'], poi['lon']],
                    popup=poi['nota'], # El comentario se ve al hacer clic 
                    icon=folium.Icon(color='red', icon='info-sign')
                ).add_to(m)

        # 3. Marcador de Posición Personalizado (Skins [cite: 19, 20])
        if self.ruta_simulada:
            lat, lon = self.ruta_simulada[-1]
            
            # Intentar cargar la skin personalizada
            nombre_archivo = f"skin_{skin_seleccionada.lower()}.png"
            
            if os.path.exists(nombre_archivo):
                # Usar el Asset personalizado [cite: 21, 22, 23]
                icono_custom = folium.CustomIcon(
                    nombre_archivo,
                    icon_size=(35, 35),
                    icon_anchor=(17, 17)
                )
                folium.Marker(
                    location=[lat, lon],
                    icon=icono_custom,
                    tooltip="Tu posición"
                ).add_to(m)
            else:
                # Marcador de respaldo si no existe el archivo
                folium.CircleMarker(
                    location=[lat, lon],
                    radius=6,
                    color=color_ruta,
                    fill=True,
                    fill_opacity=0.8
                ).add_to(m)

        # 4. Guardar archivo temporal
        temp_html_file = "mapa_temp.html"
        m.save(temp_html_file)
        return os.path.abspath(temp_html_file)