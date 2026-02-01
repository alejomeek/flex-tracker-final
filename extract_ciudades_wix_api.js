// Script para extraer ciudades desde Wix API
const WIX_API_KEY = 'TU_API_KEY_AQUI'; // Reemplazar con tu API key
const WIX_SITE_ID = 'TU_SITE_ID_AQUI'; // Reemplazar con tu site ID

async function extractCiudadesFromWix() {
    try {
        console.log('Extrayendo ciudades desde Wix API...\n');

        const headers = {
            'Authorization': WIX_API_KEY,
            'wix-site-id': WIX_SITE_ID,
            'Content-Type': 'application/json'
        };

        const url = "https://www.wixapis.com/ecom/v1/orders/search";

        const payload = {
            "search": {
                "cursorPaging": {
                    "limit": 50
                }
            }
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        const orders = data.orders || [];

        console.log(`✅ ${orders.length} pedidos obtenidos de Wix\n`);

        const ciudades = [];
        const ciudadesCount = {};

        orders.forEach(order => {
            const shipping = order.shippingInfo || {};
            const shippingDest = shipping.logistics?.shippingDestination || {};
            const address = shippingDest.address || {};
            const ciudad = address.city || 'Sin ciudad';

            ciudades.push({
                orderNumber: order.number,
                ciudad: ciudad,
                destinatario: `${order.billingInfo?.contactDetails?.firstName || ''} ${order.billingInfo?.contactDetails?.lastName || ''}`.trim()
            });

            ciudadesCount[ciudad] = (ciudadesCount[ciudad] || 0) + 1;
        });

        console.log('═══════════════════════════════════════════════════');
        console.log('📊 RESUMEN DE CIUDADES (desde Wix API)');
        console.log('═══════════════════════════════════════════════════\n');

        const sortedCiudades = Object.entries(ciudadesCount)
            .sort((a, b) => b[1] - a[1]);

        sortedCiudades.forEach(([ciudad, count]) => {
            const percentage = ((count / ciudades.length) * 100).toFixed(1);
            console.log(`${ciudad.padEnd(30)} ${count.toString().padStart(3)} pedidos (${percentage}%)`);
        });

        console.log('\n═══════════════════════════════════════════════════');
        console.log('📋 DETALLE DE PEDIDOS');
        console.log('═══════════════════════════════════════════════════\n');

        ciudades.forEach(pedido => {
            console.log(`WIX-${pedido.orderNumber} | ${pedido.ciudad} | ${pedido.destinatario}`);
        });

        console.log(`\n✅ Total: ${ciudades.length} pedidos analizados`);

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

extractCiudadesFromWix();
