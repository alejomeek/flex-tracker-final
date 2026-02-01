const admin = require('firebase-admin');

// Inicializar Firebase Admin (usa las credenciales del proyecto)
admin.initializeApp({
    projectId: 'flex-tracker-ce54b'
});

const db = admin.firestore();

async function extractCiudades() {
    try {
        console.log('Extrayendo ciudades de los últimos 50 pedidos Wix...\n');

        const snapshot = await db.collection('pedidos_wix')
            .orderBy('numero_serial', 'desc')
            .limit(50)
            .get();

        const ciudades = [];
        const ciudadesCount = {};

        snapshot.forEach(doc => {
            const data = doc.data();
            const ciudad = data.ciudad || 'Sin ciudad';
            ciudades.push({
                serial: data.numero_serial,
                pedido: data.numero_pedido_wix,
                ciudad: ciudad,
                destinatario: data.destinatario
            });

            // Contar ciudades
            ciudadesCount[ciudad] = (ciudadesCount[ciudad] || 0) + 1;
        });

        console.log('═══════════════════════════════════════════════════');
        console.log('📊 RESUMEN DE CIUDADES');
        console.log('═══════════════════════════════════════════════════\n');

        // Ordenar por cantidad
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
            console.log(`#${pedido.serial} | WIX-${pedido.pedido} | ${pedido.ciudad} | ${pedido.destinatario}`);
        });

        console.log(`\n✅ Total: ${ciudades.length} pedidos analizados`);

        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

extractCiudades();
