# 📦 Flex Tracker MVP

Sistema completo de gestión de entregas para Mercado Libre Flex con Dashboard Web y PWA Móvil.

## 🎯 Descripción

Flex Tracker es un sistema de dos aplicaciones que permite:
- **Dashboard Web**: Crear y gestionar pedidos, ver estadísticas en tiempo real, y revisar evidencias fotográficas
- **PWA Móvil**: Escanear QR de etiquetas, tomar fotos de evidencia, y marcar entregas como completadas

## 🏗️ Estructura del Proyecto

```
mvp_flex_tracker/
├── dashboard/
│   ├── index.html          # Dashboard principal
│   ├── styles.css          # Estilos del dashboard
│   └── app.js              # Lógica del dashboard
├── mobile/
│   ├── index.html          # App móvil
│   ├── styles.css          # Estilos móviles
│   ├── app.js              # Lógica móvil
│   ├── manifest.json       # Configuración PWA
│   └── sw.js               # Service Worker
├── CLAUDE.md               # Especificaciones técnicas
└── README.md               # Este archivo
```

## 🚀 Tecnologías

- **Frontend**: HTML5 + CSS3 + JavaScript Vanilla (ES6+)
- **Backend**: Firebase (Firestore + Storage)
- **QR Scanner**: html5-qrcode library
- **PWA**: Service Worker + Web App Manifest

## 📋 Funcionalidades

### Dashboard Web (`/dashboard`)

✅ **Gestión de Pedidos**
- Crear pedidos manualmente con auto-incremento de serial
- Visualizar todos los pedidos en tiempo real
- Buscar por número de envío, venta, destinatario, dirección o serial
- Filtrar por estado (Todos, Pendientes, Entregados, No Entregados)

✅ **Estadísticas en Tiempo Real**
- Total de pedidos
- Pedidos pendientes
- Pedidos entregados
- Pedidos no entregados

✅ **Evidencias Fotográficas**
- Ver fotos de evidencia de entregas
- Información del repartidor y fecha de entrega

### PWA Móvil (`/mobile`)

✅ **Autenticación Simple**
- Selección de repartidor (sin password)
- Persistencia con localStorage

✅ **Escaneo de Pedidos**
- Escaneo QR con cámara trasera
- Entrada manual alternativa
- Validación de pedidos existentes

✅ **Gestión de Entregas**
- Captura de foto de evidencia
- Compresión automática de imágenes
- Subida a Firebase Storage
- Actualización de estado en tiempo real

✅ **Características PWA**
- Instalable en pantalla de inicio
- Funciona offline (UI solamente)
- Optimizado para móviles

## 🔧 Configuración

### Firebase

El proyecto ya está configurado con Firebase. La configuración se encuentra en:
- `dashboard/app.js`
- `mobile/app.js`

**Colección Firestore**: `pedidos_flex`

**Estructura de datos**:
```javascript
{
  numero_envio: "46189809667",
  numero_venta: "2000014538504744",
  numero_serial: 132,
  destinatario: "Julian Martinez",
  direccion: "Av. Carrera 70B #64b-24",
  distrito: "Normandía",
  telefono: "3001234567",
  estado: "pendiente" | "entregado" | "no_entregado",
  fecha_creacion: Timestamp,
  fecha_entrega: Timestamp | null,
  repartidor_id: "rep001" | null,
  repartidor_nombre: "Juan Pérez" | null,
  imagen_evidencia_url: "https://..." | null
}
```

### Repartidores

Los repartidores están hardcodeados en `mobile/app.js`:
- Juan Pérez (rep001)
- María González (rep002)
- Carlos Rodríguez (rep003)
- Ana Martínez (rep004)
- Luis Ramírez (rep005)

## 🌐 Despliegue en Vercel

### Opción 1: Desde la interfaz web

1. Ve a [vercel.com](https://vercel.com)
2. Importa el repositorio
3. Configura el proyecto:
   - **Framework Preset**: Other
   - **Root Directory**: `./`
   - **Build Command**: (dejar vacío)
   - **Output Directory**: `./`
4. Deploy

### Opción 2: Desde la CLI

```bash
# Instalar Vercel CLI
npm i -g vercel

# Navegar al directorio del proyecto
cd mvp_flex_tracker

# Desplegar
vercel
```

### Configuración de rutas

Crea un archivo `vercel.json` en la raíz:

```json
{
  "routes": [
    { "src": "/dashboard", "dest": "/dashboard/index.html" },
    { "src": "/mobile", "dest": "/mobile/index.html" }
  ]
}
```

## 📱 Uso

### Dashboard

1. Abre `https://tu-dominio.vercel.app/dashboard`
2. Click en "Crear Nuevo Pedido"
3. Completa el formulario (el serial se auto-incrementa)
4. Los pedidos aparecerán en la tabla en tiempo real
5. Usa los filtros y búsqueda para encontrar pedidos específicos
6. Click en "Ver Foto" para ver evidencias de entrega

### Mobile (Repartidores)

1. Abre `https://tu-dominio.vercel.app/mobile` en el celular
2. Selecciona tu nombre de la lista
3. Click en "Escanear Pedido"
4. Escanea el código QR de la etiqueta (o ingresa manualmente)
5. Toma foto de la evidencia
6. Click en "Marcar como Entregado"
7. Repite para el siguiente pedido

### Instalar como PWA

**Android:**
1. Abre la app en Chrome
2. Toca el menú (⋮)
3. Selecciona "Agregar a pantalla de inicio"

**iOS:**
1. Abre la app en Safari
2. Toca el botón compartir
3. Selecciona "Agregar a pantalla de inicio"

## 🎨 Diseño

### Colores

- **Primario**: #3b82f6 (Azul)
- **Éxito**: #10b981 (Verde)
- **Advertencia**: #f59e0b (Amarillo)
- **Error**: #ef4444 (Rojo)
- **Gris**: #6b7280

### Responsive

- Dashboard: Desktop-first, responsive para móvil
- Mobile: Mobile-first, optimizado para pantallas pequeñas
- Soporte para notch de iPhone
- Modo landscape

## 🔒 Seguridad

⚠️ **IMPORTANTE**: Este es un MVP con reglas de Firebase abiertas para desarrollo.

Para producción, actualiza las reglas de Firestore y Storage:

**Firestore Rules** (ejemplo):
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /pedidos_flex/{pedidoId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update: if request.auth != null;
      allow delete: if false;
    }
  }
}
```

## 📝 Notas Técnicas

- Sin autenticación real (solo selección de nombre)
- Sin backend adicional (todo es Firestore directo)
- Modo offline solo para UI, no para datos
- Sin notificaciones push
- Compresión de imágenes a max 1200px y 80% calidad
- Límite de tamaño de imagen: 5MB

## ✅ Checklist de Funcionalidades

- [x] Crear pedidos desde dashboard
- [x] Ver pedidos en tiempo real
- [x] Filtrar y buscar pedidos
- [x] Escanear QR en app móvil
- [x] Capturar foto con cámara
- [x] Subir foto a Firebase Storage
- [x] Marcar como entregado/no entregado
- [x] Ver evidencia fotográfica en dashboard
- [x] Compatible con iPhone y Android
- [x] Instalable como PWA

## 🐛 Solución de Problemas

### La cámara no funciona
- Asegúrate de estar usando HTTPS (Vercel lo proporciona automáticamente)
- Verifica los permisos de cámara en el navegador

### Las imágenes no se suben
- Verifica la conexión a internet
- Revisa las reglas de Firebase Storage
- Comprueba el tamaño de la imagen (max 5MB)

### El QR no escanea
- Asegúrate de tener buena iluminación
- Enfoca bien el código QR
- Usa la entrada manual como alternativa

### Los pedidos no aparecen en tiempo real
- Verifica la conexión a internet
- Revisa las reglas de Firestore
- Abre la consola del navegador para ver errores

## 📞 Soporte

Para problemas o preguntas, revisa:
1. La consola del navegador (F12)
2. Las reglas de Firebase
3. La configuración de Vercel

## 📄 Licencia

Este proyecto es un MVP privado para uso interno.

---

**Desarrollado con ❤️ para optimizar las entregas Flex**
