/**
 * PDF Parser Module
 * Extracts data from Mercado Libre Flex label PDFs
 */

/**
 * Extract data from a PDF file
 * @param {File} file - The PDF file to parse
 * @returns {Promise<Object>} - Extracted data object
 */
export async function extractDataFromPDF(file) {
    try {
        // Load PDF.js
        const pdfjsLib = window['pdfjs-dist/build/pdf'];

        // Read file as ArrayBuffer
        const arrayBuffer = await file.arrayBuffer();

        // Load PDF document
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

        // Extract text from all pages
        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ');
            fullText += pageText + '\n';
        }

        // Parse the extracted text
        const data = parseFlexLabel(fullText);

        return data;
    } catch (error) {
        console.error('Error extracting PDF data:', error);
        throw new Error('No se pudo leer el PDF. Asegúrate de que sea una etiqueta válida de Mercado Libre Flex.');
    }
}

/**
 * Parse Flex label text and extract fields
 * @param {string} text - Raw text extracted from PDF
 * @returns {Object} - Parsed data object
 */
function parseFlexLabel(text) {
    const data = {};

    // Extract Venta (Sale Number) - remove all spaces
    // Support both "Venta:" and "Pack ID:" formats
    let ventaMatch = text.match(/Venta:\s*([\d\s]+)/);
    if (!ventaMatch) {
        ventaMatch = text.match(/Pack ID:\s*([\d\s]+)/);
    }
    if (ventaMatch) {
        data.numero_venta = ventaMatch[1].replace(/\s+/g, '');
    }

    // Extract Envío (Shipping Number) - remove all spaces
    const envioMatch = text.match(/Envío:\s*([\d\s]+)/);
    if (envioMatch) {
        data.numero_envio = envioMatch[1].replace(/\s+/g, '');
    }

    // Extract Referencia (Reference)
    const referenciaMatch = text.match(/Referencia:\s*(.+?)(?:\n|Distrito:|$)/);
    if (referenciaMatch) {
        data.referencia = referenciaMatch[1].trim();
    }

    // Extract Distrito (District)
    const distritoMatch = text.match(/Distrito:\s*(.+?)(?:\n|Destinatario:|$)/);
    if (distritoMatch) {
        data.distrito = distritoMatch[1].trim();
    }

    // Extract Destinatario (Recipient) - remove the code in parentheses
    const destinatarioMatch = text.match(/Destinatario:\s*(.+?)\s*\(/);
    if (destinatarioMatch) {
        data.destinatario = destinatarioMatch[1].trim();
    }

    // Extract Direccion (Address)
    const direccionMatch = text.match(/Direccion:\s*(.+?)(?:\n|Referencia:|$)/);
    if (direccionMatch) {
        data.direccion = direccionMatch[1].trim();
    }

    return data;
}
