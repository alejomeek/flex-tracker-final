# FLEX TRACKER - MVP para Control de Entregas Mercado Libre Flex

## 🎯 OBJETIVO
Crear un sistema completo de dos aplicaciones web (Dashboard + PWA Móvil) para gestionar entregas de Mercado Libre Flex, permitiendo crear pedidos manualmente y que los repartidores escaneen QR, tomen fotos de evidencia y marquen como entregado.

## 📋 CONTEXTO DEL NEGOCIO
- Juguetería que vende por Mercado Libre
- Los pedidos "Flex" deben entregarse el mismo día
- Entregas tercerizadas con empresa pequeña (10-15 repartidores)
- Actualmente usan WhatsApp (muy desorganizado)
- Necesitan evidencia fotográfica de entregas
- Las etiquetas de Mercado Libre tienen QR con número de envío

## 🏗️ ARQUITECTURA TÉCNICA

### Stack:
- **Frontend**: HTML + CSS + JavaScript Vanilla (sin frameworks)
- **Backend**: Firebase (Firestore + Storage)
- **Hosting**: Vercel o cualquier hosting estático
- **QR Scanner**: Librería `html5-qrcode` (CDN)

### Firebase Config (YA CONFIGURADO):
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyD9sKuqivGZryt7Ol33WtUpsM5Q0eARNR4",
  authDomain: "flex-tracker-ce54b.firebaseapp.com",
  projectId: "flex-tracker-ce54b",
  storageBucket: "flex-tracker-ce54b.firebasestorage.app",
  messagingSenderId: "617822125610",
  appId: "1:617822125610:web:ce2265cef161b7c7e10d53"
};
```

## 📊 ESTRUCTURA DE DATOS EN FIRESTORE

### Colección: `pedidos_flex`
```javascript
{
  numero_envio: "46189809667",           // String - del QR de la etiqueta
  numero_venta: "2000014538504744",      // String - de Mercado Libre
  numero_serial: 132,                    // Number - numeración interna consecutiva
  destinatario: "Julian Martinez",       // String
  direccion: "Av. Carrera 70B #64b-24", // String
  distrito: "Normandía",                 // String (opcional)
  telefono: "3001234567",                // String (opcional)
  estado: "pendiente",                   // String: "pendiente" | "entregado" | "no_entregado"
  fecha_creacion: Timestamp,             // Firebase Timestamp
  fecha_entrega: Timestamp | null,       // Firebase Timestamp (null si no entregado)
  repartidor_id: "rep001" | null,        // String (null si no asignado)
  repartidor_nombre: "Juan Pérez" | null,// String (null si no asignado)
  imagen_evidencia_url: "https://..." | null // String - URL de Firebase Storage
}
```

### Lista de Repartidores (HARDCODEADA en el código - no en Firestore):
```javascript
const REPARTIDORES = [
  { id: 'rep001', nombre: 'Juan Pérez' },
  { id: 'rep002', nombre: 'María González' },
  { id: 'rep003', nombre: 'Carlos Rodríguez' },
  { id: 'rep004', nombre: 'Ana Martínez' },
  { id: 'rep005', nombre: 'Luis Ramírez' }
];
```

## 🖥️ APLICACIÓN 1: DASHBOARD WEB

### Ubicación: `/dashboard`

### Archivos:
- `index.html`
- `styles.css`
- `app.js`

### Funcionalidades Principales:

#### 1. Header:
- Título: "📦 Flex Tracker - Dashboard"
- Botón: "➕ Crear Nuevo Pedido" (abre modal)

#### 2. Estadísticas (4 cards):
- **Total**: Total de pedidos
- **Pendientes**: Estado "pendiente" (color amarillo)
- **Entregados**: Estado "entregado" (color verde)
- **No Entregados**: Estado "no_entregado" (color rojo)

#### 3. Filtros y Búsqueda:
- Input de búsqueda (busca en: número_envio, número_venta, destinatario, dirección, número_serial)
- Botones de filtro: "Todos" | "Pendientes" | "Entregados" | "No Entregados"

#### 4. Tabla de Pedidos:
Columnas:
- Serial (#)
- N° Envío
- N° Venta
- Destinatario
- Dirección
- Estado (badge con color)
- Repartidor
- Fecha Entrega
- Acciones (botón "Ver Foto" si tiene imagen)

**Comportamiento:**
- Actualización en tiempo real con `onSnapshot` de Firestore
- Click en "Ver Foto" abre modal con imagen grande
- Responsive (tabla se adapta a móvil)

#### 5. Modal: Crear Pedido
Form con campos:
- N° Envío* (required, texto)
- N° Venta* (required, texto)
- N° Serial* (required, número - auto-incrementa desde el último)
- Destinatario* (required, texto)
- Dirección* (required, texto)
- Distrito (opcional, texto)
- Teléfono (opcional, texto)

**Botones:**
- "Cancelar" (cierra modal)
- "Crear Pedido" (guarda en Firestore con estado "pendiente")

**Auto-incremento del Serial:**
- Al abrir el modal, buscar el último pedido en Firestore
- Tomar el `numero_serial` más alto y sumar 1
- Mostrar en el campo (editable por si quiere cambiarlo)

#### 6. Modal: Ver Imagen
- Imagen grande
- Información del pedido (destinatario, repartidor, fecha)
- Botón cerrar (X)

### Diseño:
- Colores: Azul primario (#3b82f6), Verde (#10b981), Amarillo (#f59e0b), Rojo (#ef4444)
- Diseño limpio, profesional
- Sombras suaves
- Border-radius redondeados
- Mobile-first responsive

## 📱 APLICACIÓN 2: PWA MÓVIL PARA REPARTIDORES

### Ubicación: `/mobile`

### Archivos:
- `index.html`
- `styles.css`
- `app.js`
- `manifest.json` (para PWA)
- `sw.js` (Service Worker básico)

### Pantallas:

#### PANTALLA 1: Login/Selección
- Logo/Título: "📦 Flex Tracker"
- Dropdown: Seleccionar repartidor (de la lista REPARTIDORES)
- Botón: "Iniciar Sesión" (guarda en localStorage)

#### PANTALLA 2: Scanner Principal
**Header:**
- Saludo: "Hola, [Nombre Repartidor]"
- Botón logout (🚪)
- Mini-stats: Pendientes hoy | Entregados hoy

**Contenido:**
- Botón grande: "📷 Escanear Pedido" (activa scanner QR)
- Cuando escanea/busca manual: Container del scanner (html5-qrcode)
- Overlay con marco para guiar el QR
- Texto: "Enfoca el código QR de la etiqueta"

**Input Manual (alternativo):**
- Texto: "O ingresa el número manualmente:"
- Input numérico
- Botón: "Buscar"

#### PANTALLA 3: Pedido Encontrado
**Card del Pedido:**
- Header: Serial # grande | Badge de estado
- Info rows:
  - N° Envío
  - N° Venta
  - Destinatario
  - Dirección
  
**Sección de Foto:**
- Botón: "📸 Tomar Foto de Evidencia"
- Preview de la foto capturada
- Botón: "🔄 Tomar otra foto" (si ya capturó)

**Acciones:**
- Botón verde grande: "✅ Marcar como Entregado" (solo visible después de tomar foto)
- Botón rojo pequeño: "❌ No se pudo entregar" (sin foto requerida)

**Comportamiento:**
- Al marcar entregado: sube foto a Storage, actualiza Firestore
- Al marcar no entregado: solo actualiza Firestore (sin foto)

#### PANTALLA 4: Confirmación
- Ícono grande: ✅
- Texto: "¡Pedido Entregado!"
- Info: "El pedido #[serial] ha sido marcado como entregado"
- Botón: "Escanear Otro Pedido" (vuelve a pantalla 2)

### Features PWA:
- Instalable en home screen
- Manifest.json con nombre, iconos, colores
- Service Worker para cache básico
- Funciona offline (solo para UI, no para Firestore)

### Diseño Móvil:
- Header azul (#3b82f6) con texto blanco
- Botones grandes (fácil de presionar)
- Safe area para notch de iPhone
- Landscape responsive
- Animaciones suaves (scale en botones)

## 🔄 FLUJO COMPLETO DE USO

### Dashboard:
1. Abrir dashboard
2. Click "Crear Nuevo Pedido"
3. Llenar form (serial auto-incrementa)
4. Guardar → aparece en tabla con estado "Pendiente"
5. Ver en tiempo real cuando repartidor entrega

### Mobile:
1. Repartidor abre app
2. Selecciona su nombre
3. Click "Escanear Pedido"
4. Escanea QR de etiqueta (o ingresa manual)
5. Ve datos del pedido
6. Toma foto de la puerta/evidencia
7. Click "Marcar como Entregado"
8. Ve confirmación
9. Repite con siguiente pedido

## 🎨 CONSIDERACIONES DE DISEÑO

### Dashboard:
- Desktop-first pero responsive
- Tabla con scroll horizontal en móvil
- Modales centrados
- Loading states cuando carga datos
- Empty state cuando no hay pedidos

### Mobile:
- Mobile-first
- Botones mínimo 44px de altura
- Texto grande y legible
- Contraste alto
- Touch-friendly
- Preview de foto antes de confirmar

## 📦 ESTRUCTURA DE CARPETAS FINAL

```
flex-tracker/
├── dashboard/
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── mobile/
│   ├── index.html
│   ├── styles.css
│   ├── app.js
│   ├── manifest.json
│   └── sw.js
└── README.md
```

## 🔧 CONFIGURACIÓN FIREBASE

### Firestore Rules (ya configuradas):
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

### Storage Rules (ya configuradas):
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if true;
    }
  }
}
```

## ⚠️ DETALLES CRÍTICOS A IMPLEMENTAR

### Firebase SDK:
- Usar versión 10.7.1 o superior
- Importar módulos desde CDN:
```javascript
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore, ... } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getStorage, ... } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';
```

### QR Scanner:
- Usar: `https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js`
- Config: `{ fps: 10, qrbox: { width: 250, height: 250 } }`
- Camera: `{ facingMode: "environment" }` (cámara trasera)

### Storage:
- Path para evidencias: `evidencias/{pedidoId}_{timestamp}.jpg`
- Comprimir imágenes antes de subir (max 1MB)

### Estados y Timestamps:
- `fecha_creacion`: usar `Timestamp.now()` al crear
- `fecha_entrega`: usar `Timestamp.now()` al entregar
- Estado inicial siempre "pendiente"

### Validaciones:
- No permitir crear pedido sin los campos requeridos
- No permitir marcar entregado sin foto
- Validar que el QR/número manual exista antes de mostrar pedido
- Mostrar mensaje si pedido ya fue entregado

## 📝 NOTAS ADICIONALES

1. **Sin autenticación real**: Por ahora es solo selección de nombre (localStorage)
2. **No hay backend adicional**: Todo es Firestore directo
3. **Sin modo offline completo**: Solo cache de UI, no de datos
4. **Sin notificaciones push**: Para MVP no son necesarias
5. **Serial manual**: El usuario puede editarlo si quiere saltar números

## ✅ CRITERIOS DE ÉXITO DEL MVP

- [ ] Poder crear pedidos desde el dashboard
- [ ] Ver pedidos en tiempo real en tabla
- [ ] Filtrar y buscar pedidos
- [ ] Escanear QR en la app móvil
- [ ] Capturar foto con cámara del celular
- [ ] Subir foto a Firebase Storage
- [ ] Marcar como entregado/no entregado
- [ ] Ver evidencia fotográfica en dashboard
- [ ] Funciona en iPhone y Android
- [ ] Se puede instalar como PWA

## 🚀 INSTRUCCIONES PARA EL AGENTE

Por favor, genera TODOS los archivos necesarios con código completo y funcional:

1. Crea la estructura de carpetas exacta
2. Implementa TODAS las funcionalidades descritas
3. Usa el firebaseConfig proporcionado
4. Asegúrate que el código sea limpio y comentado
5. Hazlo responsive y mobile-first
6. Incluye manejo de errores básico
7. Agrega loading states
8. CSS profesional con los colores especificados

**IMPORTANTE**: No uses placeholders ni TODOs. Todo el código debe estar completo y listo para desplegar.
