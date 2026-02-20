/**
 * Vercel Serverless Function: Recibir pedido desde OMS
 *
 * Routing por origen:
 *   - origen 'wix'          → colección pedidos_wix  (tab Wix del dashboard)
 *   - origen 'mercadolibre' → colección pedidos_flex (tab Flex del dashboard)
 *
 * Body esperado (POST):
 * {
 *   secret: string,
 *   pedido: {
 *     origen: 'wix' | 'mercadolibre',
 *     numero_envio: string,   // Wix: "WIX-XXXX" | ML: shipping_id (ej. "46503424246")
 *     numero_pedido_wix: string, // Wix: order_id | ML: order_id (numero_venta)
 *     destinatario: string,
 *     celular: string,
 *     direccion: string,
 *     ciudad: string,         // usado como distrito en Flex
 *   }
 * }
 */

const FIREBASE_API_KEY = 'AIzaSyD9sKuqivGZryt7Ol33WtUpsM5Q0eARNR4';
const PROJECT_ID = 'flex-tracker-ce54b';
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { secret, pedido } = req.body || {};

    const expectedSecret = process.env.HALCON_WEBHOOK_SECRET;
    if (!expectedSecret || secret !== expectedSecret) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!pedido || !pedido.origen || !pedido.numero_envio || !pedido.destinatario) {
        return res.status(400).json({ error: 'Campos requeridos: origen, numero_envio, destinatario' });
    }

    try {
        // 1. Verificar duplicado: buscar numero_envio en pedidos_wix y pedidos_flex
        const queryUrl = `${BASE_URL}:runQuery?key=${FIREBASE_API_KEY}`;
        const duplicateFilter = {
            structuredQuery: {
                where: {
                    fieldFilter: {
                        field: { fieldPath: 'numero_envio' },
                        op: 'EQUAL',
                        value: { stringValue: pedido.numero_envio },
                    },
                },
                limit: 1,
            },
        };

        for (const col of ['pedidos_wix', 'pedidos_flex']) {
            const dupRes = await fetch(queryUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...duplicateFilter,
                    structuredQuery: {
                        ...duplicateFilter.structuredQuery,
                        from: [{ collectionId: col }],
                    },
                }),
            });
            if (dupRes.ok) {
                const dupData = await dupRes.json();
                // runQuery returns array; first element has 'document' if found
                if (dupData[0]?.document) {
                    const existingSerial = dupData[0].document.fields?.numero_serial?.integerValue;
                    return res.status(409).json({
                        error: `Pedido ya existe en Halcon con serial #${existingSerial}`,
                        numero_serial: existingSerial ? parseInt(existingSerial) : null,
                        already_exists: true,
                    });
                }
            }
        }

        // 2. Incrementar contador atómicamente
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
            return res.status(500).json({ error: 'Error al generar numero_serial', details: err });
        }

        const commitData = await commitRes.json();
        const numeroSerial = parseInt(commitData.writeResults[0].transformResults[0].integerValue);

        // 2. Construir documento según origen
        let coleccion, document;

        if (pedido.origen === 'wix') {
            // → pedidos_wix (aparece en tab Wix)
            coleccion = 'pedidos_wix';
            document = {
                fields: {
                    numero_serial:        { integerValue: numeroSerial.toString() },
                    origen:               { stringValue: 'wix' },
                    numero_envio:         { stringValue: pedido.numero_envio },
                    numero_pedido_wix:    { stringValue: pedido.numero_pedido_wix || '' },
                    destinatario:         { stringValue: pedido.destinatario },
                    celular:              { stringValue: pedido.celular || '' },
                    direccion:            { stringValue: pedido.direccion || '' },
                    ciudad:               { stringValue: pedido.ciudad || '' },
                    estado:               { stringValue: 'pendiente' },
                    fecha_creacion:       { timestampValue: new Date().toISOString() },
                    fecha_entrega:        { nullValue: 'NULL_VALUE' },
                    repartidor_id:        { nullValue: 'NULL_VALUE' },
                    repartidor_nombre:    { nullValue: 'NULL_VALUE' },
                    imagen_evidencia_url: { nullValue: 'NULL_VALUE' },
                    recibido_por:         { nullValue: 'NULL_VALUE' },
                    observaciones_wix:    { stringValue: '' },
                    pago_contraentrega:   { booleanValue: false },
                    monto_cobrar:         { integerValue: '0' },
                },
            };
        } else {
            // origen === 'mercadolibre' → pedidos_flex (aparece en tab Flex)
            coleccion = 'pedidos_flex';
            document = {
                fields: {
                    numero_serial:        { integerValue: numeroSerial.toString() },
                    // Sin campo 'origen' → defaults a 'flex' en el dashboard
                    numero_envio:         { stringValue: pedido.numero_envio },   // shipping_id de ML
                    numero_venta:         { stringValue: pedido.numero_pedido_wix || '' }, // order_id de ML
                    destinatario:         { stringValue: pedido.destinatario },
                    telefono:             { stringValue: pedido.celular || '' },
                    direccion:            { stringValue: pedido.direccion || '' },
                    referencia:           { stringValue: pedido.referencia || '' },
                    distrito:             { stringValue: pedido.ciudad || '' },
                    estado:               { stringValue: 'pendiente' },
                    fecha_creacion:       { timestampValue: new Date().toISOString() },
                    fecha_entrega:        { nullValue: 'NULL_VALUE' },
                    repartidor_id:        { nullValue: 'NULL_VALUE' },
                    repartidor_nombre:    { nullValue: 'NULL_VALUE' },
                    imagen_evidencia_url: { nullValue: 'NULL_VALUE' },
                    recibido_por:         { nullValue: 'NULL_VALUE' },
                },
            };
        }

        // 3. Crear documento en la colección correcta
        const createUrl = `${BASE_URL}/${coleccion}?key=${FIREBASE_API_KEY}`;
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
            coleccion,
            document_name: created.name,
        });

    } catch (error) {
        console.error('Error en recibir-pedido:', error);
        return res.status(500).json({ error: error.message });
    }
}
