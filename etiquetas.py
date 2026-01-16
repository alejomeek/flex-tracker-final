import streamlit as st
import fitz  # PyMuPDF
from PIL import Image, ImageDraw, ImageFont
import io
import json
from datetime import datetime, date
import os
import requests
import base64

# Importaciones de Windows (solo para impresión)
WINDOWS_AVAILABLE = False
try:
    from PIL import ImageWin
    import win32print
    import win32ui
    import win32con
    WINDOWS_AVAILABLE = True
except ImportError:
    pass  # Estamos en Mac/Linux, sin problema

# Configuración de la página
st.set_page_config(
    page_title="Sistema de Etiquetas",
    page_icon="🏷️",
    layout="wide",
    initial_sidebar_state="expanded"
)

# CSS personalizado
st.markdown("""
    <style>
    .main {
        background-color: #f0f2f6;
    }
    .stButton>button {
        width: 100%;
        height: 60px;
        font-size: 20px;
        font-weight: bold;
    }
    div[data-testid="stFileUploader"] {
        border: 2px dashed #3483fa;
        border-radius: 10px;
        padding: 20px;
        background-color: white;
    }
    </style>
    """, unsafe_allow_html=True)

# Configuración de Wix API
WIX_API_KEY = "IST.eyJraWQiOiJQb3pIX2FDMiIsImFsZyI6IlJTMjU2In0.eyJkYXRhIjoie1wiaWRcIjpcImQwYzY3NjM2LTBkOTctNDFlNy1hYWQ4LThmZTIyNWRjMjFiN1wiLFwiaWRlbnRpdHlcIjp7XCJ0eXBlXCI6XCJhcHBsaWNhdGlvblwiLFwiaWRcIjpcImVkYTRiNzRkLTI1YmYtNDc5My05ZmQ3LWJiODQwYzA5MTQyMlwifSxcInRlbmFudFwiOntcInR5cGVcIjpcImFjY291bnRcIixcImlkXCI6XCI3OTA5ZmY5ZC1kN2U5LTQ4YzktOTcyZi02ZDM1M2VlNmU0NDJcIn19IiwiaWF0IjoxNzY1MjQzNjMxfQ.QmPtRgP-sggDlRYdZVcESBg7wmy4UCi0a8dexIxaqLfIBjySYb4n38tCzCeOjQi_kfyMT-T1ya8eOfh_yXuHGtgDlO_jRlZNOTnMHO4DDldQD97i_o2IjOjkoutB4cVK92XKIOg_WRUoVWTzeubhtB63pAaDubOwm9bPkDaO4LLAY6O7kg9PXScx3jIMndIrar1oDuk4O5gMdQCiCc7c4UsHFk96o4EC2KKzcatIFUpbKAgqM8yH0I7nTKXdXQb87WHVYzIhoMFyJ0SONkfJAVMsl_oLfNcSIuL9486hfh4jq-y5V3o0CcS-SuTb76PemhjozRKDAQJPXaSSRfLNEw"
WIX_ACCOUNT_ID = "790ff99d-d7e9-48c9-972f-6d353ee6e442"
WIX_SITE_ID = "a290c1b4-e593-4126-ae4e-675bd07c1a42"

# Datos de la empresa
EMPRESA_INFO = {
    "nombre": "DIDÁCTICOS JUGANDO Y EDUCANDO SAS",
    "nit": "NIT 901,144,615-6",
    "direccion": "CC Bulevar - Local S113, Bogotá",
    "celular": "Celular 3134285423",
    "logo_path": "Logo-Rectangular.jpg"  # Logo actualizado
}

# Colores por día de la semana
COLORES_DIAS = {
    0: {"nombre": "VERDE", "dia": "Lunes", "color": "#00C853", "rgb": (0, 200, 83)},
    1: {"nombre": "NARANJA", "dia": "Martes", "color": "#FF6D00", "rgb": (255, 109, 0)},
    2: {"nombre": "AZUL", "dia": "Miércoles", "color": "#2979FF", "rgb": (41, 121, 255)},
    3: {"nombre": "AMARILLO", "dia": "Jueves", "color": "#FFD600", "rgb": (255, 214, 0)},
    4: {"nombre": "ROJO", "dia": "Viernes", "color": "#D50000", "rgb": (213, 0, 0)},
    5: {"nombre": "BLANCO", "dia": "Sábado", "color": "#FFFFFF", "rgb": (255, 255, 255)},
    6: {"nombre": "FUCSIA", "dia": "Domingo", "color": "#E91E63", "rgb": (233, 30, 99)},
}

# Archivo para guardar contadores
CONTADOR_FILE = "contador_diario.json"

# Funciones de gestión del contador UNIFICADO
def cargar_contador():
    """Carga el contador unificado del día desde el archivo JSON"""
    hoy = str(date.today())
    
    if os.path.exists(CONTADOR_FILE):
        try:
            with open(CONTADOR_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            if data.get('fecha') != hoy:
                return {
                    'fecha': hoy,
                    'contador_unificado': 0,
                    'historial': []
                }
            
            return data
        except:
            return {
                'fecha': hoy,
                'contador_unificado': 0,
                'historial': []
            }
    else:
        return {
            'fecha': hoy,
            'contador_unificado': 0,
            'historial': []
        }

def guardar_contador(data):
    """Guarda el contador en el archivo JSON"""
    with open(CONTADOR_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

def incrementar_contador(tipo='flex'):
    """Incrementa el contador unificado y devuelve el nuevo número"""
    data = cargar_contador()
    data['contador_unificado'] += 1
    
    # Agregar al historial
    data['historial'].append({
        'numero': data['contador_unificado'],
        'tipo': tipo,
        'hora': datetime.now().strftime("%H:%M:%S")
    })
    
    guardar_contador(data)
    return data['contador_unificado']

def obtener_numero_actual():
    """Obtiene el próximo número sin incrementar"""
    data = cargar_contador()
    return data['contador_unificado'] + 1

def reiniciar_contador():
    """Reinicia el contador unificado"""
    hoy = str(date.today())
    data = {'fecha': hoy, 'contador_unificado': 0, 'historial': []}
    guardar_contador(data)

# Función para detectar tipo de etiqueta ML
def detectar_tipo_etiqueta(pdf_bytes):
    """Detecta si la etiqueta es Flex o Colecta leyendo el texto del PDF"""
    try:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        page = doc[0]
        texto = page.get_text().lower()
        
        if "flex" in texto or "envío flex" in texto or "envio flex" in texto:
            return "FLEX"
        elif "colecta" in texto:
            return "COLECTA"
        else:
            return "COLECTA"
    except:
        return "COLECTA"

# Función para obtener pedidos de Wix
def obtener_pedidos_wix():
    """Obtiene TODOS los pedidos de Wix usando eCommerce API v1"""
    try:
        headers = {
            'Authorization': WIX_API_KEY,
            'wix-site-id': WIX_SITE_ID,
            'Content-Type': 'application/json'
        }
        
        # Endpoint correcto de eCommerce v1
        url = "https://www.wixapis.com/ecom/v1/orders/search"
        
        # Query para obtener todos los pedidos (sin filtros)
        payload = {
            "search": {
                "cursorPaging": {
                    "limit": 100
                }
            }
        }
        
        response = requests.post(url, headers=headers, json=payload, timeout=15)
        
        if response.status_code == 200:
            data = response.json()
            pedidos = data.get('orders', [])
            return pedidos  # Sin mensajes
                
        elif response.status_code == 400:
            st.error("Error de conexión con Wix")
            return []
            
        elif response.status_code == 401:
            st.error("Error de autenticación")
            return []
            
        elif response.status_code == 403:
            st.error("Sin permisos")
            return []
            
        elif response.status_code == 404:
            st.error("Wix Stores no encontrado")
            return []
            
        else:
            st.error(f"Error {response.status_code}")
            return []
            
    except requests.exceptions.Timeout:
        st.error("Timeout de conexión")
        return []
    except requests.exceptions.ConnectionError:
        st.error("Sin internet")
        return []
    except Exception as e:
        st.error(f"Error: {str(e)}")
        return []

# Función para dibujar círculo con número (MÁS GRANDE)
def dibujar_circulo_numero(image, numero, dia_semana):
    """Dibuja un círculo negro con número y el nombre del color debajo (VERSIÓN GRANDE)"""
    img_con_circulo = image.copy()
    draw = ImageDraw.Draw(img_con_circulo)
    
    config_color = COLORES_DIAS[dia_semana]
    nombre_color = config_color['nombre'].upper()
    
    diametro = 120  # Aumentado de 80 a 120
    margen = 15
    
    x = img_con_circulo.width - diametro - margen
    y = margen
    
    borde_grosor = 6  # Aumentado de 5 a 6
    
    # Borde negro grueso
    draw.ellipse(
        [x - borde_grosor, y - borde_grosor, 
         x + diametro + borde_grosor, y + diametro + borde_grosor],
        fill=(0, 0, 0),
        outline=(0, 0, 0),
        width=borde_grosor
    )
    
    # Círculo blanco
    draw.ellipse(
        [x, y, x + diametro, y + diametro],
        fill=(255, 255, 255),
        outline=(0, 0, 0),
        width=3
    )
    
    # Número - MUY GRANDE (proporcional al círculo)
    try:
        font_numero = ImageFont.truetype("arialbd.ttf", 90)  # Aumentado de 72 a 90
    except:
        try:
            font_numero = ImageFont.truetype("arial.ttf", 90)
        except:
            try:
                # Intentar con DejaVu (mejor soporte Unicode)
                font_numero = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 90)
            except:
                font_numero = ImageFont.load_default()
    
    texto_numero = str(numero)
    bbox = draw.textbbox((0, 0), texto_numero, font=font_numero)
    texto_ancho = bbox[2] - bbox[0]
    texto_alto = bbox[3] - bbox[1]
    
    texto_x = x + (diametro - texto_ancho) // 2
    texto_y = y + (diametro - texto_alto) // 2 - 10  # Ajustado para centrar mejor
    
    draw.text((texto_x, texto_y), texto_numero, font=font_numero, fill=(0, 0, 0))
    
    # Texto del color
    try:
        font_color = ImageFont.truetype("arialbd.ttf", 22)  # Aumentado de 18 a 22
    except:
        try:
            font_color = ImageFont.truetype("arial.ttf", 22)
        except:
            font_color = ImageFont.load_default()
    
    bbox_color = draw.textbbox((0, 0), nombre_color, font=font_color)
    color_ancho = bbox_color[2] - bbox_color[0]
    
    color_x = x + (diametro - color_ancho) // 2 + borde_grosor
    color_y = y + diametro + borde_grosor + 8  # Aumentado de 5 a 8
    
    draw.text((color_x, color_y), nombre_color, font=font_color, fill=(0, 0, 0))
    
    return img_con_circulo

# Función para generar etiqueta Wix (CON LOGO GRANDE ARRIBA)
def generar_etiqueta_wix(pedido_data, numero, dia_semana):
    """Genera una etiqueta de Wix con logo grande arriba y textos grandes centrados verticalmente"""
    # Crear imagen base (10x15 cm a 203 DPI)
    width_px = int(10 * 203 / 2.54)   # ~800 px
    height_px = int(15 * 203 / 2.54)  # ~1200 px
    
    img = Image.new('RGB', (width_px, height_px), 'white')
    draw = ImageDraw.Draw(img)
    
    # PASO 1: Cargar y medir logo
    logo_height = 0
    logo_width_final = 0
    try:
        if os.path.exists(EMPRESA_INFO['logo_path']):
            logo = Image.open(EMPRESA_INFO['logo_path'])
            # Logo GRANDE: 350px de ancho
            logo_width = 350
            logo_height = int(logo.height * (logo_width / logo.width))
            logo = logo.resize((logo_width, logo_height), Image.Resampling.LANCZOS)
            logo_width_final = logo_width
    except:
        pass
    
    # Calcular líneas de dirección para estimar altura
    try:
        direccion = pedido_data['direccion'].encode('latin-1').decode('utf-8') if isinstance(pedido_data['direccion'], str) else str(pedido_data['direccion'])
    except:
        direccion = str(pedido_data['direccion'])
    direccion_lines = direccion.split('\n') if '\n' in direccion else [direccion]
    num_lineas_dir = len([l for l in direccion_lines if l.strip()])
    
    # Calcular si hay observaciones
    tiene_obs = bool(pedido_data.get('observaciones') and str(pedido_data.get('observaciones')).strip())
    
    # Altura total aproximada del contenido (CON LOGO)
    altura_contenido = (
        logo_height +           # Logo
        30 +                    # Espacio después logo
        (34 * 4) +             # 4 líneas empresa (28pt)
        30 +                    # Espacio antes línea
        3 +                     # Línea separadora
        40 +                    # Espacio después línea
        50 +                    # Destinatario (40pt)
        48 +                    # Celular (36pt)
        (44 * num_lineas_dir) + # Dirección
        55 +                    # Ciudad
        55 +                    # Pedido
        (72 if tiene_obs else 0)  # Observaciones
    )
    
    # Calcular margen superior para centrar verticalmente
    margen_superior = (height_px - altura_contenido) // 2
    margen_superior = max(30, margen_superior)  # Mínimo 30px
    
    # PASO 2: Pegar logo centrado horizontalmente
    logo_y = margen_superior
    logo_height_final = 0
    try:
        if os.path.exists(EMPRESA_INFO['logo_path']):
            logo = Image.open(EMPRESA_INFO['logo_path'])
            logo_width = 350
            logo_height = int(logo.height * (logo_width / logo.width))
            logo = logo.resize((logo_width, logo_height), Image.Resampling.LANCZOS)
            
            # Centrar logo horizontalmente
            logo_x = (width_px - logo_width) // 2
            img.paste(logo, (logo_x, logo_y), logo if logo.mode == 'RGBA' else None)
            logo_height_final = logo_height
    except:
        pass
    
    # Fuentes MUY GRANDES (Opción B)
    try:
        # Intentar con rutas de Mac primero
        font_empresa = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 28)
        font_destinatario = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 40)
        font_celular = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 36)
        font_direccion = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 36)
        font_ciudad = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 36)
        font_pedido = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 36)
        font_obs = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 32)
        font_obs_label = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 32)
    except:
        try:
            # Fallback a nombres simples (Windows)
            font_empresa = ImageFont.truetype("arialbd.ttf", 28)
            font_destinatario = ImageFont.truetype("arialbd.ttf", 40)
            font_celular = ImageFont.truetype("arial.ttf", 36)
            font_direccion = ImageFont.truetype("arial.ttf", 36)
            font_ciudad = ImageFont.truetype("arialbd.ttf", 36)
            font_pedido = ImageFont.truetype("arialbd.ttf", 36)
            font_obs = ImageFont.truetype("arial.ttf", 32)
            font_obs_label = ImageFont.truetype("arialbd.ttf", 32)
        except:
            font_empresa = ImageFont.load_default()
            font_destinatario = ImageFont.load_default()
            font_celular = ImageFont.load_default()
            font_direccion = ImageFont.load_default()
            font_ciudad = ImageFont.load_default()
            font_pedido = ImageFont.load_default()
            font_obs = ImageFont.load_default()
            font_obs_label = ImageFont.load_default()
    
    # PASO 3: Dibujar contenido
    margin_left = 30
    margin_right = 170
    y = logo_y + logo_height_final + 30  # Espacio después del logo
    
    # Información de la empresa (28pt BOLD)
    empresa_lines = [
        EMPRESA_INFO['nombre'],
        EMPRESA_INFO['nit'],
        EMPRESA_INFO['direccion'],
        EMPRESA_INFO['celular']
    ]
    
    for line in empresa_lines:
        try:
            line_text = line.encode('latin-1').decode('utf-8') if isinstance(line, str) else str(line)
        except:
            line_text = str(line)
        draw.text((margin_left, y), line_text, font=font_empresa, fill=(0, 0, 0))
        y += 34
    
    # Línea separadora
    y += 30
    draw.line([(margin_left, y), (width_px - margin_right, y)], fill=(0, 0, 0), width=3)
    y += 40
    
    # SECCIÓN DESTINATARIO (40pt BOLD)
    try:
        nombre = pedido_data['nombre'].encode('latin-1').decode('utf-8') if isinstance(pedido_data['nombre'], str) else str(pedido_data['nombre'])
    except:
        nombre = str(pedido_data['nombre'])
    draw.text((margin_left, y), f"Destinatario: {nombre}", font=font_destinatario, fill=(0, 0, 0))
    y += 50
    
    # Celular (36pt)
    try:
        celular = pedido_data['celular'].encode('latin-1').decode('utf-8') if isinstance(pedido_data['celular'], str) else str(pedido_data['celular'])
    except:
        celular = str(pedido_data['celular'])
    draw.text((margin_left, y), f"Celular: {celular}", font=font_celular, fill=(0, 0, 0))
    y += 48
    
    # SECCIÓN DIRECCIÓN (36pt)
    direccion_lines = direccion.split('\n') if '\n' in direccion else [direccion]
    
    # Primera línea con label
    draw.text((margin_left, y), f"Dirección: {direccion_lines[0].strip()}", font=font_direccion, fill=(0, 0, 0))
    y += 44
    
    # Líneas adicionales de dirección (sin label)
    for i, line in enumerate(direccion_lines[1:]):
        if line.strip():
            draw.text((margin_left + 140, y), line.strip(), font=font_direccion, fill=(0, 0, 0))
            y += 44
    
    # Ciudad con label (36pt BOLD)
    try:
        ciudad = pedido_data['ciudad'].encode('latin-1').decode('utf-8') if isinstance(pedido_data['ciudad'], str) else str(pedido_data['ciudad'])
    except:
        ciudad = str(pedido_data['ciudad'])
    draw.text((margin_left, y), f"Ciudad: {ciudad}", font=font_ciudad, fill=(0, 0, 0))
    y += 55
    
    # Número de pedido (36pt BOLD)
    try:
        numero_pedido = pedido_data['numero_pedido'].encode('latin-1').decode('utf-8') if isinstance(pedido_data['numero_pedido'], str) else str(pedido_data['numero_pedido'])
    except:
        numero_pedido = str(pedido_data['numero_pedido'])
    draw.text((margin_left, y), f"Pedido: #{numero_pedido}", font=font_pedido, fill=(0, 0, 0))
    y += 55
    
    # Observaciones (32pt)
    if pedido_data.get('observaciones'):
        try:
            observaciones = pedido_data['observaciones'].encode('latin-1').decode('utf-8') if isinstance(pedido_data['observaciones'], str) else str(pedido_data['observaciones'])
        except:
            observaciones = str(pedido_data['observaciones'])
            
        if observaciones.strip():
            draw.text((margin_left, y), "Observaciones:", font=font_obs_label, fill=(0, 0, 0))
            y += 38
            
            max_chars = 28
            obs_lines = [observaciones[i:i+max_chars] for i in range(0, len(observaciones), max_chars)]
            for obs_line in obs_lines[:3]:
                draw.text((margin_left, y), obs_line, font=font_obs, fill=(0, 0, 0))
                y += 36
    
    # Agregar círculo con número
    img_final = dibujar_circulo_numero(img, numero, dia_semana)
    
    return img_final

# Funciones de procesamiento ML (igual que antes)
def crop_whitespace(image, threshold=250):
    gray = image.convert('L')
    bbox = gray.point(lambda x: 0 if x > threshold else 255).getbbox()
    if bbox:
        return image.crop(bbox)
    return image

def pdf_to_image(pdf_bytes, dpi=203):
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    page = doc[0]
    mat = fitz.Matrix(dpi/72, dpi/72)
    pix = page.get_pixmap(matrix=mat)
    img_data = pix.tobytes("png")
    img = Image.open(io.BytesIO(img_data))
    return img

def resize_to_label_size(image, dpi=203):
    width_px = int(10 * dpi / 2.54)
    height_px = int(15 * dpi / 2.54)
    
    if image.width > image.height:
        image = image.rotate(90, expand=True)
    
    img_ratio = image.width / image.height
    target_ratio = width_px / height_px
    
    if img_ratio > target_ratio:
        new_width = width_px
        new_height = int(width_px / img_ratio)
    else:
        new_height = height_px
        new_width = int(height_px * img_ratio)
    
    resized = image.resize((new_width, new_height), Image.Resampling.LANCZOS)
    
    final_img = Image.new('RGB', (width_px, height_px), 'white')
    paste_x = (width_px - new_width) // 2
    paste_y = (height_px - new_height) // 2
    final_img.paste(resized, (paste_x, paste_y))
    
    return final_img

def print_to_zebra(image, printer_name):
    """Imprime la imagen directamente en la impresora Zebra"""
    if not WINDOWS_AVAILABLE:
        st.error("❌ La impresión directa solo está disponible en Windows")
        st.info("💡 Usa el botón 'Descargar' y transfiere la imagen a la PC con la impresora")
        return False
    
    try:
        hprinter = win32print.OpenPrinter(printer_name)
        
        try:
            hdc = win32ui.CreateDC()
            hdc.CreatePrinterDC(printer_name)
            
            hdc.StartDoc("Etiqueta")
            hdc.StartPage()
            
            dib = ImageWin.Dib(image)
            
            printer_width = hdc.GetDeviceCaps(win32con.HORZRES)
            printer_height = hdc.GetDeviceCaps(win32con.VERTRES)
            
            dib.draw(hdc.GetHandleOutput(), (0, 0, printer_width, printer_height))
            
            hdc.EndPage()
            hdc.EndDoc()
            hdc.DeleteDC()
            
            return True
            
        finally:
            win32print.ClosePrinter(hprinter)
            
    except Exception as e:
        st.error(f"Error en impresión: {str(e)}")
        return False

# ============== SIDEBAR ==============
with st.sidebar:
    st.title("🏷️ Sistema de Etiquetas")
    st.caption("DIDÁCTICOS JUGANDO Y EDUC")
    
    st.divider()
    
    # Configuración de impresora
    st.header("⚙️ Configuración")
    
    try:
        if not WINDOWS_AVAILABLE:
            st.warning("⚠️ Impresión solo disponible en Windows")
            st.caption("En Mac: Usa el botón 'Descargar'")
            selected_printer = None
        else:
            printers = [p[2] for p in win32print.EnumPrinters(2)]
            zebra_printers = [p for p in printers if 'zebra' in p.lower() or 'zdesigner' in p.lower() or 'gc420' in p.lower()]
            
            if zebra_printers:
                selected_printer = st.selectbox("🖨️ Impresora", zebra_printers, index=0)
            else:
                st.warning("⚠️ No se detectó Zebra")
                selected_printer = st.selectbox("Impresora", printers)
    except Exception as e:
        if WINDOWS_AVAILABLE:
            st.error(f"Error: {str(e)}")
        selected_printer = None
    
    st.divider()
    
    # Selector de color del día
    st.header("📅 Color del Día")
    
    hoy = datetime.now()
    dia_semana_actual = hoy.weekday()
    
    # Permitir cambiar el color manualmente
    color_manual = st.checkbox("🎨 Cambiar color manualmente", value=False)
    
    if color_manual:
        opciones_colores = [f"{c['dia']} - {c['nombre']}" for c in COLORES_DIAS.values()]
        color_seleccionado_idx = st.selectbox(
            "Selecciona color:",
            range(7),
            format_func=lambda x: opciones_colores[x],
            index=dia_semana_actual
        )
        dia_semana = color_seleccionado_idx
    else:
        dia_semana = dia_semana_actual
    
    config_dia = COLORES_DIAS[dia_semana]
    
    st.markdown(f"**{config_dia['dia']}** - Color: **{config_dia['nombre']}**")
    st.markdown(
        f'<div style="width:100%; height:30px; background-color:{config_dia["color"]}; '
        f'border-radius:5px; border: 2px solid #ccc;"></div>',
        unsafe_allow_html=True
    )
    
    st.divider()
    
    # Contador UNIFICADO
    st.header("📊 Contador del Día")
    
    data_contador = cargar_contador()
    
    st.metric("🔢 Etiquetas Numeradas", data_contador['contador_unificado'])
    st.caption(f"Próximo número: **#{data_contador['contador_unificado'] + 1}**")
    st.caption("(FLEX + Wix)")
    
    # Botón de reinicio
    if st.button("↻ Reiniciar Contador", use_container_width=True):
        reiniciar_contador()
        st.success("Contador reiniciado")
        st.rerun()
    
    st.divider()
    
    # Total de sesión
    if 'total_printed' not in st.session_state:
        st.session_state.total_printed = 0
    
    st.metric("📈 Total Sesión", st.session_state.total_printed)

# ============== ÁREA PRINCIPAL ==============
# Crear tabs
tab1, tab2 = st.tabs(["📦 Mercado Libre", "🛒 Wix Commerce"])

# ============== TAB MERCADO LIBRE ==============
with tab1:
    st.header("📦 Etiquetas Mercado Libre")
    
    uploaded_file = st.file_uploader(
        "Arrastra o selecciona el PDF de la etiqueta",
        type=["pdf"],
        key="ml_uploader"
    )
    
    if uploaded_file is not None:
        pdf_bytes = uploaded_file.read()
        tipo_etiqueta = detectar_tipo_etiqueta(pdf_bytes)
        
        if tipo_etiqueta == "FLEX":
            numero_flex = obtener_numero_actual()  # Usar contador unificado
        else:
            numero_flex = None
        
        col_det1, col_det2 = st.columns(2)
        
        with col_det1:
            if tipo_etiqueta == "FLEX":
                st.success(f"🏷️ **Tipo:** Envío FLEX")
                st.info(f"#️⃣ **Número:** {numero_flex}")
            else:
                st.info(f"🏷️ **Tipo:** Colecta (sin numeración)")
        
        with col_det2:
            with st.expander("✏️ Editar"):
                tipo_manual = st.radio("Tipo:", ["FLEX", "COLECTA"], index=0 if tipo_etiqueta == "FLEX" else 1)
                
                if tipo_manual == "FLEX":
                    numero_manual = st.number_input("Número:", min_value=1, value=numero_flex if numero_flex else 1)
                    tipo_etiqueta = tipo_manual
                    numero_flex = numero_manual
                else:
                    tipo_etiqueta = "COLECTA"
                    numero_flex = None
        
        with st.spinner('Procesando...'):
            img = pdf_to_image(pdf_bytes, dpi=203)
            img = crop_whitespace(img)
            img_final = resize_to_label_size(img, dpi=203)
            
            # Solo agregar círculo si es FLEX
            if tipo_etiqueta == "FLEX" and numero_flex:
                img_final = dibujar_circulo_numero(img_final, numero_flex, dia_semana)
        
        col1, col2 = st.columns([3, 2])
        
        with col1:
            st.markdown("### 👁️ Vista Previa")
            st.image(img_final, use_container_width=True)
        
        with col2:
            st.markdown("### ℹ️ Información")
            st.success("✅ Lista para imprimir")
            st.caption("📏 10 x 15 cm | 🎯 203 DPI")
            
            if tipo_etiqueta == "FLEX":
                st.caption(f"🔢 Número: {numero_flex} | 🎨 {config_dia['nombre']}")
            else:
                st.caption("📦 Colecta (sin numeración)")
            
            st.divider()
            
            if selected_printer:
                if st.button("🖨️ IMPRIMIR", type="primary", use_container_width=True, key="print_ml"):
                    if print_to_zebra(img_final, selected_printer):
                        # Solo incrementar si es FLEX
                        if tipo_etiqueta == "FLEX":
                            incrementar_contador('flex')
                        st.success("✅ Impreso!")
                        st.balloons()
                        st.session_state.total_printed += 1
            
            st.divider()
            st.caption("📥 O descarga:")
            
            buf = io.BytesIO()
            img_final.save(buf, format='PNG')
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"ML_{tipo_etiqueta}_{numero_flex}_{config_dia['nombre']}_{timestamp}.png" if numero_flex else f"ML_COLECTA_{timestamp}.png"
            
            st.download_button("💾 Descargar", buf.getvalue(), filename, "image/png", use_container_width=True)
    
    else:
        st.info("📋 Arrastra el PDF de Mercado Libre para generar la etiqueta automáticamente")

# ============== TAB WIX ==============
with tab2:
    st.header("🛒 Pedidos Wix Commerce")
    
    if st.button("🔄 Actualizar Pedidos", type="primary"):
        with st.spinner("Cargando..."):
            st.session_state.pedidos_wix = obtener_pedidos_wix()
    
    if 'pedidos_wix' in st.session_state and st.session_state.pedidos_wix:
        st.markdown(f"### 📋 {len(st.session_state.pedidos_wix)} pedidos disponibles:")
        
        for idx, pedido in enumerate(st.session_state.pedidos_wix):
            # Extraer información del pedido
            numero_pedido = pedido.get('number', 'N/A')
            billing = pedido.get('billingInfo', {})
            shipping = pedido.get('shippingInfo', {})
            
            # Nombre del cliente
            contact_details = billing.get('contactDetails', {})
            nombre = f"{contact_details.get('firstName', '')} {contact_details.get('lastName', '')}".strip()
            if not nombre:
                nombre = "Sin nombre"
            
            # Dirección de envío
            shipping_dest = shipping.get('logistics', {}).get('shippingDestination', {})
            address = shipping_dest.get('address', {})
            ciudad = address.get('city', 'N/A')
            
            # Precio total - manejar que puede ser dict
            price_summary = pedido.get('priceSummary', {})
            total_obj = price_summary.get('total', {})
            
            if isinstance(total_obj, dict):
                total_amount = total_obj.get('amount', '0')
            else:
                total_amount = total_obj
            
            try:
                total_formatted = f"${float(total_amount):,.0f}"
            except:
                total_formatted = str(total_amount)
            
            # Estado del pedido
            payment_status = pedido.get('paymentStatus', 'N/A')
            fulfillment_status = pedido.get('fulfillmentStatus', 'N/A')
            
            with st.expander(f"#{numero_pedido} - {nombre} - {ciudad} - {total_formatted} COP | {fulfillment_status}"):
                # Dos columnas para observaciones y número
                col_obs, col_num = st.columns([3, 1])
                
                with col_obs:
                    # Campo de observaciones MANUAL
                    observaciones_manual = st.text_input(
                        "📝 Observaciones (opcional):",
                        value="",
                        key=f"obs_{idx}",
                        placeholder="Ej: Contraentrega, Llamar antes, etc."
                    )
                
                with col_num:
                    # Campo de número manual
                    numero_sugerido = obtener_numero_actual()
                    numero_manual = st.number_input(
                        "🔢 Número:",
                        min_value=1,
                        max_value=9999,
                        value=numero_sugerido,
                        key=f"num_{idx}",
                        help="Cambia el número si es necesario"
                    )
                
                if st.button(f"🏷️ Generar Etiqueta #{numero_pedido}", key=f"gen_{idx}"):
                    # Preparar datos para la etiqueta
                    shipping_contact = shipping_dest.get('contactDetails', {})
                    
                    pedido_data = {
                        'nombre': nombre,
                        'celular': shipping_contact.get('phone', contact_details.get('phone', 'N/A')),
                        'direccion': f"{address.get('addressLine', '')}\n{address.get('addressLine2', '')}".strip() or "Sin dirección",
                        'ciudad': ciudad,
                        'numero_pedido': numero_pedido,
                        'observaciones': observaciones_manual  # Usar observaciones manuales
                    }
                    
                    # Usar el número manual del input
                    numero_wix = numero_manual
                    
                    # Generar etiqueta
                    img_etiqueta = generar_etiqueta_wix(pedido_data, numero_wix, dia_semana)
                    
                    # Guardar en session_state para mantener la vista previa
                    st.session_state[f'etiqueta_{idx}'] = img_etiqueta
                    st.session_state[f'numero_{idx}'] = numero_wix
                
                # Mostrar preview si existe
                if f'etiqueta_{idx}' in st.session_state:
                    img_etiqueta = st.session_state[f'etiqueta_{idx}']
                    numero_wix = st.session_state[f'numero_{idx}']
                    
                    col1, col2 = st.columns([3, 2])
                    
                    with col1:
                        st.image(img_etiqueta, caption="Vista Previa", use_container_width=True)
                    
                    with col2:
                        st.success("✅ Etiqueta generada")
                        st.caption(f"🔢 #{numero_wix} | 🎨 {config_dia['nombre']}")
                        
                        if st.button("🖨️ IMPRIMIR", type="primary", key=f"print_{idx}"):
                            if print_to_zebra(img_etiqueta, selected_printer):
                                incrementar_contador('wix')
                                st.success("✅ Impreso!")
                                st.session_state.total_printed += 1
                                # Limpiar session_state
                                del st.session_state[f'etiqueta_{idx}']
                                del st.session_state[f'numero_{idx}']
                        
                        buf = io.BytesIO()
                        img_etiqueta.save(buf, format='PNG')
                        st.download_button("💾 Descargar", buf.getvalue(), f"WIX_{numero_pedido}_{numero_wix}.png", "image/png", key=f"dl_{idx}")
    
    else:
        st.info("👆 Haz clic en 'Actualizar Pedidos' para ver los pedidos pendientes de Wix")

st.markdown("---")
st.caption("🏷️ Sistema de Etiquetas v3.0 - DIDÁCTICOS JUGANDO Y EDUC")