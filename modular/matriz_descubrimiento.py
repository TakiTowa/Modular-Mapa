import tkinter as tk
from tkinter import ttk, messagebox, simpledialog
import os
from geoprocessor import GeoProcessor
from PIL import Image, ImageTk  # <-- CORREGIDO: Importar de PIL, no de Pillow

# ... (Constantes se mantienen igual) ...
LAT_BASE, LON_BASE = 20.65723843858684, -103.32558015040448 
GRADOS_POR_CUADRO = 0.00015 
FILAS, COLUMNAS = 15, 15
BUFFER_RADIO_GRADOS = 0.0002
TAMANO_CUADRO_PX = 40 
DESPLAZAMIENTO_GRADOS = COLUMNAS * GRADOS_POR_CUADRO 

class MatrizApp:
    def __init__(self, master):
        self.master = master
        master.title("Minimapa de Exploración - Prototipo")

        self.current_lat, self.current_lon = LAT_BASE, LON_BASE
        self.color_trayecto = "#3498DB" 
        self.puntos_canvas = [] 
        self.puntos_interes = [] 
        
        self.processor = GeoProcessor(self.current_lat, self.current_lon, BUFFER_RADIO_GRADOS)
        self.clics_unicos = set() 
        self.current_cuadros_ids = {} 

        # --- PESTAÑAS ---
        self.notebook = ttk.Notebook(master)
        self.notebook.pack(expand=True, fill="both")

        self.tab_mapa = tk.Frame(self.notebook)
        self.tab_config = tk.Frame(self.notebook)
        self.tab_bitacora = tk.Frame(self.notebook) # Tercera pestaña 

        self.notebook.add(self.tab_mapa, text="🗺️ Mapa")
        self.notebook.add(self.tab_config, text="⚙️ Skins") 
        self.notebook.add(self.tab_bitacora, text="📜 Bitácora") 

        self.setup_tab_mapa()
        self.setup_tab_config()
        self.setup_tab_bitacora()

    def setup_tab_mapa(self):
        frame_main = tk.Frame(self.tab_mapa)
        frame_main.pack(padx=10, pady=10)
        self.crear_panel_navegacion(frame_main)
        
        self.canvas = tk.Canvas(frame_main, width=COLUMNAS*TAMANO_CUADRO_PX, 
                                 height=FILAS*TAMANO_CUADRO_PX, borderwidth=1, relief="solid")
        self.canvas.grid(row=1, column=1, padx=10, pady=10)
        
        # Botón para activar modo "Punto de Interés"
        self.modo_poi = tk.BooleanVar(value=False)
        tk.Checkbutton(frame_main, text="📍 Modo: Añadir Punto de Interés", 
                       variable=self.modo_poi, font=("Arial", 9, "bold")).grid(row=0, column=1)

        self.canvas.bind("<Button-1>", self.on_click_canvas)
        self.dibujar_cuadricula()
        self.crear_botones_control(frame_main)

    def on_click_canvas(self, event):
        if self.modo_poi.get():
            self.añadir_punto_interes(event)
        else:
            self.on_cuadro_clicado(event)
        
    def setup_tab_bitacora(self):
        """Configuración de la pestaña Bitácora según el GDD"""
        frame_bitacora = tk.Frame(self.tab_bitacora, padx=20, pady=20)
        frame_bitacora.pack(fill="both", expand=True)

        tk.Label(frame_bitacora, text="📜 Bitácora de Exploración", 
                 font=("Arial", 12, "bold")).pack(pady=10)
        
        # Área de texto para mostrar el registro personal 
        self.lista_txt = tk.Text(frame_bitacora, height=15, width=50, state="disabled")
        self.lista_txt.pack(padx=10, pady=10, fill="both", expand=True)
        
        tk.Label(frame_bitacora, text="Aquí se registrarán tus puntos de interés y notas.", 
                 font=("Arial", 8, "italic")).pack()
    def añadir_punto_interes(self, event):
        """Mecánica para registrar puntos personales en el mapa [cite: 14, 16]"""
        c, f = event.x // TAMANO_CUADRO_PX, event.y // TAMANO_CUADRO_PX
        lat, lon = self.convertir_a_coordenadas_geograficas(f, c)
        
        # Pedir comentario al usuario
        comentario = simpledialog.askstring("Punto de Interés", "Escribe una nota para este lugar:") [cite: 16]
        
        if comentario:
            punto = {"lat": lat, "lon": lon, "nota": comentario, "icono": "📍"}
            self.puntos_interes.append(punto)
            self.actualizar_lista_bitacora()
            
            # Dibujar un marcador visual pequeño en el canvas
            x, y = (c * TAMANO_CUADRO_PX)+20, (f * TAMANO_CUADRO_PX)+20
            self.canvas.create_text(x, y, text="📍", font=("Arial", 12))
            messagebox.showinfo("Bitácora", "Punto registrado con éxito.") [cite: 16]
        
    def actualizar_lista_bitacora(self):
        """Actualiza el texto en la pestaña de Bitácora """
        self.lista_txt.config(state="normal")
        self.lista_txt.delete("1.0", tk.END)
        for i, p in enumerate(self.puntos_interes, 1):
            texto = f"{i}. POI en ({p['lat']:.4f}, {p['lon']:.4f})\n   Nota: {p['nota']}\n{'-'*30}\n"
            self.lista_txt.insert(tk.END, texto)
        self.lista_txt.config(state="disabled")

    def setup_tab_config(self):
        """Pestaña de Skins consolidada (GDD) [cite: 20]"""
        frame_config = tk.Frame(self.tab_config, padx=20, pady=20)
        frame_config.pack(fill="both")

        try:
            self.assets = {
                "Flecha": ImageTk.PhotoImage(Image.open("skin_flecha.png").resize((30, 30))),
                "Punto": ImageTk.PhotoImage(Image.open("skin_punto.png").resize((30, 30))),
                "Carrito": ImageTk.PhotoImage(Image.open("skin_carrito.png").resize((30, 30)))
            }
        except Exception as e:
            print(f"Error cargando imágenes: {e}. Asegúrate de que los PNG existan.")
            self.assets = {}

        tk.Label(frame_config, text="Selecciona tu Skin de Icono:", font=("Arial", 10, "bold")).pack(anchor="w")
        self.var_skin = tk.StringVar(value="Punto")
        
        # Generar Radiobuttons con imagen si están disponibles 
        for nombre in ["Flecha", "Punto", "Carrito"]:
            img = self.assets.get(nombre)
            rb = tk.Radiobutton(frame_config, text=nombre, image=img, compound="left",
                                variable=self.var_skin, value=nombre, command=self.actualizar_preferencias)
            rb.pack(anchor="w", padx=20, pady=5)

        # Selección de Color (Estilo Visual Minimalista) [cite: 25, 26]
        tk.Label(frame_config, text="\nColor de Ruta:", font=("Arial", 10, "bold")).pack(anchor="w")
        self.var_color_ruta = tk.StringVar(value="#3498DB")
        colores = [("Azul (Punteado)", "#3498DB"), ("Gris (Minimalista)", "#7F8C8D")]
        
        for texto, valor in colores:
            tk.Radiobutton(frame_config, text=texto, variable=self.var_color_ruta, 
                           value=valor, command=self.actualizar_preferencias).pack(anchor="w", padx=20)

    def actualizar_preferencias(self):
        self.color_trayecto = self.var_color_ruta.get()
        print(f"Cambio: Skin {self.var_skin.get()} | Color {self.color_trayecto}")

    def on_cuadro_clicado(self, event):
        c, f = event.x // TAMANO_CUADRO_PX, event.y // TAMANO_CUADRO_PX
        if 0 <= f < FILAS and 0 <= c < COLUMNAS:
            if (f, c) in self.clics_unicos: return 
            self.clics_unicos.add((f, c))

            x_centro = (c * TAMANO_CUADRO_PX) + (TAMANO_CUADRO_PX // 2)
            y_centro = (f * TAMANO_CUADRO_PX) + (TAMANO_CUADRO_PX // 2)
            self.puntos_canvas.append((x_centro, y_centro))

            # Dibujar línea punteada azul en el prototipo [cite: 14]
            if len(self.puntos_canvas) > 1:
                p1, p2 = self.puntos_canvas[-2], self.puntos_canvas[-1]
                self.canvas.create_line(p1[0], p1[1], p2[0], p2[1], 
                                        fill=self.color_trayecto, width=2, dash=(4, 4))

            rect_id = self.current_cuadros_ids.get((f, c))
            self.canvas.itemconfig(rect_id, fill="#ECF0F1") 
            lat, lon = self.convertir_a_coordenadas_geograficas(f, c)
            self.processor.agregar_punto(lat, lon)

    def dibujar_cuadricula(self):
        self.canvas.delete("all")
        self.current_cuadros_ids = {} 
        for f in range(FILAS):
            for c in range(COLUMNAS):
                x1, y1 = c * TAMANO_CUADRO_PX, f * TAMANO_CUADRO_PX
                x2, y2 = (c + 1) * TAMANO_CUADRO_PX, (f + 1) * TAMANO_CUADRO_PX
                rect_id = self.canvas.create_rectangle(x1, y1, x2, y2, fill="white", outline="#AAAAAA")
                self.current_cuadros_ids[(f, c)] = rect_id

    def crear_panel_navegacion(self, parent_frame):
        frame_nav = tk.Frame(parent_frame)
        frame_nav.grid(row=1, column=0, rowspan=2, padx=10)
        tk.Button(frame_nav, text="▲ Arriba", command=lambda: self.mover_matriz("UP"), bg="#9B59B6", fg="white").grid(row=0, column=1, pady=2)
        tk.Button(frame_nav, text="◀ Izq", command=lambda: self.mover_matriz("LEFT"), bg="#9B59B6", fg="white").grid(row=1, column=0)
        self.label_posicion = tk.Label(frame_nav, text="Posición", font=('Arial', 8))
        self.label_posicion.grid(row=1, column=1)
        tk.Button(frame_nav, text="Der ▶", command=lambda: self.mover_matriz("RIGHT"), bg="#9B59B6", fg="white").grid(row=1, column=2)
        tk.Button(frame_nav, text="▼ Abajo", command=lambda: self.mover_matriz("DOWN"), bg="#9B59B6", fg="white").grid(row=2, column=1, pady=2)

    def actualizar_etiqueta_posicion(self):
        if hasattr(self, 'label_posicion'):
            self.label_posicion.config(text=f"{self.current_lat:.4f}\n{self.current_lon:.4f}")

    def crear_botones_control(self, parent_frame):
        frame_botones = tk.Frame(parent_frame)
        frame_botones.grid(row=2, column=1, pady=10)
        tk.Button(frame_botones, text="Generar Mapa HTML", command=self.generar_mapa_final,
                  bg="#2ecc71", fg="white", font=('Arial', 10, 'bold')).pack(side=tk.LEFT, padx=10)
        tk.Button(frame_botones, text="Salir", command=self.master.quit, bg="#e74c3c", fg="white").pack(side=tk.LEFT, padx=10)

    def convertir_a_coordenadas_geograficas(self, f, c):
        centro_f, centro_c = FILAS / 2.0, COLUMNAS / 2.0
        d_lat = (centro_f - (f + 0.5)) * GRADOS_POR_CUADRO
        d_lon = ((c + 0.5) - centro_c) * GRADOS_POR_CUADRO
        return self.current_lat + d_lat, self.current_lon + d_lon

    def mover_matriz(self, direccion):
        salto = DESPLAZAMIENTO_GRADOS 
        if direccion == "UP": self.current_lat += salto
        elif direccion == "DOWN": self.current_lat -= salto
        elif direccion == "RIGHT": self.current_lon += salto
        elif direccion == "LEFT": self.current_lon -= salto
        self.clics_unicos, self.puntos_canvas = set(), []
        self.dibujar_cuadricula()
        self.actualizar_etiqueta_posicion()
        self.processor.agregar_punto(self.current_lat, self.current_lon)

    def generar_mapa_final(self):
        if not self.processor.ruta_simulada: return
        try:
            # Enviamos también los puntos de interés al generador 
            html_path = self.processor.generar_mapa_html(
                skin_seleccionada=self.var_skin.get(),
                color_ruta=self.color_trayecto,
                puntos_interes=self.puntos_interes
            )
            os.startfile(html_path) 
        except Exception as e:
            messagebox.showerror("Error", str(e))

if __name__ == '__main__':
    root = tk.Tk()
    app = MatrizApp(root)
    root.mainloop()