import * as pdfjsLib from 'pdfjs-dist';
import Tesseract from 'tesseract.js';

// Configure PDF.js worker
try {
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString();
} catch (e) {
  // Fallback worker if URL constructor fails in specific bundling mode
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || '4.10.38'}/build/pdf.worker.min.mjs`;
}

/**
 * Extracts text from a PDF file.
 * @param {File} file - PDF File object from input
 * @param {Function} onProgress - Progress reporting callback
 * @returns {Promise<string>}
 */
export async function extractTextFromPdf(file, onProgress) {
  if (onProgress) onProgress('Reading PDF document structure...');
  const arrayBuffer = await file.arrayBuffer();

  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;

  let fullText = '';
  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    if (onProgress) {
      const pct = Math.round((pageNum / numPages) * 100);
      onProgress(`Extracting page ${pageNum} of ${numPages} (${pct}%)...`);
    }

    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item) => item.str)
      .join(' ')
      .trim();

    if (pageText.length > 0) {
      fullText += pageText + '\n\n';
    }
  }

  return fullText.trim();
}

/**
 * Extracts text from an Image file (PNG, JPG, WebP) using OCR.
 * @param {File} file - Image File object from input
 * @param {Function} onProgress - Progress reporting callback
 * @returns {Promise<string>}
 */
export async function extractTextFromImage(file, onProgress) {
  if (onProgress) onProgress('Initializing image scanner...');

  const res = await Tesseract.recognize(file, 'eng', {
    logger: (m) => {
      if (onProgress && m.status === 'recognizing text') {
        const pct = Math.round((m.progress || 0) * 100);
        onProgress(`Reading image text... ${pct}%`);
      } else if (onProgress && m.status) {
        onProgress(`${m.status.charAt(0).toUpperCase() + m.status.slice(1)}...`);
      }
    },
  });

  return (res.data?.text || '').trim();
}

/**
 * Unified file text extractor supporting PDF, PNG, JPG, WebP.
 * @param {File} file
 * @param {Function} onProgress
 * @returns {Promise<{ text: string, fileType: 'pdf' | 'image' }>}
 */
export async function extractTextFromFile(file, onProgress) {
  if (!file) throw new Error('No file provided');

  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

  if (isPdf) {
    const text = await extractTextFromPdf(file, onProgress);
    return { text, fileType: 'pdf' };
  } else {
    const text = await extractTextFromImage(file, onProgress);
    return { text, fileType: 'image' };
  }
}
