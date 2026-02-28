// Firebase imports
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import {
    getFirestore,
    collection,
    query,
    where,
    getDocs,
    doc,
    updateDoc,
    Timestamp,
    onSnapshot
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import {
    getStorage,
    ref,
    uploadBytes,
    getDownloadURL
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyD9sKuqivGZryt7Ol33WtUpsM5Q0eARNR4",
    authDomain: "flex-tracker-ce54b.firebaseapp.com",
    projectId: "flex-tracker-ce54b",
    storageBucket: "flex-tracker-ce54b.firebasestorage.app",
    messagingSenderId: "617822125610",
    appId: "1:617822125610:web:ce2265cef161b7c7e10d53"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

// Repartidores list (hardcoded)
const REPARTIDORES = [
    { id: 'rep001', nombre: 'SANCHEZ' }
];

// Global state
let currentRepartidor = null;
let currentPedido = null;
let capturedPhoto = null;
let html5QrCode = null;
let flashlightOn = false;

// DOM elements
const screenLogin = document.getElementById('screenLogin');
const screenScanner = document.getElementById('screenScanner');
const screenPedido = document.getElementById('screenPedido');
const screenConfirmation = document.getElementById('screenConfirmation');

const selectRepartidor = document.getElementById('selectRepartidor');
const btnLogin = document.getElementById('btnLogin');
const btnLogout = document.getElementById('btnLogout');
const greetingText = document.getElementById('greetingText');
const statPendingToday = document.getElementById('statPendingToday');
const statDeliveredToday = document.getElementById('statDeliveredToday');

const btnStartScan = document.getElementById('btnStartScan');
const btnCloseScanner = document.getElementById('btnCloseScanner');
const scannerContainer = document.getElementById('scannerContainer');
const inputManualNumber = document.getElementById('inputManualNumber');
const btnManualSearch = document.getElementById('btnManualSearch');

const btnBackToScanner = document.getElementById('btnBackToScanner');
const btnTakePhoto = document.getElementById('btnTakePhoto');
const btnRetakePhoto = document.getElementById('btnRetakePhoto');
const inputPhoto = document.getElementById('inputPhoto');
const photoPreview = document.getElementById('photoPreview');
const photoImage = document.getElementById('photoImage');
const receiverSection = document.getElementById('receiverSection');
const inputReceiverName = document.getElementById('inputReceiverName');
const btnMarkDelivered = document.getElementById('btnMarkDelivered');
const btnMarkNotDelivered = document.getElementById('btnMarkNotDelivered');
const loadingOverlay = document.getElementById('loadingOverlay');

const btnScanAnother = document.getElementById('btnScanAnother');
const confirmationMessage = document.getElementById('confirmationMessage');

// Initialize app
function init() {
    // Populate repartidores dropdown
    REPARTIDORES.forEach(rep => {
        const option = document.createElement('option');
        option.value = rep.id;
        option.textContent = rep.nombre;
        selectRepartidor.appendChild(option);
    });

    // Check if already logged in
    const savedRepartidor = localStorage.getItem('repartidor');
    if (savedRepartidor) {
        currentRepartidor = JSON.parse(savedRepartidor);
        showScreen('scanner');
        updateGreeting();
        listenToStats();
    }

    // Event listeners
    selectRepartidor.addEventListener('change', () => {
        btnLogin.disabled = !selectRepartidor.value;
    });

    btnLogin.addEventListener('click', handleLogin);
    btnLogout.addEventListener('click', handleLogout);
    btnStartScan.addEventListener('click', startScanner);
    btnCloseScanner.addEventListener('click', stopScanner);
    document.getElementById('btnFlashlight').addEventListener('click', toggleFlashlight);
    btnManualSearch.addEventListener('click', handleManualSearch);
    btnBackToScanner.addEventListener('click', () => {
        resetPedidoScreen();
        showScreen('scanner');
    });
    btnTakePhoto.addEventListener('click', () => inputPhoto.click());
    btnRetakePhoto.addEventListener('click', () => inputPhoto.click());
    inputPhoto.addEventListener('change', handlePhotoCapture);
    btnMarkDelivered.addEventListener('click', handleMarkDelivered);
    btnMarkNotDelivered.addEventListener('click', handleMarkNotDelivered);
    btnScanAnother.addEventListener('click', () => showScreen('scanner'));

    // Register service worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').catch(err => {
            console.log('Service Worker registration failed:', err);
        });
    }
}

// Handle login
function handleLogin() {
    const selectedId = selectRepartidor.value;
    const repartidor = REPARTIDORES.find(r => r.id === selectedId);

    if (repartidor) {
        currentRepartidor = repartidor;
        localStorage.setItem('repartidor', JSON.stringify(repartidor));
        showScreen('scanner');
        updateGreeting();
        listenToStats();
    }
}

// Handle logout
function handleLogout() {
    if (confirm('¿Estás seguro de cerrar sesión?')) {
        currentRepartidor = null;
        localStorage.removeItem('repartidor');
        stopScanner();
        showScreen('login');
    }
}

// Update greeting
function updateGreeting() {
    if (currentRepartidor) {
        greetingText.textContent = `Hola, ${currentRepartidor.nombre}`;
    }
}

// Listen to stats
function listenToStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let flexOrders = [];
    let wixOrders = [];
    let tiendaOrders = [];

    // Listen to pedidos_flex
    const qFlex = query(collection(db, 'pedidos_flex'));
    onSnapshot(qFlex, (snapshot) => {
        flexOrders = snapshot.docs.map(doc => doc.data());
        updateStats();
    });

    // Listen to pedidos_wix
    const qWix = query(collection(db, 'pedidos_wix'));
    onSnapshot(qWix, (snapshot) => {
        wixOrders = snapshot.docs.map(doc => doc.data());
        updateStats();
    });

    // Listen to pedidos_tienda
    const qTienda = query(collection(db, 'pedidos_tienda'));
    onSnapshot(qTienda, (snapshot) => {
        tiendaOrders = snapshot.docs.map(doc => doc.data());
        updateStats();
    });

    function updateStats() {
        const allOrders = [...flexOrders, ...wixOrders, ...tiendaOrders];

        const pending = allOrders.filter(o => o.estado === 'pendiente').length;
        const deliveredToday = allOrders.filter(o => {
            if (o.estado === 'entregado' && o.fecha_entrega) {
                const deliveryDate = o.fecha_entrega.toDate();
                return deliveryDate >= today;
            }
            return false;
        }).length;

        statPendingToday.textContent = pending;
        statDeliveredToday.textContent = deliveredToday;
    }
}

// Show screen
function showScreen(screenName) {
    screenLogin.classList.remove('active');
    screenScanner.classList.remove('active');
    screenPedido.classList.remove('active');
    screenConfirmation.classList.remove('active');

    switch (screenName) {
        case 'login':
            screenLogin.classList.add('active');
            break;
        case 'scanner':
            screenScanner.classList.add('active');
            break;
        case 'pedido':
            screenPedido.classList.add('active');
            break;
        case 'confirmation':
            screenConfirmation.classList.add('active');
            break;
    }
}

// Start QR scanner
function startScanner() {
    scannerContainer.style.display = 'block';
    btnStartScan.style.display = 'none';

    html5QrCode = new Html5Qrcode("qrReader");

    const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        // Request torch/flashlight capability
        advanced: [{ torch: true }]
    };

    html5QrCode.start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
            stopScanner();
            searchPedido(decodedText);
        },
        (errorMessage) => {
            // Ignore scan errors (happens continuously while scanning)
        }
    ).then(() => {
        // Try to enable flashlight automatically after scanner starts
        const capabilities = html5QrCode.getRunningTrackCapabilities();
        if (capabilities && capabilities.torch) {
            // Show flashlight button
            const btnFlashlight = document.getElementById('btnFlashlight');
            btnFlashlight.style.display = 'block';

            // Auto-enable flashlight for night scanning
            setTimeout(() => {
                try {
                    html5QrCode.applyVideoConstraints({
                        advanced: [{ torch: true }]
                    });
                    flashlightOn = true;
                    updateFlashlightIcon();
                } catch (err) {
                    console.log('Torch not available:', err);
                }
            }, 500);
        }
    }).catch(err => {
        console.error('Error starting scanner:', err);
        showNotification('Error al iniciar la cámara', 'error');
        stopScanner();
    });
}

// Stop QR scanner
function stopScanner() {
    if (html5QrCode) {
        html5QrCode.stop().then(() => {
            html5QrCode.clear();
            html5QrCode = null;
        }).catch(err => {
            console.error('Error stopping scanner:', err);
        });
    }

    scannerContainer.style.display = 'none';
    btnStartScan.style.display = 'block';

    // Hide and reset flashlight button
    const btnFlashlight = document.getElementById('btnFlashlight');
    btnFlashlight.style.display = 'none';
    flashlightOn = false;
}

// Toggle flashlight
function toggleFlashlight() {
    if (!html5QrCode) return;

    try {
        html5QrCode.applyVideoConstraints({
            advanced: [{ torch: !flashlightOn }]
        });
        flashlightOn = !flashlightOn;
        updateFlashlightIcon();
    } catch (err) {
        console.error('Error toggling flashlight:', err);
        showNotification('Error al cambiar linterna', 'error');
    }
}

// Update flashlight icon
function updateFlashlightIcon() {
    const flashIcon = document.getElementById('flashIcon');
    if (flashIcon) {
        flashIcon.textContent = flashlightOn ? '🔦' : '💡';
    }
}

// Handle manual search
function handleManualSearch() {
    const number = inputManualNumber.value.trim();
    if (number) {
        searchPedido(number);
        inputManualNumber.value = '';
    }
}

// Extract shipment number from QR code text
function extractShipmentNumber(qrText) {
    // Log the raw QR text for debugging
    console.log('QR Code escaneado:', qrText);

    // Try to extract number from URL patterns
    // Example: https://www.mercadolibre.com.co/...?shipment=46189809667
    const urlMatch = qrText.match(/shipment[=:](\d+)/i);
    if (urlMatch) {
        console.log('Número extraído de URL:', urlMatch[1]);
        return urlMatch[1];
    }

    // Try to extract from tracking URL pattern
    // Example: https://mercadolibre.com/tracking/46189809667
    const trackingMatch = qrText.match(/tracking[\/:](\d+)/i);
    if (trackingMatch) {
        console.log('Número extraído de tracking:', trackingMatch[1]);
        return trackingMatch[1];
    }

    // Try to find any sequence of 10-12 digits (typical shipment number length)
    const digitMatch = qrText.match(/\d{10,12}/);
    if (digitMatch) {
        console.log('Número extraído (secuencia de dígitos):', digitMatch[0]);
        return digitMatch[0];
    }

    // If no pattern matches, return the original text trimmed
    console.log('Usando texto original:', qrText.trim());
    return qrText.trim();
}

// Search pedido in both collections
async function searchPedido(scannedText) {
    try {
        // Extract the shipment number from the scanned text
        const numeroEnvio = extractShipmentNumber(scannedText);

        console.log('Buscando pedido con número:', numeroEnvio);

        // First, try to search in pedidos_flex by numero_envio
        const qFlex = query(
            collection(db, 'pedidos_flex'),
            where('numero_envio', '==', numeroEnvio)
        );

        const flexSnapshot = await getDocs(qFlex);

        if (!flexSnapshot.empty) {
            // Found in pedidos_flex
            const pedidoDoc = flexSnapshot.docs[0];
            currentPedido = {
                id: pedidoDoc.id,
                coleccion: 'pedidos_flex',
                ...pedidoDoc.data()
            };

            console.log('Pedido Flex encontrado:', currentPedido);

            // Check if already delivered
            if (currentPedido.estado === 'entregado') {
                showNotification('Este pedido ya fue entregado', 'warning');
                return;
            }

            showPedidoDetails();
            showScreen('pedido');
            return;
        }

        // If not found in Flex, try pedidos_wix by numero_pedido_wix
        const qWix = query(
            collection(db, 'pedidos_wix'),
            where('numero_pedido_wix', '==', numeroEnvio)
        );

        const wixSnapshot = await getDocs(qWix);

        if (!wixSnapshot.empty) {
            // Found in pedidos_wix
            const pedidoDoc = wixSnapshot.docs[0];
            currentPedido = {
                id: pedidoDoc.id,
                coleccion: 'pedidos_wix',
                ...pedidoDoc.data()
            };

            console.log('Pedido Wix encontrado:', currentPedido);

            // Check if already delivered
            if (currentPedido.estado === 'entregado') {
                showNotification('Este pedido ya fue entregado', 'warning');
                return;
            }



            showPedidoDetails();
            showScreen('pedido');
            return;
        }

        // If not found in Wix, try pedidos_tienda by numero_envio
        const qTienda = query(
            collection(db, 'pedidos_tienda'),
            where('numero_envio', '==', numeroEnvio)
        );

        const tiendaSnapshot = await getDocs(qTienda);

        if (!tiendaSnapshot.empty) {
            // Found in pedidos_tienda
            const pedidoDoc = tiendaSnapshot.docs[0];
            currentPedido = {
                id: pedidoDoc.id,
                coleccion: 'pedidos_tienda',
                ...pedidoDoc.data()
            };

            console.log('Pedido Tienda encontrado:', currentPedido);

            // Check if already delivered
            if (currentPedido.estado === 'entregado') {
                showNotification('Este pedido ya fue entregado', 'warning');
                return;
            }



            showPedidoDetails();
            showScreen('pedido');
            return;
        }

        // Not found in any collection
        showNotification(`Pedido no encontrado: ${numeroEnvio}`, 'error');
        console.log('No se encontró pedido con número:', numeroEnvio);

    } catch (error) {
        console.error('Error searching pedido:', error);
        showNotification('Error al buscar el pedido', 'error');
    }
}

// Show pedido details
function showPedidoDetails() {
    document.getElementById('pedidoSerial').textContent = `#${currentPedido.numero_serial}`;
    document.getElementById('pedidoNumeroEnvio').textContent = currentPedido.numero_envio;
    document.getElementById('pedidoNumeroVenta').textContent = currentPedido.numero_venta;
    document.getElementById('pedidoDestinatario').textContent = currentPedido.destinatario;
    document.getElementById('pedidoDireccion').textContent =
        currentPedido.direccion + (currentPedido.distrito ? ` (${currentPedido.distrito})` : '');

    // Show phone if available
    if (currentPedido.telefono) {
        document.getElementById('pedidoTelefonoRow').style.display = 'flex';
        document.getElementById('pedidoTelefono').textContent = currentPedido.telefono;
    } else {
        document.getElementById('pedidoTelefonoRow').style.display = 'none';
    }

    // Show COD banner if applicable
    const codBanner = document.getElementById('codBanner');
    if (currentPedido.pago_contraentrega) {
        const codAmount = document.getElementById('codAmount');
        codAmount.textContent = `💵 COBRAR: $${currentPedido.monto_cobrar.toLocaleString()}`;
        codBanner.style.display = 'block';
    } else {
        codBanner.style.display = 'none';
    }

    // Set status badge
    const statusElement = document.getElementById('pedidoStatus');
    statusElement.textContent = currentPedido.estado;
    statusElement.className = `pedido-status status-${currentPedido.estado}`;
}

// Handle photo capture
function handlePhotoCapture(e) {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
        showNotification('Por favor selecciona una imagen', 'error');
        return;
    }

    // Validate file size (max 20MB)
    if (file.size > 20 * 1024 * 1024) {
        showNotification('La imagen es muy grande (máx 20MB)', 'error');
        return;
    }

    capturedPhoto = file;

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
        photoImage.src = e.target.result;
        photoPreview.style.display = 'block';
        btnTakePhoto.style.display = 'none';
        receiverSection.style.display = 'block';

        // Enable button only when receiver name is filled
        inputReceiverName.addEventListener('input', checkReceiverName);
        checkReceiverName();
    };
    reader.readAsDataURL(file);
}

// Check if receiver name is filled to enable button
function checkReceiverName() {
    const receiverName = inputReceiverName.value.trim();
    if (receiverName) {
        btnMarkDelivered.style.display = 'block';
    } else {
        btnMarkDelivered.style.display = 'none';
    }
}

// Reset pedido screen
function resetPedidoScreen() {
    currentPedido = null;
    capturedPhoto = null;
    photoPreview.style.display = 'none';
    btnTakePhoto.style.display = 'block';
    btnMarkDelivered.style.display = 'none';
    receiverSection.style.display = 'none';
    inputPhoto.value = '';
    inputReceiverName.value = '';
}

// Handle mark as delivered
async function handleMarkDelivered() {
    if (!capturedPhoto) {
        showNotification('Debes tomar una foto primero', 'error');
        return;
    }

    const receiverName = inputReceiverName.value.trim();
    if (!receiverName) {
        showNotification('Debes escribir quién recibió el pedido', 'error');
        return;
    }

    loadingOverlay.style.display = 'flex';

    try {
        // Compress and upload image
        const compressedImage = await compressImage(capturedPhoto);
        const timestamp = Date.now();
        const fileName = `evidencias/${currentPedido.id}_${timestamp}.jpg`;
        const storageRef = ref(storage, fileName);

        const metadata = { contentType: 'image/jpeg' };
        await uploadBytes(storageRef, compressedImage, metadata);
        const imageUrl = await getDownloadURL(storageRef);

        // Update pedido in Firestore (correct collection)
        const pedidoRef = doc(db, currentPedido.coleccion, currentPedido.id);
        await updateDoc(pedidoRef, {
            estado: 'entregado',
            fecha_entrega: Timestamp.now(),
            repartidor_id: currentRepartidor.id,
            repartidor_nombre: currentRepartidor.nombre,
            imagen_evidencia_url: imageUrl,
            recibido_por: receiverName
        });

        // Notificar al OMS (fire & forget — no bloquea la entrega)
        fetch('https://oms-jugando-educando.vercel.app/api/sync-halcon-status')
            .catch(() => { });

        // Show confirmation
        confirmationMessage.textContent =
            `El pedido #${currentPedido.numero_serial} ha sido marcado como entregado`;

        resetPedidoScreen();
        showScreen('confirmation');
    } catch (error) {
        console.error('Error marking as delivered:', error);
        showNotification('Error al marcar como entregado', 'error');
    } finally {
        loadingOverlay.style.display = 'none';
    }
}

// Handle mark as not delivered
async function handleMarkNotDelivered() {
    if (!confirm('¿Estás seguro de marcar este pedido como NO entregado?')) {
        return;
    }

    loadingOverlay.style.display = 'flex';

    try {
        const pedidoRef = doc(db, currentPedido.coleccion, currentPedido.id);
        await updateDoc(pedidoRef, {
            estado: 'no_entregado',
            fecha_entrega: Timestamp.now(),
            repartidor_id: currentRepartidor.id,
            repartidor_nombre: currentRepartidor.nombre
        });

        confirmationMessage.textContent =
            `El pedido #${currentPedido.numero_serial} ha sido marcado como NO entregado`;

        resetPedidoScreen();
        showScreen('confirmation');
    } catch (error) {
        console.error('Error marking as not delivered:', error);
        showNotification('Error al actualizar el pedido', 'error');
    } finally {
        loadingOverlay.style.display = 'none';
    }
}

// Compress image
async function compressImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                // Calculate new dimensions (max 1200px)
                let width = img.width;
                let height = img.height;
                const maxSize = 1200;

                if (width > height && width > maxSize) {
                    height = (height * maxSize) / width;
                    width = maxSize;
                } else if (height > maxSize) {
                    width = (width * maxSize) / height;
                    height = maxSize;
                }

                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    resolve(blob);
                }, 'image/jpeg', 0.8);
            };
            img.onerror = reject;
        };
        reader.onerror = reject;
    });
}

// Show notification
function showNotification(message, type) {
    const colors = {
        success: '#10b981',
        error: '#ef4444',
        warning: '#f59e0b'
    };

    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        padding: 1rem 1.5rem;
        background-color: ${colors[type] || colors.success};
        color: white;
        border-radius: 0.5rem;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        z-index: 10000;
        max-width: 90%;
        text-align: center;
        animation: slideDown 0.3s ease-out;
    `;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideUp 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Add animation styles
const style = document.createElement('style');
style.textContent = `
    @keyframes slideDown {
        from {
            opacity: 0;
            transform: translateX(-50%) translateY(-100%);
        }
        to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
        }
    }
    @keyframes slideUp {
        from {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
        }
        to {
            opacity: 0;
            transform: translateX(-50%) translateY(-100%);
        }
    }
`;
document.head.appendChild(style);

// Initialize app when DOM is ready
init();
