import tkinter as tk
from tkinter import ttk, messagebox, simpledialog
import os
from geoprocessor import GeoProcessor
from PIL import Image, ImageTk

# --- CONFIGURACIÓN ---
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

        self.notebook = ttk.Notebook(master)
        self.notebook.pack(expand=True, fill="both")

        self.tab_mapa = tk.Frame(self.notebook)
        self.tab_config = tk.Frame(self.notebook)
        self.tab_bitacora = tk.Frame(self.notebook)

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
        frame_bitacora = tk.Frame(self.tab_bitacora, padx=20, pady=20)
        frame_bitacora.pack(fill="both", expand=True)
        tk.Label(frame_bitacora, text="📜 Bitácora de Exploración", font=("Arial", 12, "bold")).pack(pady=10)
        self.lista_txt = tk.Text(frame_bitacora, height=15, width=50, state="disabled")
        self.lista_txt.pack(padx=10, pady=10, fill="both", expand=True)
        tk.Label(frame_bitacora, text="Registro de puntos de interés y notas.", font=("Arial", 8, "italic")).pack()

    def añadir_punto_interes(self, event):
        c, f = event.x // TAMANO_CUADRO_PX, event.y // TAMANO_CUADRO_PX
        lat, lon = self.convertir_a_coordenadas_geograficas(f, c)
        comentario = simpledialog.askstring("Punto de Interés", "Escribe una nota:") 
        if comentario:
            self.puntos_interes.append({"lat": lat, "lon": lon, "nota": comentario})
            self.actualizar_lista_bitacora()
            x, y = (c * TAMANO_CUADRO_PX)+20, (f * TAMANO_CUADRO_PX)+20
            self.canvas.create_text(x, y, text="📍", font=("Arial", 12))

    def actualizar_lista_bitacora(self):
        self.lista_txt.config(state="normal")
        self.lista_txt.delete("1.0", tk.END)
        for i, p in enumerate(self.puntos_interes, 1):
            texto = f"{i}. POI en ({p['lat']:.4f}, {p['lon']:.4f})\n   Nota: {p['nota']}\n{'-'*30}\n"
            self.lista_txt.insert(tk.END, texto)
        self.lista_txt.config(state="disabled")

    def setup_tab_config(self):
        frame_config = tk.Frame(self.tab_config, padx=20, pady=20)
        frame_config.pack(fill="both")
        try:
            self.assets = {
                "Flecha": ImageTk.PhotoImage(Image.open("skin_flecha.png").resize((30, 30))),
                "Punto": ImageTk.PhotoImage(Image.open("skin_punto.png").resize((30, 30))),
                "Carrito": ImageTk.PhotoImage(Image.open("skin_carrito.png").resize((30, 30)))
            }
        except: self.assets = {}

        tk.Label(frame_config, text="Selecciona tu Skin de Icono:", font=("Arial", 10, "bold")).pack(anchor="w")
        self.var_skin = tk.StringVar(value="Punto")
        for nombre in ["Flecha", "Punto", "Carrito"]:
            rb = tk.Radiobutton(frame_config, text=nombre, image=self.assets.get(nombre), compound="left",
                                variable=self.var_skin, value=nombre, command=self.actualizar_preferencias)
            rb.pack(anchor="w", padx=20, pady=5)

        tk.Label(frame_config, text="\nColor de Ruta:", font=("Arial", 10, "bold")).pack(anchor="w")
        self.var_color_ruta = tk.StringVar(value="#3498DB")
        for t, v in [("Azul (Punteado)", "#3498DB"), ("Gris (Minimalista)", "#7F8C8D")]:
            tk.Radiobutton(frame_config, text=t, variable=self.var_color_ruta, value=v, command=self.actualizar_preferencias).pack(anchor="w", padx=20)

    def actualizar_preferencias(self):
        self.color_trayecto = self.var_color_ruta.get()

    def on_cuadro_clicado(self, event):
        c, f = event.x // TAMANO_CUADRO_PX, event.y // TAMANO_CUADRO_PX
        if 0 <= f < FILAS and 0 <= c < COLUMNAS:
            if (f, c) in self.clics_unicos: return 
            self.clics_unicos.add((f, c))
            x_c, y_c = (c * TAMANO_CUADRO_PX) + 20, (f * TAMANO_CUADRO_PX) + 20
            self.puntos_canvas.append((x_c, y_c))
            if len(self.puntos_canvas) > 1:
                p1, p2 = self.puntos_canvas[-2], self.puntos_canvas[-1]
                self.canvas.create_line(p1[0], p1[1], p2[0], p2[1], fill=self.color_trayecto, width=2, dash=(4, 4))
            rect_id = self.current_cuadros_ids.get((f, c))
            self.canvas.itemconfig(rect_id, fill="#ECF0F1") 
            lat, lon = self.convertir_a_coordenadas_geograficas(f, c)
            self.processor.agregar_punto(lat, lon)

    def dibujar_cuadricula(self):
        self.canvas.delete("all")
        for f in range(FILAS):
            for c in range(COLUMNAS):
                x1, y1 = c * TAMANO_CUADRO_PX, f * TAMANO_CUADRO_PX
                x2, y2 = x1 + TAMANO_CUADRO_PX, y1 + TAMANO_CUADRO_PX
                self.current_cuadros_ids[(f, c)] = self.canvas.create_rectangle(x1, y1, x2, y2, fill="white", outline="#AAAAAA")

    def crear_panel_navegacion(self, frame):
        f_nav = tk.Frame(frame)
        f_nav.grid(row=1, column=0, rowspan=2, padx=10)
        tk.Button(f_nav, text="▲", command=lambda: self.mover_matriz("UP")).grid(row=0, column=1)
        tk.Button(f_nav, text="◀", command=lambda: self.mover_matriz("LEFT")).grid(row=1, column=0)
        self.label_posicion = tk.Label(f_nav, text="Posición", font=('Arial', 8))
        self.label_posicion.grid(row=1, column=1)
        tk.Button(f_nav, text="▶", command=lambda: self.mover_matriz("RIGHT")).grid(row=1, column=2)
        tk.Button(f_nav, text="▼", command=lambda: self.mover_matriz("DOWN")).grid(row=2, column=1)

    def actualizar_etiqueta_posicion(self):
        self.label_posicion.config(text=f"{self.current_lat:.4f}\n{self.current_lon:.4f}")

    def crear_botones_control(self, frame):
        f_btn = tk.Frame(frame)
        f_btn.grid(row=2, column=1, pady=10)
        tk.Button(f_btn, text="Generar Mapa HTML", command=self.generar_mapa_final, bg="#2ecc71", fg="white").pack(side=tk.LEFT, padx=10)
        tk.Button(f_btn, text="Salir", command=self.master.quit, bg="#e74c3c", fg="white").pack(side=tk.LEFT, padx=10)

    def convertir_a_coordenadas_geograficas(self, f, c):
        d_lat = (FILAS/2.0 - (f + 0.5)) * GRADOS_POR_CUADRO
        d_lon = ((c + 0.5) - COLUMNAS/2.0) * GRADOS_POR_CUADRO
        return self.current_lat + d_lat, self.current_lon + d_lon

    def mover_matriz(self, dir):
        if dir == "UP": self.current_lat += DESPLAZAMIENTO_GRADOS
        elif dir == "DOWN": self.current_lat -= DESPLAZAMIENTO_GRADOS
        elif dir == "RIGHT": self.current_lon += DESPLAZAMIENTO_GRADOS
        elif dir == "LEFT": self.current_lon -= DESPLAZAMIENTO_GRADOS
        self.clics_unicos, self.puntos_canvas = set(), []
        self.dibujar_cuadricula()
        self.actualizar_etiqueta_posicion()
        self.processor.agregar_punto(self.current_lat, self.current_lon)

    def generar_mapa_final(self):
        try:
            path = self.processor.generar_mapa_html(self.var_skin.get(), self.color_trayecto, self.puntos_interes)
            os.startfile(path) 
        except Exception as e: messagebox.showerror("Error", str(e))

if __name__ == '__main__':
    root = tk.Tk()
    app = MatrizApp(root)
    root.mainloop()