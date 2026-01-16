// Firebase imports
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import {
    getFirestore,
    collection,
    addDoc,
    onSnapshot,
    query,
    orderBy,
    Timestamp,
    doc,
    runTransaction,
    setDoc,
    updateDoc
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// PDF Parser import
import { extractDataFromPDF } from './pdf-parser.js';

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

// Global state
let allOrders = [];
let currentFilter = 'flex'; // Default: show only Flex orders
let searchTerm = '';
let selectedDate = getTodayDateString(); // Default: today

// DOM elements
const btnCreateOrder = document.getElementById('btnCreateOrder');
const btnCloseCreateModal = document.getElementById('btnCloseCreateModal');
const btnCancelCreate = document.getElementById('btnCancelCreate');
const btnCloseImageModal = document.getElementById('btnCloseImageModal');
const modalCreateOrder = document.getElementById('modalCreateOrder');
const modalViewImage = document.getElementById('modalViewImage');
const formCreateOrder = document.getElementById('formCreateOrder');
const searchInput = document.getElementById('searchInput');
const filterButtons = document.querySelectorAll('.filter-btn');
const dateFilter = document.getElementById('dateFilter');
const btnClearDate = document.getElementById('btnClearDate');
const ordersTableBody = document.getElementById('ordersTableBody');
const loadingState = document.getElementById('loadingState');
const emptyState = document.getElementById('emptyState');
const tableContainer = document.getElementById('tableContainer');

// PDF Upload elements
const btnUploadPDF = document.getElementById('btnUploadPDF');
const inputPDFFile = document.getElementById('inputPDFFile');
const pdfUploadStatus = document.getElementById('pdfUploadStatus');

// Statistics elements
const statTotal = document.getElementById('statTotal');
const statPending = document.getElementById('statPending');
const statDelivered = document.getElementById('statDelivered');
const statNotDelivered = document.getElementById('statNotDelivered');

// Event listeners
btnCreateOrder.addEventListener('click', openCreateModal);
btnCloseCreateModal.addEventListener('click', closeCreateModal);
btnCancelCreate.addEventListener('click', closeCreateModal);
btnCloseImageModal.addEventListener('click', closeImageModal);
formCreateOrder.addEventListener('submit', handleCreateOrder);
searchInput.addEventListener('input', handleSearch);

// PDF Upload event listeners
btnUploadPDF.addEventListener('click', () => inputPDFFile.click());
inputPDFFile.addEventListener('change', handlePDFUpload);

filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        filterButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.filter;
        renderOrders();
    });
});

// Date filter event listeners
dateFilter.addEventListener('change', handleDateChange);
btnClearDate.addEventListener('click', clearDateFilter);

// Initialize date picker with today's date
dateFilter.value = selectedDate;


// Close modals when clicking outside
modalCreateOrder.addEventListener('click', (e) => {
    if (e.target === modalCreateOrder) closeCreateModal();
});

modalViewImage.addEventListener('click', (e) => {
    if (e.target === modalViewImage) closeImageModal();
});

// Wix Import Modal Elements
const btnImportWix = document.getElementById('btnImportWix');
const modalImportWix = document.getElementById('modalImportWix');
const btnCloseImportWix = document.getElementById('btnCloseImportWix');
const btnLoadWix = document.getElementById('btnLoadWix');
const btnConfirmImport = document.getElementById('btnConfirmImport');
const importStatus = document.getElementById('importStatus');
const pedidosWixList = document.getElementById('pedidosWixList');
const emptyWixState = document.getElementById('emptyWixState');

let pedidosWixData = [];
let pedidosSeleccionados = [];

// Wix Modal Event Listeners
btnImportWix.addEventListener('click', openImportWixModal);
btnCloseImportWix.addEventListener('click', closeImportWixModal);
btnLoadWix.addEventListener('click', cargarPedidosWix);
btnConfirmImport.addEventListener('click', confirmarImportacion);

modalImportWix.addEventListener('click', (e) => {
    if (e.target === modalImportWix) closeImportWixModal();
});

// Wix Modal Functions
function openImportWixModal() {
    modalImportWix.classList.add('active');
    // Reset state
    pedidosWixData = [];
    pedidosSeleccionados = [];
    pedidosWixList.style.display = 'none';
    importStatus.style.display = 'none';
    emptyWixState.style.display = 'block';
    btnConfirmImport.style.display = 'none';
}

function closeImportWixModal() {
    modalImportWix.classList.remove('active');
}

async function cargarPedidosWix() {
    try {
        // Show loading
        emptyWixState.style.display = 'none';
        importStatus.style.display = 'block';
        btnLoadWix.disabled = true;

        // Fetch orders from Wix
        pedidosWixData = await obtenerPedidosWix();

        if (pedidosWixData.length === 0) {
            importStatus.style.display = 'none';
            emptyWixState.innerHTML = '<p>No se encontraron pedidos en Wix</p>';
            emptyWixState.style.display = 'block';
            btnLoadWix.disabled = false;
            return;
        }

        // Render orders list
        renderPedidosWixList();

        importStatus.style.display = 'none';
        pedidosWixList.style.display = 'block';
        btnConfirmImport.style.display = 'block';
        btnLoadWix.disabled = false;

    } catch (error) {
        console.error('Error cargando pedidos Wix:', error);
        importStatus.style.display = 'none';
        emptyWixState.innerHTML = '<p>Error al cargar pedidos. Intenta de nuevo.</p>';
        emptyWixState.style.display = 'block';
        btnLoadWix.disabled = false;
    }
}

function renderPedidosWixList() {
    pedidosWixList.innerHTML = pedidosWixData.map((pedido, index) => {
        const billing = pedido.billingInfo || {};
        const shipping = pedido.shippingInfo || {};
        const contactDetails = billing.contactDetails || {};
        const shippingDest = shipping.logistics?.shippingDestination || {};
        const address = shippingDest.address || {};

        const nombre = `${contactDetails.firstName || ''} ${contactDetails.lastName || ''}`.trim() || 'Sin nombre';
        const ciudad = address.city || 'Sin ciudad';

        // Get total price
        const priceSummary = pedido.priceSummary || {};
        const totalObj = priceSummary.total || {};
        const totalAmount = typeof totalObj === 'object' ? totalObj.amount : totalObj;
        const total = totalAmount ? `$${parseFloat(totalAmount).toLocaleString()}` : 'N/A';

        return `
            <div class="pedido-wix-item">
                <label>
                    <input type="checkbox" 
                           data-index="${index}" 
                           onchange="togglePedidoSelection(${index})">
                    <div class="pedido-wix-info">
                        <div class="pedido-wix-number">#${pedido.number}</div>
                        <div class="pedido-wix-details">
                            ${nombre} - ${ciudad} - ${total}
                        </div>
                    </div>
                </label>
            </div>
        `;
    }).join('');
}

window.togglePedidoSelection = function (index) {
    const checkbox = document.querySelector(`input[data-index="${index}"]`);
    if (checkbox.checked) {
        pedidosSeleccionados.push(pedidosWixData[index]);
    } else {
        pedidosSeleccionados = pedidosSeleccionados.filter(p => p.number !== pedidosWixData[index].number);
    }
};

async function confirmarImportacion() {
    if (pedidosSeleccionados.length === 0) {
        showNotification('Selecciona al menos un pedido', 'error');
        return;
    }

    try {
        btnConfirmImport.disabled = true;
        btnConfirmImport.textContent = 'Importando...';

        const importados = await importarPedidosWix(pedidosSeleccionados);

        showNotification(`✅ ${importados} pedidos importados exitosamente`, 'success');
        closeImportWixModal();

    } catch (error) {
        console.error('Error importando pedidos:', error);
        showNotification('Error al importar pedidos', 'error');
    } finally {
        btnConfirmImport.disabled = false;
        btnConfirmImport.textContent = '✅ Importar Seleccionados';
    }
}

// Helper function to load image as base64
function loadImageAsBase64(url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = function () {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            const dataURL = canvas.toDataURL('image/png');
            resolve(dataURL);
        };
        img.onerror = function (error) {
            reject(error);
        };
        img.src = url;
    });
}

// Generate Wix Label PDF with QR Code
async function generarEtiquetaWixPDF(pedido) {
    try {
        const { jsPDF } = window.jspdf;

        // Create PDF (10x15 cm)
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'cm',
            format: [10, 15]
        });

        // Company info
        const empresaInfo = {
            nombre: "DIDÁCTICOS JUGANDO Y EDUCANDO SAS",
            nit: "NIT 901,144,615-6",
            direccion: "CC Bulevar - Local S113, Bogotá",
            celular: "Celular 3134285423"
        };

        // Set font
        doc.setFont("helvetica");

        let y = 0.5; // Start position

        // Load and add logo at the top (centered)
        const logoWidth = 3; // 3cm width
        const logoHeight = 0.8; // Will maintain aspect ratio approximately
        const logoX = (10 - logoWidth) / 2; // Center horizontally

        try {
            // Load logo as base64
            const logoImg = await loadImageAsBase64('logo transparente.png');
            doc.addImage(logoImg, 'PNG', logoX, y, logoWidth, logoHeight);
            y += logoHeight + 0.3; // Space after logo
        } catch (error) {
            console.warn('Could not load logo:', error);
            // Continue without logo if it fails
        }

        // Company name (bold, larger)
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text(empresaInfo.nombre, 0.5, y);
        y += 0.5;

        // Company details
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.text(empresaInfo.nit, 0.5, y);
        y += 0.4;
        doc.text(empresaInfo.direccion, 0.5, y);
        y += 0.4;
        doc.text(empresaInfo.celular, 0.5, y);
        y += 0.6;

        // Separator line
        doc.setLineWidth(0.02);
        doc.line(0.5, y, 9.5, y);
        y += 0.6;

        // COD Banner (if applicable)
        if (pedido.pago_contraentrega) {
            // Yellow background
            doc.setFillColor(255, 193, 7); // Yellow
            doc.rect(0.5, y, 9, 1.2, 'F');

            // Warning text
            doc.setFontSize(11);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(0, 0, 0); // Black
            doc.text("*** PAGO CONTRAENTREGA ***", 5, y + 0.5, { align: 'center' });

            // Amount text
            doc.setFontSize(14);
            doc.text(`COBRAR: $${pedido.monto_cobrar.toLocaleString()}`, 5, y + 0.95, { align: 'center' });

            y += 1.4;

            // Reset text color
            doc.setTextColor(0, 0, 0);
        }

        // Recipient info (bold, larger)
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text(`Destinatario: ${pedido.destinatario}`, 0.5, y);
        y += 0.6;

        // Phone
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(`Celular: ${pedido.celular || 'N/A'}`, 0.5, y);
        y += 0.5;

        // Address (allow multiple lines with word wrap)
        doc.setFontSize(10);
        const direccionText = pedido.direccion || 'N/A';
        const maxWidth = 8.5; // Max width for text (10cm - 1.5cm margins)
        const direccionLines = doc.splitTextToSize(`Dirección: ${direccionText}`, maxWidth);

        // Print all lines of address
        direccionLines.forEach((line, index) => {
            doc.text(line, 0.5, y);
            y += 0.45; // Slightly smaller line height for addresses
        });

        // City
        doc.setFont("helvetica", "bold");
        doc.text(`Ciudad: ${pedido.ciudad || 'N/A'}`, 0.5, y);
        y += 0.5;

        // Order number
        doc.text(`Pedido: #${pedido.numero_pedido_wix}`, 0.5, y);
        y += 0.6;

        // Observations if any
        if (pedido.observaciones_wix && pedido.observaciones_wix.trim()) {
            doc.setFontSize(9);
            doc.setFont("helvetica", "normal");
            doc.text(`Observaciones:`, 0.5, y);
            y += 0.4;
            doc.text(pedido.observaciones_wix, 0.5, y);
        }

        // Generate QR Code
        const qrContainer = document.createElement('div');
        qrContainer.style.display = 'none';
        document.body.appendChild(qrContainer);

        const qr = new QRCode(qrContainer, {
            text: pedido.numero_pedido_wix.toString(),
            width: 200,
            height: 200,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });

        // Wait for QR to generate
        await new Promise(resolve => setTimeout(resolve, 100));

        // Get QR image
        const qrImage = qrContainer.querySelector('img');
        if (qrImage) {
            // Add QR code to PDF (bottom right)
            const qrSize = 3; // 3cm
            const qrX = 9.5 - qrSize - 0.5; // Right aligned with margin
            const qrY = 15 - qrSize - 1; // Bottom with margin

            doc.addImage(qrImage.src, 'PNG', qrX, qrY, qrSize, qrSize);

            // Add pedido number below QR
            doc.setFontSize(10);
            doc.setFont("helvetica", "bold");
            const pedidoText = `#${pedido.numero_pedido_wix}`;
            const textWidth = doc.getTextWidth(pedidoText);
            doc.text(pedidoText, qrX + (qrSize - textWidth) / 2, qrY + qrSize + 0.4);
        }

        // Clean up
        document.body.removeChild(qrContainer);

        // Download PDF using jsPDF's save method (forces download)
        const fileName = `WIX_${pedido.numero_pedido_wix}_${pedido.numero_serial}.pdf`;
        doc.save(fileName);

        showNotification('✅ Etiqueta PDF generada', 'success');

    } catch (error) {
        console.error('Error generando etiqueta PDF:', error);
        showNotification('Error al generar etiqueta PDF', 'error');
    }
}

// Wrapper function to generate label from order ID
window.generarEtiquetaWix = async function (orderId) {
    const order = allOrders.find(o => o.id === orderId);
    if (order && order.origen === 'wix') {
        await generarEtiquetaWixPDF(order);
    } else {
        showNotification('Pedido no encontrado o no es de Wix', 'error');
    }
};

// Toggle COD checkbox
window.toggleCOD = function (orderId, isChecked) {
    const amountInput = document.getElementById(`cod-amount-${orderId}`);
    const saveBtn = document.getElementById(`btn-save-${orderId}`);

    if (isChecked) {
        amountInput.classList.remove('hidden');
        saveBtn.classList.remove('hidden');
        amountInput.focus();
    } else {
        amountInput.classList.add('hidden');
        saveBtn.classList.add('hidden');
        // Auto-save when unchecking
        saveCOD(orderId, false);
    }
};

// Save COD information
window.saveCOD = async function (orderId, showConfirmation = true) {
    const checkbox = document.querySelector(`.cod-checkbox[data-order-id="${orderId}"]`);
    const amountInput = document.getElementById(`cod-amount-${orderId}`);

    const isCOD = checkbox.checked;
    const amount = isCOD ? (parseInt(amountInput.value) || 0) : 0;

    try {
        const order = allOrders.find(o => o.id === orderId);
        if (!order) {
            showNotification('Pedido no encontrado', 'error');
            return;
        }

        // Update Firestore
        const orderRef = doc(db, order.coleccion, orderId);
        await updateDoc(orderRef, {
            pago_contraentrega: isCOD,
            monto_cobrar: amount
        });

        // Update local state
        order.pago_contraentrega = isCOD;
        order.monto_cobrar = amount;

        if (showConfirmation) {
            showNotification(isCOD ? `✅ Marcado como COD: $${amount.toLocaleString()}` : '✅ COD removido', 'success');
        }
    } catch (error) {
        console.error('Error guardando COD:', error);
        showNotification('Error al guardar', 'error');
    }
};



// Get next serial number from Firestore counter
async function getNextSerialNumber() {
    const counterRef = doc(db, 'contadores', 'pedidos_flex_counter');

    try {
        const newSerial = await runTransaction(db, async (transaction) => {
            const counterDoc = await transaction.get(counterRef);

            let currentValue = 0;
            if (counterDoc.exists()) {
                currentValue = counterDoc.data().current_value || 0;
            }

            const nextValue = currentValue + 1;

            transaction.set(counterRef, { current_value: nextValue }, { merge: true });

            return nextValue;
        });

        return newSerial;
    } catch (error) {
        console.error('Error getting next serial:', error);
        throw error;
    }
}

// Open create modal and auto-increment serial
async function openCreateModal() {
    modalCreateOrder.classList.add('active');

    // Get next serial number from counter
    try {
        const nextSerial = await getNextSerialNumber();
        document.getElementById('inputNumeroSerial').value = nextSerial;
    } catch (error) {
        showNotification('Error al obtener número serial', 'error');
        // Fallback to old method if counter fails
        const maxSerial = allOrders.length > 0
            ? Math.max(...allOrders.map(order => order.numero_serial || 0))
            : 0;
        document.getElementById('inputNumeroSerial').value = maxSerial + 1;
    }
}

// Close create modal
function closeCreateModal() {
    modalCreateOrder.classList.remove('active');
    formCreateOrder.reset();
}

// Close image modal
function closeImageModal() {
    modalViewImage.classList.remove('active');
}

// Handle PDF upload and auto-fill form
async function handlePDFUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    // Show loading status
    pdfUploadStatus.style.display = 'block';
    pdfUploadStatus.textContent = '📄 Extrayendo datos del PDF...';
    pdfUploadStatus.className = 'pdf-upload-status loading';

    try {
        // Extract data from PDF
        const data = await extractDataFromPDF(file);

        // Auto-fill form fields
        if (data.numero_venta) {
            document.getElementById('inputNumeroVenta').value = data.numero_venta;
            animateField('inputNumeroVenta');
        }
        if (data.numero_envio) {
            document.getElementById('inputNumeroEnvio').value = data.numero_envio;
            animateField('inputNumeroEnvio');
        }
        if (data.referencia) {
            document.getElementById('inputReferencia').value = data.referencia;
            animateField('inputReferencia');
        }
        if (data.distrito) {
            document.getElementById('inputDistrito').value = data.distrito;
            animateField('inputDistrito');
        }
        if (data.destinatario) {
            document.getElementById('inputDestinatario').value = data.destinatario;
            animateField('inputDestinatario');
        }
        if (data.direccion) {
            document.getElementById('inputDireccion').value = data.direccion;
            animateField('inputDireccion');
        }

        // Show success status
        pdfUploadStatus.textContent = '✅ Datos cargados exitosamente';
        pdfUploadStatus.className = 'pdf-upload-status success';

        setTimeout(() => {
            pdfUploadStatus.style.display = 'none';
        }, 3000);

    } catch (error) {
        console.error('Error processing PDF:', error);
        pdfUploadStatus.textContent = '❌ ' + error.message;
        pdfUploadStatus.className = 'pdf-upload-status error';

        setTimeout(() => {
            pdfUploadStatus.style.display = 'none';
        }, 5000);
    }

    // Reset file input
    inputPDFFile.value = '';
}

// Animate field when auto-filled
function animateField(fieldId) {
    const field = document.getElementById(fieldId);
    field.classList.add('auto-filled');
    setTimeout(() => {
        field.classList.remove('auto-filled');
    }, 1000);
}

// Handle create order form submission
async function handleCreateOrder(e) {
    e.preventDefault();

    const btnSubmitText = document.getElementById('btnSubmitText');
    const btnSubmitLoading = document.getElementById('btnSubmitLoading');
    const btnSubmit = document.getElementById('btnSubmitCreate');

    // Show loading state
    btnSubmitText.style.display = 'none';
    btnSubmitLoading.style.display = 'inline';
    btnSubmit.disabled = true;

    try {
        const numeroEnvio = document.getElementById('inputNumeroEnvio').value.trim();

        // Check if order with same numero_envio already exists
        const duplicateOrder = allOrders.find(order => order.numero_envio === numeroEnvio);
        if (duplicateOrder) {
            showNotification(`⚠️ Ya existe un pedido con el N° Envío ${numeroEnvio}`, 'error');
            btnSubmitText.style.display = 'inline';
            btnSubmitLoading.style.display = 'none';
            btnSubmit.disabled = false;
            return;
        }

        const orderData = {
            origen: 'flex',
            numero_envio: numeroEnvio,
            numero_venta: document.getElementById('inputNumeroVenta').value.trim(),
            numero_serial: parseInt(document.getElementById('inputNumeroSerial').value),
            referencia: document.getElementById('inputReferencia').value.trim() || null,
            destinatario: document.getElementById('inputDestinatario').value.trim(),
            direccion: document.getElementById('inputDireccion').value.trim(),
            distrito: document.getElementById('inputDistrito').value.trim() || null,
            ciudad: '',
            celular: '',
            telefono: document.getElementById('inputTelefono').value.trim() || null,
            estado: 'pendiente',
            fecha_creacion: Timestamp.now(),
            fecha_entrega: null,
            repartidor_id: null,
            repartidor_nombre: null,
            imagen_evidencia_url: null,
            recibido_por: null
        };

        await addDoc(collection(db, 'pedidos_flex'), orderData);

        closeCreateModal();
        showNotification('Pedido creado exitosamente', 'success');
    } catch (error) {
        console.error('Error creating order:', error);
        showNotification('Error al crear el pedido', 'error');
    } finally {
        btnSubmitText.style.display = 'inline';
        btnSubmitLoading.style.display = 'none';
        btnSubmit.disabled = false;
    }
}

// Handle search
function handleSearch(e) {
    searchTerm = e.target.value.toLowerCase();
    renderOrders();
}

// Get today's date as YYYY-MM-DD string
function getTodayDateString() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Check if a Firestore timestamp matches a date string
function isSameDay(firestoreTimestamp, dateString) {
    if (!firestoreTimestamp || !dateString) return false;

    const date = firestoreTimestamp.toDate();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}` === dateString;
}

// Handle date filter change
function handleDateChange(e) {
    selectedDate = e.target.value;
    updateStatistics();
    renderOrders();
}

// Clear date filter
function clearDateFilter() {
    selectedDate = null;
    dateFilter.value = '';
    updateStatistics();
    renderOrders();
}

// Wix API Functions
async function obtenerPedidosWix() {
    try {
        // Call our serverless function instead of Wix API directly
        const response = await fetch('/api/wix-orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                return data.orders || [];
            } else {
                throw new Error(data.error || 'Error desconocido');
            }
        } else {
            throw new Error(`Error ${response.status}`);
        }
    } catch (error) {
        console.error('Error obteniendo pedidos Wix:', error);
        showNotification('Error al conectar con Wix', 'error');
        return [];
    }
}

async function importarPedidosWix(pedidosSeleccionados) {
    let importados = 0;

    for (const pedido of pedidosSeleccionados) {
        try {
            // Extraer datos del pedido Wix
            const billing = pedido.billingInfo || {};
            const shipping = pedido.shippingInfo || {};
            const contactDetails = billing.contactDetails || {};
            const shippingDest = shipping.logistics?.shippingDestination || {};
            const address = shippingDest.address || {};
            const shippingContact = shippingDest.contactDetails || {};

            const nombre = `${contactDetails.firstName || ''} ${contactDetails.lastName || ''}`.trim() || 'Sin nombre';
            const celular = shippingContact.phone || contactDetails.phone || '';
            const direccion = `${address.addressLine || ''}\n${address.addressLine2 || ''}`.trim() || 'Sin dirección';
            const ciudad = address.city || '';

            // Obtener siguiente número serial
            const nextSerial = await getNextSerialNumber();

            // Crear documento en Firestore (colección pedidos_wix)
            await addDoc(collection(db, 'pedidos_wix'), {
                numero_serial: nextSerial,
                origen: 'wix',
                numero_envio: `WIX-${pedido.number}`,
                numero_pedido_wix: pedido.number,
                destinatario: nombre,
                direccion: direccion,
                ciudad: ciudad,
                celular: celular,
                estado: 'pendiente',
                fecha_creacion: Timestamp.now(),
                fecha_entrega: null,
                repartidor_id: null,
                repartidor_nombre: null,
                imagen_evidencia_url: null,
                recibido_por: null,
                observaciones_wix: '',
                pago_contraentrega: false,
                monto_cobrar: 0
            });

            importados++;
        } catch (error) {
            console.error(`Error importando pedido ${pedido.number}:`, error);
        }
    }

    return importados;
}

// Listen to real-time updates from BOTH Firestore collections
function listenToOrders() {
    let flexOrders = [];
    let wixOrders = [];

    // Listen to pedidos_flex
    const qFlex = query(collection(db, 'pedidos_flex'), orderBy('numero_serial', 'desc'));
    onSnapshot(qFlex, (snapshot) => {
        flexOrders = snapshot.docs.map(doc => ({
            id: doc.id,
            coleccion: 'pedidos_flex',
            ...doc.data()
        }));
        combineAndRenderOrders();
    }, (error) => {
        console.error('Error listening to pedidos_flex:', error);
    });

    // Listen to pedidos_wix
    const qWix = query(collection(db, 'pedidos_wix'), orderBy('numero_serial', 'desc'));
    onSnapshot(qWix, (snapshot) => {
        wixOrders = snapshot.docs.map(doc => ({
            id: doc.id,
            coleccion: 'pedidos_wix',
            ...doc.data()
        }));
        combineAndRenderOrders();
    }, (error) => {
        console.error('Error listening to pedidos_wix:', error);
    });

    // Combine orders from both collections
    function combineAndRenderOrders() {
        // Combine and sort by numero_serial descending
        allOrders = [...flexOrders, ...wixOrders].sort((a, b) => b.numero_serial - a.numero_serial);

        updateStatistics();
        renderOrders();

        // Hide loading, show appropriate state
        loadingState.style.display = 'none';

        if (allOrders.length === 0) {
            emptyState.style.display = 'block';
            tableContainer.style.display = 'none';
        } else {
            emptyState.style.display = 'none';
            tableContainer.style.display = 'block';
        }
    }
}

// Update statistics
function updateStatistics() {
    // Filter orders by date if selectedDate is set
    let ordersToCount = allOrders;
    if (selectedDate) {
        ordersToCount = allOrders.filter(order => isSameDay(order.fecha_creacion, selectedDate));
    }

    const total = ordersToCount.length;
    const pending = ordersToCount.filter(o => o.estado === 'pendiente').length;
    const delivered = ordersToCount.filter(o => o.estado === 'entregado').length;
    const notDelivered = ordersToCount.filter(o => o.estado === 'no_entregado').length;

    statTotal.textContent = total;
    statPending.textContent = pending;
    statDelivered.textContent = delivered;
    statNotDelivered.textContent = notDelivered;
}

// Render orders table
function renderOrders() {
    let filteredOrders = allOrders;

    // Apply date filter first
    if (selectedDate) {
        filteredOrders = filteredOrders.filter(order => isSameDay(order.fecha_creacion, selectedDate));
    }

    // Apply filter
    if (currentFilter !== 'todos') {
        if (currentFilter === 'flex' || currentFilter === 'wix') {
            // Filter by origin
            filteredOrders = filteredOrders.filter(order => (order.origen || 'flex') === currentFilter);
        } else {
            // Filter by status
            filteredOrders = filteredOrders.filter(order => order.estado === currentFilter);
        }
    }

    // Determine if we're showing only Wix or mixed/Flex
    const showingOnlyWix = currentFilter === 'wix';
    const showingOnlyFlex = currentFilter === 'flex';

    // Update table header based on filter
    const ordersTableHead = document.getElementById('ordersTableHead');
    if (showingOnlyWix) {
        // Wix columns: Serial | Origen | N° Envío | Destinatario | Celular | Dirección | Contraentrega | Estado | Repartidor | Fecha Entrega | Recibido por | Acciones
        ordersTableHead.innerHTML = `
            <tr>
                <th>Serial</th>
                <th>Origen</th>
                <th>N° Envío</th>
                <th>Destinatario</th>
                <th>Celular</th>
                <th>Dirección</th>
                <th>Contraentrega</th>
                <th>Estado</th>
                <th>Repartidor</th>
                <th>Fecha Entrega</th>
                <th>Recibido por</th>
                <th>Acciones</th>
            </tr>
        `;
    } else {
        // Flex columns (default): Serial | Origen | N° Envío | N° Venta | Referencia | Destinatario | Dirección | Distrito | Estado | Repartidor | Fecha Entrega | Recibido por | Acciones
        ordersTableHead.innerHTML = `
            <tr>
                <th>Serial</th>
                <th>Origen</th>
                <th>N° Envío</th>
                <th>N° Venta</th>
                <th>Referencia</th>
                <th>Destinatario</th>
                <th>Dirección</th>
                <th>Distrito</th>
                <th>Estado</th>
                <th>Repartidor</th>
                <th>Fecha Entrega</th>
                <th>Recibido por</th>
                <th>Acciones</th>
            </tr>
        `;
    }

    // Apply search
    if (searchTerm) {
        filteredOrders = filteredOrders.filter(order => {
            const searchableText = [
                order.numero_envio,
                order.numero_venta,
                order.destinatario,
                order.direccion,
                order.numero_serial?.toString()
            ].join(' ').toLowerCase();

            return searchableText.includes(searchTerm);
        });
    }

    // Render table rows
    const colspanCount = showingOnlyWix ? 12 : 13; // Updated for Contraentrega column

    if (filteredOrders.length === 0 && allOrders.length > 0) {
        ordersTableBody.innerHTML = `
            <tr>
                <td colspan="${colspanCount}" style="text-align: center; padding: 2rem; color: #6b7280;">
                    No se encontraron pedidos con los filtros aplicados
                </td>
            </tr>
        `;
    } else {
        ordersTableBody.innerHTML = filteredOrders.map(order => {
            const isWix = order.origen === 'wix';

            if (showingOnlyWix || isWix) {
                // Wix row format
                return `
                    <tr>
                        <td><strong>#${order.numero_serial}</strong></td>
                        <td>${getOrigenBadge(order.origen)}</td>
                        <td>${order.numero_envio}</td>
                        <td>${order.destinatario}</td>
                        <td>${order.celular || '-'}</td>
                        <td>${order.direccion}</td>
                        <td class="contraentrega-cell">
                            <div class="contraentrega-controls">
                                <label class="checkbox-label">
                                    <input type="checkbox" 
                                           class="cod-checkbox" 
                                           data-order-id="${order.id}"
                                           ${order.pago_contraentrega ? 'checked' : ''}
                                           onchange="toggleCOD('${order.id}', this.checked)">
                                </label>
                                <input type="number" 
                                       class="cod-amount-input ${order.pago_contraentrega ? '' : 'hidden'}" 
                                       id="cod-amount-${order.id}"
                                       value="${order.monto_cobrar || 0}"
                                       placeholder="Monto"
                                       min="0"
                                       step="1000">
                                <button class="btn-save-cod ${order.pago_contraentrega ? '' : 'hidden'}" 
                                        id="btn-save-${order.id}"
                                        onclick="saveCOD('${order.id}')">
                                    💾
                                </button>
                            </div>
                        </td>
                        <td>${getStatusBadge(order.estado)}</td>
                        <td>${order.repartidor_nombre || '-'}</td>
                        <td>${formatDate(order.fecha_entrega)}</td>
                        <td>${order.recibido_por || '-'}</td>
                        <td>
                            ${order.imagen_evidencia_url
                        ? `<button class="btn-view-image" onclick="viewImage('${order.id}', '${order.coleccion}')">Ver Foto</button>`
                        : '-'
                    }
                            ${(order.estado === 'pendiente')
                        ? `<button class="btn-generate-label" onclick="generarEtiquetaWix('${order.id}')">🏷️ Generar Etiqueta</button>`
                        : ''
                    }
                        </td>
                    </tr>
                `;
            } else {
                // Flex row format
                return `
                    <tr>
                        <td><strong>#${order.numero_serial}</strong></td>
                        <td>${getOrigenBadge(order.origen)}</td>
                        <td>${order.numero_envio}</td>
                        <td>${order.numero_venta || '-'}</td>
                        <td>${order.referencia || '-'}</td>
                        <td>${order.destinatario}</td>
                        <td>${order.direccion}</td>
                        <td>${order.distrito || '-'}</td>
                        <td>${getStatusBadge(order.estado)}</td>
                        <td>${order.repartidor_nombre || '-'}</td>
                        <td>${formatDate(order.fecha_entrega)}</td>
                        <td>${order.recibido_por || '-'}</td>
                        <td>
                            ${order.imagen_evidencia_url
                        ? `<button class="btn-view-image" onclick="viewImage('${order.id}', '${order.coleccion}')">Ver Foto</button>`
                        : '-'
                    }
                        </td>
                    </tr>
                `;
            }
        }).join('');
    }
}

// Get status badge HTML
function getStatusBadge(estado) {
    const badges = {
        'pendiente': '<span class="badge badge-pending">Pendiente</span>',
        'entregado': '<span class="badge badge-delivered">Entregado</span>',
        'no_entregado': '<span class="badge badge-not-delivered">No Entregado</span>'
    };
    return badges[estado] || estado;
}

// Get origin badge HTML
function getOrigenBadge(origen) {
    const origenValue = origen || 'flex';
    if (origenValue === 'wix') {
        return '<span class="badge-wix">🛒 Wix</span>';
    }
    return '<span class="badge-flex">📦 Flex</span>';
}


// Format date
function formatDate(timestamp) {
    if (!timestamp) return '-';

    const date = timestamp.toDate();
    return date.toLocaleDateString('es-CO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// View image (global function for onclick)
window.viewImage = function (orderId) {
    const order = allOrders.find(o => o.id === orderId);
    if (!order) return;

    document.getElementById('imageDestinatario').textContent = order.destinatario;
    document.getElementById('imageRepartidor').textContent = order.repartidor_nombre || '-';
    document.getElementById('imageFecha').textContent = formatDate(order.fecha_entrega);
    document.getElementById('imagePreview').src = order.imagen_evidencia_url;

    modalViewImage.classList.add('active');
};

// Show notification (simple implementation)
function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        background-color: ${type === 'success' ? '#10b981' : '#ef4444'};
        color: white;
        border-radius: 0.5rem;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
    `;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Add animation styles
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            opacity: 0;
            transform: translateX(100%);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
    @keyframes slideOut {
        from {
            opacity: 1;
            transform: translateX(0);
        }
        to {
            opacity: 0;
            transform: translateX(100%);
        }
    }
`;
document.head.appendChild(style);

// Initialize app
listenToOrders();
