// Firebase imports
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import {
    getFirestore,
    collection,
    addDoc,
    onSnapshot,
    query,
    orderBy,
    Timestamp
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
let currentFilter = 'todos';
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

// Open create modal and auto-increment serial
async function openCreateModal() {
    modalCreateOrder.classList.add('active');

    // Auto-increment serial number
    const maxSerial = allOrders.length > 0
        ? Math.max(...allOrders.map(order => order.numero_serial || 0))
        : 0;

    document.getElementById('inputNumeroSerial').value = maxSerial + 1;
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
            numero_envio: numeroEnvio,
            numero_venta: document.getElementById('inputNumeroVenta').value.trim(),
            numero_serial: parseInt(document.getElementById('inputNumeroSerial').value),
            referencia: document.getElementById('inputReferencia').value.trim() || null,
            destinatario: document.getElementById('inputDestinatario').value.trim(),
            direccion: document.getElementById('inputDireccion').value.trim(),
            distrito: document.getElementById('inputDistrito').value.trim() || null,
            telefono: document.getElementById('inputTelefono').value.trim() || null,
            estado: 'pendiente',
            fecha_creacion: Timestamp.now(),
            fecha_entrega: null,
            repartidor_id: null,
            repartidor_nombre: null,
            imagen_evidencia_url: null
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

// Listen to real-time updates from Firestore
function listenToOrders() {
    const q = query(collection(db, 'pedidos_flex'), orderBy('numero_serial', 'desc'));

    onSnapshot(q, (snapshot) => {
        allOrders = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

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
    }, (error) => {
        console.error('Error listening to orders:', error);
        loadingState.style.display = 'none';
        showNotification('Error al cargar los pedidos', 'error');
    });
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
        filteredOrders = filteredOrders.filter(order => order.estado === currentFilter);
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
    if (filteredOrders.length === 0 && allOrders.length > 0) {
        ordersTableBody.innerHTML = `
            <tr>
                <td colspan="12" style="text-align: center; padding: 2rem; color: #6b7280;">
                    No se encontraron pedidos con los filtros aplicados
                </td>
            </tr>
        `;
    } else {
        ordersTableBody.innerHTML = filteredOrders.map(order => `
            <tr>
                <td><strong>#${order.numero_serial}</strong></td>
                <td>${order.numero_envio}</td>
                <td>${order.numero_venta}</td>
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
                ? `<button class="btn-view-image" onclick="viewImage('${order.id}')">Ver Foto</button>`
                : '-'
            }
                </td>
            </tr>
        `).join('');
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
