const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('pdfgilAPI', {
  selectFiles: (options) => ipcRenderer.invoke('pdf:select-files', options),
  selectSavePath: (options) => ipcRenderer.invoke('pdf:select-save-path', options),
  selectFolder: () => ipcRenderer.invoke('pdf:select-folder'),
  getMetadata: (filePath) => ipcRenderer.invoke('pdf:get-metadata', filePath),
  readFileBytes: (filePath) => ipcRenderer.invoke('pdf:read-bytes', filePath),

  mergePDFs: (filePaths, outputPath, options) => ipcRenderer.invoke('pdf:merge', filePaths, outputPath, options),
  splitPDF: (filePath, options, outputPath) => ipcRenderer.invoke('pdf:split', filePath, options, outputPath),
  rotatePDF: (filePath, rotationMap, outputPath) => ipcRenderer.invoke('pdf:rotate', filePath, rotationMap, outputPath),
  compressPDF: (filePath, profile, outputPath) => ipcRenderer.invoke('pdf:compress', filePath, profile, outputPath),

  openPath: (filePath) => ipcRenderer.invoke('shell:open-path', filePath),
  showItemInFolder: (filePath) => ipcRenderer.invoke('shell:show-item-in-folder', filePath),

  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  maximizeWindow: () => ipcRenderer.send('window:maximize'),
  closeWindow: () => ipcRenderer.send('window:close')
});
