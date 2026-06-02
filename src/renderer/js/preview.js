// PDF Preview Generator using PDF.js

// Setup worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

const pdfDocCache = {};

/**
 * Loads and caches a PDF document from file path
 */
async function getPdfDocument(filePath) {
  if (pdfDocCache[filePath]) {
    return pdfDocCache[filePath];
  }
  
  try {
    const arrayBuffer = await window.pdfgilAPI.readFileBytes(filePath);
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
    const pdfDoc = await loadingTask.promise;
    pdfDocCache[filePath] = pdfDoc;
    return pdfDoc;
  } catch (error) {
    console.error('Error loading PDF for preview:', error);
    throw error;
  }
}

/**
 * Renders a specific page of a PDF file onto a canvas element
 */
async function renderPageThumbnail(filePath, pageIndex, canvas) {
  try {
    const pdfDoc = await getPdfDocument(filePath);
    // PDF.js pages are 1-indexed
    const page = await pdfDoc.getPage(pageIndex + 1);
    
    const context = canvas.getContext('2d');
    
    // Calculate scale to fit thumbnail box (height ~150px)
    const initialViewport = page.getViewport({ scale: 1.0 });
    const targetHeight = 150;
    const scale = targetHeight / initialViewport.height;
    const viewport = page.getViewport({ scale });
    
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    
    const renderContext = {
      canvasContext: context,
      viewport: viewport
    };
    
    await page.render(renderContext).promise;
  } catch (error) {
    console.error(`Error rendering thumbnail for page ${pageIndex}:`, error);
    
    // Draw simple placeholder on failure
    const context = canvas.getContext('2d');
    canvas.width = 100;
    canvas.height = 130;
    context.fillStyle = '#333';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#fff';
    context.font = '12px sans-serif';
    context.fillText('?', 45, 70);
  }
}

/**
 * Clears the PDF document cache
 */
function clearPdfCache() {
  // Free reference for garbage collection
  for (const key in pdfDocCache) {
    delete pdfDocCache[key];
  }
}
