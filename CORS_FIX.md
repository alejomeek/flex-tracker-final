# Solución al Error CORS de Firebase Storage

## Problema
Error: `Access to fetch at 'https://firebasestorage.googleapis.com/...' has been blocked by CORS policy`

## Causa
Firebase Storage requiere configuración CORS para permitir subidas desde tu dominio de Vercel.

## Solución: Configurar CORS en Firebase Storage

### Opción A: Usando Google Cloud Console (Más Fácil)

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Selecciona tu proyecto: **flex-tracker-ce54b**
3. En el menú lateral, ve a **Cloud Storage** → **Buckets**
4. Encuentra el bucket: **flex-tracker-ce54b.firebasestorage.app**
5. Click en los 3 puntos (⋮) del bucket → **Edit bucket permissions**
6. En la pestaña **CORS**, agrega esta configuración:

```json
[
  {
    "origin": ["*"],
    "method": ["GET", "POST", "PUT", "DELETE"],
    "maxAgeSeconds": 3600
  }
]
```

7. Guarda los cambios

### Opción B: Usando gsutil (Línea de comandos)

Si tienes Google Cloud SDK instalado:

```bash
# 1. Navega al directorio del proyecto
cd c:\Users\AlejandroSantos\Documents\mvp_flex_tracker

# 2. Aplica la configuración CORS
gsutil cors set cors.json gs://flex-tracker-ce54b.firebasestorage.app

# 3. Verifica la configuración
gsutil cors get gs://flex-tracker-ce54b.firebasestorage.app
```

### Opción C: Cambiar a usar el dominio estándar de Firebase

Si no puedes configurar CORS, modifica el código para usar el dominio estándar:

**En `mobile/app.js`**, cambia la línea 23:

```javascript
// ANTES:
storageBucket: "flex-tracker-ce54b.firebasestorage.app",

// DESPUÉS:
storageBucket: "flex-tracker-ce54b.appspot.com",
```

Luego redespliega en Vercel.

## Verificación

Después de aplicar la solución:

1. Limpia la caché del navegador
2. Recarga la aplicación móvil
3. Intenta subir una foto nuevamente
4. El error CORS debería desaparecer

## Configuración CORS Más Restrictiva (Producción)

Para producción, es mejor limitar los orígenes permitidos:

```json
[
  {
    "origin": ["https://flex-tracker-final.vercel.app"],
    "method": ["GET", "POST", "PUT"],
    "maxAgeSeconds": 3600
  }
]
```

## Notas Importantes

- ⚠️ El archivo `cors.json` ya está creado en tu proyecto
- ✅ La configuración `"origin": ["*"]` permite cualquier dominio (solo para desarrollo)
- 🔒 En producción, especifica solo tu dominio de Vercel
- 🔄 Los cambios CORS pueden tardar unos minutos en propagarse

## Si el problema persiste

1. Verifica que las reglas de Firebase Storage permitan escritura:
   - Ve a Firebase Console → Storage → Rules
   - Asegúrate que estén así:
   ```
   rules_version = '2';
   service firebase.storage {
     match /b/{bucket}/o {
       match /{allPaths=**} {
         allow read, write: if true;
       }
     }
   }
   ```

2. Verifica que el proyecto de Firebase esté en el plan Blaze (pago por uso) si usas dominios personalizados

3. Revisa la consola de Firebase para ver si hay límites de cuota excedidos
