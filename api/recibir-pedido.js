/**
 * Vercel Serverless Function: Recibir pedido desde OMS
 *
 * Crea un nuevo pedido en Firestore (colección pedidos_wix) a partir de
 * datos enviados por el OMS. Usa la Firebase REST API para no requerir
 * Firebase Admin SDK.
 *
 * Body esperado (POST):
 * {
 *   secret: string,          // debe coincidir con HALCON_WEBHOOK_SECRET
 *   pedido: {
 *     origen: 'wix' | 'mercadolibre',
 *     numero_envio: string,  // ej. "WIX-12345" o "ML-12345"
 *     numero_pedido_wix: string,
 *     destinatario: string,
 *     celular: string,
 *     direccion: string,
 *     ciudad: string,
 *   }
 * }
 */

const FIREBASE_API_KEY = 'AIzaSyD9sKuqivGZryt7Ol33WtUpsM5Q0eARNR4';
const PROJECT_ID = 'flex-tracker-ce54b';
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

export default async function handler(req, res) {
    // CORS para que el OMS (dominio externo) pueda llamar este endpoint
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { secret, pedido } = req.body || {};

    // Validar secret
    const expectedSecret = process.env.HALCON_WEBHOOK_SECRET;
    if (!expectedSecret || secret !== expectedSecret) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    // Validar campos mínimos
    if (!pedido || !pedido.origen || !pedido.numero_envio || !pedido.destinatario) {
        return res.status(400).json({ error: 'Campos requeridos: origen, numero_envio, destinatario' });
    }

    try {
        // 1. Incrementar contador atómicamente y obtener el nuevo numero_serial
        const commitUrl = `${BASE_URL}:commit?key=${FIREBASE_API_KEY}`;
        const commitBody = {
            writes: [{
                transform: {
                    document: `projects/${PROJECT_ID}/databases/(default)/documents/contadores/pedidos_flex_counter`,
                    fieldTransforms: [{
                        fieldPath: 'current_value',
                        increment: { integerValue: '1' },
                    }],
                },
            }],
        };

        const commitRes = await fetch(commitUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(commitBody),
        });

        if (!commitRes.ok) {
            const err = await commitRes.json();
            console.error('Error incrementando contador:', err);
            return res.status(500).json({ error: 'Error al generar numero_serial', details: err });
        }

        const commitData = await commitRes.json();
        const numeroSerial = parseInt(commitData.writeResults[0].transformResults[0].integerValue);

        // 2. Crear documento en pedidos_wix
        const createUrl = `${BASE_URL}/pedidos_wix?key=${FIREBASE_API_KEY}`;
        const document = {
            fields: {
                numero_serial:     { integerValue: numeroSerial.toString() },
                origen:            { stringValue: pedido.origen },
                numero_envio:      { stringValue: pedido.numero_envio },
                numero_pedido_wix: { stringValue: pedido.numero_pedido_wix || '' },
                destinatario:      { stringValue: pedido.destinatario },
                celular:           { stringValue: pedido.celular || '' },
                direccion:         { stringValue: pedido.direccion || '' },
                ciudad:            { stringValue: pedido.ciudad || '' },
                estado:            { stringValue: 'pendiente' },
                fecha_creacion:    { timestampValue: new Date().toISOString() },
                fecha_entrega:     { nullValue: 'NULL_VALUE' },
                repartidor_id:     { nullValue: 'NULL_VALUE' },
                repartidor_nombre: { nullValue: 'NULL_VALUE' },
                imagen_evidencia_url: { nullValue: 'NULL_VALUE' },
                recibido_por:      { nullValue: 'NULL_VALUE' },
                observaciones_wix: { stringValue: '' },
                pago_contraentrega: { booleanValue: false },
                monto_cobrar:      { integerValue: '0' },
            },
        };

        const createRes = await fetch(createUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(document),
        });

        if (!createRes.ok) {
            const err = await createRes.json();
            console.error('Error creando documento:', err);
            return res.status(500).json({ error: 'Error al crear pedido en Firestore', details: err });
        }

        const created = await createRes.json();
        return res.status(200).json({
            success: true,
            numero_serial: numeroSerial,
            document_name: created.name,
        });

    } catch (error) {
        console.error('Error en recibir-pedido:', error);
        return res.status(500).json({ error: error.message });
    }
}
