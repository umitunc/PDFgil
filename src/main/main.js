const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const pdfServices = require('./pdfServices');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1020,
    height: 720,
    minWidth: 800,
    minHeight: 600,
    icon: path.join(__dirname, '../renderer/images/pdfgil-icon.png'),
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    frame: false, // Frameless window
    title: 'PDFgil - Desktop PDF Editor'
  });

  // Remove the default toolbar menu
  mainWindow.setMenu(null);

  // Load the index.html from renderer folder
  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

// Window control IPCs
ipcMain.on('window:minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window:maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('window:close', () => {
  if (mainWindow) mainWindow.close();
});

app.on('ready', createWindow);

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', function () {
  if (mainWindow === null) {
    createWindow();
  }
});

// --- IPC HANDLERS ---

// Select PDF files
ipcMain.handle('pdf:select-files', async (event, options = {}) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: options.title || 'Select PDF Files',
    filters: [
      { name: 'PDF Documents', extensions: ['pdf'] }
    ],
    properties: options.multi ? ['openFile', 'multiSelections'] : ['openFile']
  });

  if (result.canceled) {
    return null;
  }
  
  return result.filePaths;
});

// Select save path for saving PDF outputs
ipcMain.handle('pdf:select-save-path', async (event, options = {}) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: options.title || 'Save PDF File',
    defaultPath: options.defaultPath || 'document_edited.pdf',
    filters: [
      { name: 'PDF Documents', extensions: ['pdf'] }
    ]
  });

  if (result.canceled) {
    return null;
  }

  return result.filePath;
});

// Select folder (for Split outputs)
ipcMain.handle('pdf:select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Output Directory',
    properties: ['openDirectory']
  });

  if (result.canceled) {
    return null;
  }

  return result.filePaths[0];
});

// Get PDF metadata (pages, size, etc.)
ipcMain.handle('pdf:get-metadata', async (event, filePath) => {
  return await pdfServices.getPDFMetadata(filePath);
});

// Read file bytes for PDFJS rendering in renderer process
ipcMain.handle('pdf:read-bytes', async (event, filePath) => {
  try {
    const bytes = fs.readFileSync(filePath);
    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  } catch (err) {
    throw new Error(`Could not read file: ${err.message}`);
  }
});

// Merge PDFs
ipcMain.handle('pdf:merge', async (event, filePaths, outputPath, options = {}) => {
  try {
    if (!options.compressProfile || options.compressProfile === 'none') {
      return await pdfServices.mergePDFs(filePaths, outputPath);
    }
    
    // Create intermediate temp file for compression
    const tempFile = path.join(os.tmpdir(), `pdfgil_temp_merge_${Date.now()}.pdf`);
    await pdfServices.mergePDFs(filePaths, tempFile);
    
    try {
      const result = await pdfServices.compressPDF(tempFile, options.compressProfile, outputPath);
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
      return result;
    } catch (compressErr) {
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
      throw compressErr;
    }
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Split PDF
ipcMain.handle('pdf:split', async (event, filePath, options, outputPath) => {
  try {
    return await pdfServices.splitPDF(filePath, options, outputPath);
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Rotate PDF
ipcMain.handle('pdf:rotate', async (event, filePath, rotationMap, outputPath) => {
  try {
    return await pdfServices.rotatePDF(filePath, rotationMap, outputPath);
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Compress PDF
ipcMain.handle('pdf:compress', async (event, filePath, profile, outputPath) => {
  try {
    return await pdfServices.compressPDF(filePath, profile, outputPath);
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Open file with default application
ipcMain.handle('shell:open-path', async (event, filePath) => {
  try {
    await shell.openPath(filePath);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Show file in system file explorer
ipcMain.handle('shell:show-item-in-folder', async (event, filePath) => {
  try {
    shell.showItemInFolder(filePath);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});
