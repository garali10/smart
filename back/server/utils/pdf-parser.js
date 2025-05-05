import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

export async function parsePDF(dataBuffer) {
    try {
        const data = await pdfParse(dataBuffer);
        return data;
    } catch (error) {
        console.error('Error parsing PDF:', error);
        throw error;
    }
} 