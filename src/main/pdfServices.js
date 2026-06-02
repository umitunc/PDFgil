const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');
const { exec, spawn } = require('child_process');

/**
 * Checks if Ghostscript is available in the system PATH.
 * @returns {Promise<string|null>} Resolves with the command name ('gswin64c', 'gswin32c', or 'gs') if found, otherwise null.
 */
function checkGhostscript() {
  return new Promise((resolve) => {
    // Try gswin64c (Windows 64-bit), then gs (Linux/macOS/Windows alternative), then gswin32c
    const commands = ['gswin64c', 'gs', 'gswin32c'];
    let index = 0;

    function tryNext() {
      if (index >= commands.length) {
        resolve(null);
        return;
      }
      const cmd = commands[index];
      exec(`"${cmd}" --version`, (err) => {
        if (!err) {
          resolve(cmd);
        } else {
          index++;
          tryNext();
        }
      });
    }

    tryNext();
  });
}

/**
 * Merges multiple PDF files into one.
 */
async function mergePDFs(filePaths, outputPath) {
  const mergedPdf = await PDFDocument.create();
  
  for (const filePath of filePaths) {
    const pdfBytes = fs.readFileSync(filePath);
    const pdf = await PDFDocument.load(pdfBytes);
    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }
  
  const mergedPdfBytes = await mergedPdf.save();
  fs.writeFileSync(outputPath, mergedPdfBytes);
  return { success: true, outputPath };
}

/**
 * Splits a PDF file.
 * options: { type: 'all' } or { type: 'range', range: '2-5' }
 */
async function splitPDF(filePath, options, outputPath) {
  const pdfBytes = fs.readFileSync(filePath);
  const srcPdf = await PDFDocument.load(pdfBytes);
  const totalPages = srcPdf.getPageCount();

  if (options.type === 'range') {
    // Parse range e.g. "2-5" or "3"
    const parts = options.range.split('-').map(x => parseInt(x.trim(), 10));
    let start = parts[0];
    let end = parts[1] || start;

    if (isNaN(start) || start < 1 || start > totalPages || end < start || end > totalPages) {
      throw new Error(`Invalid page range. Total page count: ${totalPages}`);
    }

    const newPdf = await PDFDocument.create();
    // pdf-lib pageIndices are 0-indexed, user input is 1-indexed
    const indices = [];
    for (let i = start - 1; i <= end - 1; i++) {
      indices.push(i);
    }

    const copiedPages = await newPdf.copyPages(srcPdf, indices);
    copiedPages.forEach(page => newPdf.addPage(page));

    const newPdfBytes = await newPdf.save();
    fs.writeFileSync(outputPath, newPdfBytes);
    return { success: true, files: [outputPath] };
  } else if (options.type === 'all') {
    // Save each page individually. outputPath is the prefix directory path.
    const createdFiles = [];
    const baseName = path.basename(filePath, '.pdf');
    
    for (let i = 0; i < totalPages; i++) {
      const newPdf = await PDFDocument.create();
      const [copiedPage] = await newPdf.copyPages(srcPdf, [i]);
      newPdf.addPage(copiedPage);
      const newPdfBytes = await newPdf.save();
      
      const fileOutPath = path.join(outputPath, `${baseName}_page_${i + 1}.pdf`);
      fs.writeFileSync(fileOutPath, newPdfBytes);
      createdFiles.push(fileOutPath);
    }
    return { success: true, files: createdFiles };
  } else {
    throw new Error('Unknown split type');
  }
}

/**
 * Rotates specific pages of a PDF file.
 * rotationMap: { [pageIndex]: degrees } e.g. { 0: 90, 1: 180 }
 */
async function rotatePDF(filePath, rotationMap, outputPath) {
  const pdfBytes = fs.readFileSync(filePath);
  const pdf = await PDFDocument.load(pdfBytes);
  
  for (const [indexStr, degrees] of Object.entries(rotationMap)) {
    const index = parseInt(indexStr, 10);
    if (index >= 0 && index < pdf.getPageCount()) {
      const page = pdf.getPage(index);
      // setRotation takes 0, 90, 180, 270
      page.setRotation(degrees);
    }
  }
  
  const rotatedPdfBytes = await pdf.save();
  fs.writeFileSync(outputPath, rotatedPdfBytes);
  return { success: true, outputPath };
}

/**
 * Compresses a PDF file.
 * profile: 'ebook' (standard) or 'screen' (aggressive email)
 */
async function compressPDF(filePath, profile, outputPath) {
  const gsCmd = await checkGhostscript();
  
  if (!gsCmd) {
    // Fallback: use pdf-lib optimization which just removes metadata/compresses streams, but doesn't downsample images.
    const pdfBytes = fs.readFileSync(filePath);
    const pdf = await PDFDocument.load(pdfBytes);
    const optimizedBytes = await pdf.save({
      useObjectStreams: true,
      addEmptyPage: false
    });
    fs.writeFileSync(outputPath, optimizedBytes);
    return { 
      success: true, 
      outputPath, 
      fallback: true,
      message: 'Ghostscript not found. Basic PDF compression applied.' 
    };
  }

  // Ghostscript command args
  const gsProfile = profile === 'screen' ? '/screen' : '/ebook';
  const args = [
    '-sDEVICE=pdfwrite',
    '-dCompatibilityLevel=1.4',
    `-dPDFSETTINGS=${gsProfile}`,
    '-dNOPAUSE',
    '-dQUIET',
    '-dBATCH',
    `-sOutputFile=${outputPath}`,
    filePath
  ];

  return new Promise((resolve, reject) => {
    const gsProcess = spawn(gsCmd, args);
    let errorMsg = '';
    
    gsProcess.stderr.on('data', (data) => {
      errorMsg += data.toString();
    });

    gsProcess.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true, outputPath, fallback: false });
      } else {
        reject(new Error(`Ghostscript Error (code ${code}): ${errorMsg}`));
      }
    });
  });
}

/**
 * Reads basic PDF metadata and pages count
 */
async function getPDFMetadata(filePath) {
  try {
    const pdfBytes = fs.readFileSync(filePath);
    const pdf = await PDFDocument.load(pdfBytes, { updateMetadata: false });
    return {
      pageCount: pdf.getPageCount(),
      title: pdf.getTitle() || '',
      author: pdf.getAuthor() || '',
      sizeBytes: fs.statSync(filePath).size
    };
  } catch (err) {
    throw new Error(`Could not load PDF: ${err.message}`);
  }
}

module.exports = {
  mergePDFs,
  splitPDF,
  rotatePDF,
  compressPDF,
  getPDFMetadata
};
