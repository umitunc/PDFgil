// PDFgil Application Logic

// App States
const state = {
  mergeFiles: [],
  splitFile: null,
  rotateFile: null,
  rotateState: {}, // { pageIndex: degrees }
  compressFile: null
};

// DOM Elements
const elements = {
  // Tabs & Theme
  tabs: document.querySelectorAll('#module-tabs button'),
  sections: document.querySelectorAll('.module-section'),
  themeToggle: document.getElementById('theme-toggle'),
  themeIcon: document.getElementById('theme-icon'),
  
  // Merge Tab
  mergeDropzone: document.getElementById('merge-dropzone'),
  mergeListContainer: document.getElementById('merge-list-container'),
  mergePreviewGrid: document.getElementById('merge-preview-grid'),
  btnMergeAction: document.getElementById('btn-merge-action'),
  btnMergeClear: document.getElementById('btn-merge-clear'),
  
  // Split Tab
  splitDropzone: document.getElementById('split-dropzone'),
  splitDetailsContainer: document.getElementById('split-details-container'),
  splitFileName: document.getElementById('split-file-name'),
  splitFileMeta: document.getElementById('split-file-meta'),
  splitRangeInputWrapper: document.getElementById('split-range-input-wrapper'),
  splitRangeInput: document.getElementById('split-range'),
  btnSplitAction: document.getElementById('btn-split-action'),
  btnSplitClear: document.getElementById('btn-split-clear'),
  
  // Rotate Tab
  rotateDropzone: document.getElementById('rotate-dropzone'),
  rotateDetailsContainer: document.getElementById('rotate-details-container'),
  rotateFileName: document.getElementById('rotate-file-name'),
  rotateFileMeta: document.getElementById('rotate-file-meta'),
  rotateGallery: document.getElementById('rotate-gallery'),
  btnRotateAction: document.getElementById('btn-rotate-action'),
  btnRotateClear: document.getElementById('btn-rotate-clear'),
  
  // Compress Tab
  compressDropzone: document.getElementById('compress-dropzone'),
  compressDetailsContainer: document.getElementById('compress-details-container'),
  compressFileName: document.getElementById('compress-file-name'),
  compressFileMeta: document.getElementById('compress-file-meta'),
  btnCompressAction: document.getElementById('btn-compress-action'),
  btnCompressClear: document.getElementById('btn-compress-clear'),
  
  // Toast
  toast: document.getElementById('status-toast'),
  toastMessage: document.getElementById('toast-message'),
  toastIcon: document.getElementById('toast-icon')
};

// Initial setup
document.addEventListener('DOMContentLoaded', () => {
  setupTabs();
  setupTheme();
  setupDropzones();
  setupActions();
  setupWindowControls();
});

// --- Window Controls ---
function setupWindowControls() {
  document.getElementById('btn-win-minimize').addEventListener('click', () => {
    window.pdfgilAPI.minimizeWindow();
  });
  
  document.getElementById('btn-win-maximize').addEventListener('click', () => {
    window.pdfgilAPI.maximizeWindow();
  });
  
  document.getElementById('btn-win-close').addEventListener('click', () => {
    window.pdfgilAPI.closeWindow();
  });
}

// --- Tab Navigation ---
function setupTabs() {
  elements.tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      elements.tabs.forEach(t => t.classList.remove('active'));
      elements.sections.forEach(s => s.classList.remove('active'));
      
      tab.classList.add('active');
      const targetSection = document.getElementById(`sec-${tab.dataset.tab}`);
      if (targetSection) {
        targetSection.classList.add('active');
      }
      
      // Control Merge footer visibility when switching tabs
      const footerBar = document.getElementById('merge-footer-bar');
      if (footerBar) {
        if (tab.dataset.tab === 'merge' && state.mergeFiles.length > 0) {
          footerBar.classList.remove('d-none');
        } else {
          footerBar.classList.add('d-none');
        }
      }
    });
  });
}

// --- Theme Management ---
function setupTheme() {
  const currentTheme = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', currentTheme);
  updateThemeIcon(currentTheme);

  elements.themeToggle.addEventListener('click', () => {
    const activeTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = activeTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
  });
}

// --- Theme Icon Update ---
function updateThemeIcon(theme) {
  if (theme === 'dark') {
    elements.themeIcon.textContent = 'light_mode';
  } else {
    elements.themeIcon.textContent = 'dark_mode';
  }
}

// --- Status Toast ---
function showToast(message, type = 'info') {
  elements.toastMessage.textContent = message;
  elements.toast.className = ''; // reset classes
  
  if (type === 'success') {
    elements.toastIcon.textContent = 'check_circle';
    elements.toastIcon.style.color = 'var(--citruss-lime)';
  } else if (type === 'error') {
    elements.toastIcon.textContent = 'error';
    elements.toastIcon.style.color = 'var(--citruss-danger)';
  } else if (type === 'warning') {
    elements.toastIcon.textContent = 'warning';
    elements.toastIcon.style.color = 'var(--citruss-lemon)';
  } else {
    elements.toastIcon.textContent = 'info';
    elements.toastIcon.style.color = 'var(--citruss-orange)';
  }
  
  elements.toast.classList.remove('status-toast-hidden');
  
  if (type !== 'loading') {
    setTimeout(() => {
      elements.toast.classList.add('status-toast-hidden');
    }, 4000);
  }
}

function hideToast() {
  elements.toast.classList.add('status-toast-hidden');
}

// --- Dropzones & File Upload ---
function setupDropzones() {
  // Config pairs for each dropzone
  const configs = [
    { zone: elements.mergeDropzone, action: selectMergeFiles, type: 'merge' },
    { zone: elements.splitDropzone, action: selectSplitFile, type: 'split' },
    { zone: elements.rotateDropzone, action: selectRotateFile, type: 'rotate' },
    { zone: elements.compressDropzone, action: selectCompressFile, type: 'compress' }
  ];

  configs.forEach(({ zone, action, type }) => {
    // Click action
    zone.addEventListener('click', (e) => {
      // Don't fire if child button was clicked since we handle button directly
      if (e.target.tagName !== 'BUTTON') {
        action();
      }
    });

    // Select button inside dropzone
    const btn = zone.querySelector('button');
    if (btn) {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        action();
      });
    }

    // Drag events
    zone.addEventListener('dragover', (e) => {
      e.preventDefault();
      zone.classList.add('dragover');
    });

    zone.addEventListener('dragleave', () => {
      zone.classList.remove('dragover');
    });

    zone.addEventListener('drop', async (e) => {
      e.preventDefault();
      zone.classList.remove('dragover');
      
      const files = Array.from(e.dataTransfer.files).filter(f => f.path && f.path.endsWith('.pdf'));
      if (files.length === 0) {
        showToast('Please drag and drop PDF files only.', 'error');
        return;
      }
      
      const filePaths = files.map(f => f.path);
      handleDroppedFiles(type, filePaths);
    });
  });

  // Global window drag & drop event prevention & routing
  // Prevents Electron from loading/navigating to the PDF file (which resets/reloads the application)
  window.addEventListener('dragover', (e) => {
    e.preventDefault();
  }, false);

  window.addEventListener('drop', async (e) => {
    e.preventDefault();
    
    // Find which tab/module is currently active
    const activeTab = document.querySelector('#module-tabs button.active');
    if (!activeTab) return;
    const type = activeTab.dataset.tab;
    
    const files = Array.from(e.dataTransfer.files).filter(f => f.path && f.path.endsWith('.pdf'));
    if (files.length === 0) {
      showToast('Please drag and drop PDF files only.', 'error');
      return;
    }
    
    const filePaths = files.map(f => f.path);
    handleDroppedFiles(type, filePaths);
  }, false);
}

// Handle drops based on tab context
async function handleDroppedFiles(type, paths) {
  if (type === 'merge') {
    for (const path of paths) {
      if (!state.mergeFiles.some(f => f.path === path)) {
        state.mergeFiles.push({ path: path, rotation: 0 });
      }
    }
    renderMergeList();
  } else {
    // Single file imports
    const path = paths[0];
    if (type === 'split') {
      loadSplitFile(path);
    } else if (type === 'rotate') {
      loadRotateFile(path);
    } else if (type === 'compress') {
      loadCompressFile(path);
    }
  }
}

// Format file size
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// --- Merge Tab Logic ---
async function selectMergeFiles() {
  const filePaths = await window.pdfgilAPI.selectFiles({ title: 'Select PDF Files to Merge', multi: true });
  if (filePaths) {
    handleDroppedFiles('merge', filePaths);
  }
}

function renderMergeList() {
  const mergePrompt = document.getElementById('merge-prompt');
  const footerBar = document.getElementById('merge-footer-bar');
  
  if (state.mergeFiles.length === 0) {
    elements.mergeListContainer.classList.add('d-none');
    if (mergePrompt) mergePrompt.classList.remove('d-none');
    if (footerBar) footerBar.classList.add('d-none');
    return;
  }
  
  elements.mergeListContainer.classList.remove('d-none');
  if (mergePrompt) mergePrompt.classList.add('d-none');
  if (footerBar) footerBar.classList.remove('d-none');
  
  elements.mergePreviewGrid.innerHTML = '';
  
  state.mergeFiles.forEach((fileObj, index) => {
    const file = fileObj.path;
    const rotation = fileObj.rotation || 0;
    const filename = file.split(/[\\/]/).pop();
    const card = document.createElement('div');
    card.className = 'page-card';
    card.setAttribute('draggable', 'true');
    
    // Drag & Drop reordering logic
    card.addEventListener('dragstart', (e) => {
      card.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', index);
    });
    
    card.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    });
    
    card.addEventListener('dragenter', () => {
      card.classList.add('drag-over');
    });
    
    card.addEventListener('dragleave', () => {
      card.classList.remove('drag-over');
    });
    
    card.addEventListener('drop', (e) => {
      e.preventDefault();
      card.classList.remove('drag-over');
      const srcIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
      const targetIndex = index;
      
      if (srcIndex !== targetIndex && !isNaN(srcIndex)) {
        const draggedItem = state.mergeFiles[srcIndex];
        state.mergeFiles.splice(srcIndex, 1);
        state.mergeFiles.splice(targetIndex, 0, draggedItem);
        renderMergeList();
      }
    });
    
    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
      document.querySelectorAll('.page-card').forEach(c => c.classList.remove('drag-over'));
    });
    
    card.innerHTML = `
      <div class="page-thumbnail-container" style="pointer-events: none;">
        <canvas class="page-thumbnail-canvas rot-${rotation}" id="merge-canvas-${index}"></canvas>
      </div>
      <div class="page-number-badge" style="pointer-events: none; text-align: center; max-width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${filename}">
        ${filename}
      </div>
      <div class="file-item-actions">
        <button class="citruss-btn btn-sm btn-icon" onclick="moveMergeItem(${index}, -1)" ${index === 0 ? 'disabled' : ''} title="Move Left">
          <span class="material-symbols-rounded">arrow_back</span>
        </button>
        <button class="citruss-btn btn-sm btn-icon" onclick="rotateMergeItem(${index})" title="Rotate 90 Degrees">
          <span class="material-symbols-rounded">rotate_right</span>
        </button>
        <button class="citruss-btn btn-sm btn-icon" onclick="moveMergeItem(${index}, 1)" ${index === state.mergeFiles.length - 1 ? 'disabled' : ''} title="Move Right">
          <span class="material-symbols-rounded">arrow_forward</span>
        </button>
        <button class="citruss-btn btn-sm btn-icon btn-danger" onclick="removeMergeItem(${index})" title="Remove">
          <span class="material-symbols-rounded">close</span>
        </button>
      </div>
    `;
    elements.mergePreviewGrid.appendChild(card);
    
    // Render first page cover thumbnail async
    const canvas = document.getElementById(`merge-canvas-${index}`);
    renderPageThumbnail(file, 0, canvas);
  });
}

window.rotateMergeItem = (index) => {
  if (index >= 0 && index < state.mergeFiles.length) {
    const fileObj = state.mergeFiles[index];
    fileObj.rotation = (fileObj.rotation + 90) % 360;
    renderMergeList();
  }
};

window.moveMergeItem = (index, direction) => {
  const newIndex = index + direction;
  if (newIndex >= 0 && newIndex < state.mergeFiles.length) {
    const temp = state.mergeFiles[index];
    state.mergeFiles[index] = state.mergeFiles[newIndex];
    state.mergeFiles[newIndex] = temp;
    renderMergeList();
  }
};

window.removeMergeItem = (index) => {
  if (index >= 0 && index < state.mergeFiles.length) {
    state.mergeFiles.splice(index, 1);
    renderMergeList();
  }
};

// --- Split Tab Logic ---
async function selectSplitFile() {
  const filePaths = await window.pdfgilAPI.selectFiles({ title: 'Select PDF File to Split', multi: false });
  if (filePaths && filePaths.length > 0) {
    loadSplitFile(filePaths[0]);
  }
}

async function loadSplitFile(filePath) {
  try {
    showToast('Loading file...', 'loading');
    const metadata = await window.pdfgilAPI.getMetadata(filePath);
    state.splitFile = filePath;
    
    elements.splitFileName.textContent = filePath.split(/[\\/]/).pop();
    elements.splitFileMeta.textContent = `${metadata.pageCount} pages - ${formatBytes(metadata.sizeBytes)}`;
    
    elements.splitDetailsContainer.classList.remove('d-none');
    elements.splitDropzone.classList.add('d-none');
    hideToast();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// --- Rotate Tab Logic ---
async function selectRotateFile() {
  const filePaths = await window.pdfgilAPI.selectFiles({ title: 'Select PDF File to Rotate', multi: false });
  if (filePaths && filePaths.length > 0) {
    loadRotateFile(filePaths[0]);
  }
}

async function loadRotateFile(filePath) {
  try {
    showToast('Preparing previews...', 'loading');
    const metadata = await window.pdfgilAPI.getMetadata(filePath);
    state.rotateFile = filePath;
    state.rotateState = {}; // reset
    
    elements.rotateFileName.textContent = filePath.split(/[\\/]/).pop();
    elements.rotateFileMeta.textContent = `${metadata.pageCount} pages`;
    
    elements.rotateGallery.innerHTML = '';
    elements.rotateDetailsContainer.classList.remove('d-none');
    elements.rotateDropzone.classList.add('d-none');
    
    // Clear preview cache to free memory
    clearPdfCache();
    
    // Create card element for each page
    for (let i = 0; i < metadata.pageCount; i++) {
      state.rotateState[i] = 0; // standard rotation is 0
      
      const card = document.createElement('div');
      card.className = 'page-card';
      card.innerHTML = `
        <div class="page-thumbnail-container">
          <canvas class="page-thumbnail-canvas rot-0" id="canvas-page-${i}"></canvas>
        </div>
        <div class="page-number-badge">Page ${i + 1}</div>
        <button class="citruss-btn btn-sm btn-icon" onclick="rotatePage(${i})" title="Rotate 90 Degrees">
          <span class="material-symbols-rounded">rotate_right</span>
        </button>
      `;
      elements.rotateGallery.appendChild(card);
      
      // Render the thumbnail async
      const canvas = document.getElementById(`canvas-page-${i}`);
      renderPageThumbnail(filePath, i, canvas);
    }
    
    hideToast();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

window.rotatePage = (pageIndex) => {
  const currentAngle = state.rotateState[pageIndex] || 0;
  const newAngle = (currentAngle + 90) % 360;
  state.rotateState[pageIndex] = newAngle;
  
  const canvas = document.getElementById(`canvas-page-${pageIndex}`);
  if (canvas) {
    // Reset rotations classes
    canvas.className = 'page-thumbnail-canvas';
    canvas.classList.add(`rot-${newAngle}`);
  }
};

// --- Compress Tab Logic ---
async function selectCompressFile() {
  const filePaths = await window.pdfgilAPI.selectFiles({ title: 'Select PDF File to Compress', multi: false });
  if (filePaths && filePaths.length > 0) {
    loadCompressFile(filePaths[0]);
  }
}

async function loadCompressFile(filePath) {
  try {
    showToast('Loading file...', 'loading');
    const metadata = await window.pdfgilAPI.getMetadata(filePath);
    state.compressFile = filePath;
    
    elements.compressFileName.textContent = filePath.split(/[\\/]/).pop();
    elements.compressFileMeta.textContent = `Original Size: ${formatBytes(metadata.sizeBytes)}`;
    
    elements.compressDetailsContainer.classList.remove('d-none');
    elements.compressDropzone.classList.add('d-none');
    hideToast();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// --- Action Executions ---
function setupActions() {
  // Merge Action
  elements.btnMergeAction.addEventListener('click', async () => {
    if (state.mergeFiles.length < 2) {
      showToast('You must select at least 2 files to merge.', 'error');
      return;
    }
    
    const profile = document.querySelector('input[name="merge-compress-profile"]:checked').value;
    
    const outputPath = await window.pdfgilAPI.selectSavePath({
      title: 'Save Merged PDF file',
      defaultPath: 'merged_document.pdf'
    });
    
    if (!outputPath) return;
    
    showToast('Merging PDF files...', 'loading');
    const result = await window.pdfgilAPI.mergePDFs(state.mergeFiles, outputPath, { compressProfile: profile });
    
    if (result.success) {
      const msg = result.fallback
        ? `Merge completed! ${result.message}`
        : 'Merge process completed successfully!';
      showToast(msg, result.fallback ? 'warning' : 'success');
      // Reset list
      state.mergeFiles = [];
      renderMergeList();
    } else {
      showToast(`Error occurred: ${result.error}`, 'error');
    }
  });

  elements.btnMergeClear.addEventListener('click', () => {
    state.mergeFiles = [];
    renderMergeList();
  });

  // Split Action
  const splitRadios = document.querySelectorAll('input[name="split-mode"]');
  splitRadios.forEach(radio => {
    radio.addEventListener('change', () => {
      if (radio.value === 'range') {
        elements.splitRangeInputWrapper.classList.remove('d-none');
      } else {
        elements.splitRangeInputWrapper.classList.add('d-none');
      }
    });
  });

  elements.btnSplitAction.addEventListener('click', async () => {
    if (!state.splitFile) return;
    
    const mode = document.querySelector('input[name="split-mode"]:checked').value;
    let options = { type: mode };
    let outputPath = '';
    
    if (mode === 'range') {
      const rangeVal = elements.splitRangeInput.value.trim();
      if (!rangeVal) {
        showToast('Please enter the page range (e.g. 2-5).', 'error');
        return;
      }
      options.range = rangeVal;
      
      outputPath = await window.pdfgilAPI.selectSavePath({
        title: 'Save split pages',
        defaultPath: 'split_document.pdf'
      });
      if (!outputPath) return;
    } else {
      // Split all pages individually, output is to a directory
      outputPath = await window.pdfgilAPI.selectFolder();
      if (!outputPath) return;
    }
    
    showToast('Splitting PDF...', 'loading');
    const result = await window.pdfgilAPI.splitPDF(state.splitFile, options, outputPath);
    
    if (result.success) {
      showToast('Split process completed successfully!', 'success');
      clearSplitSelection();
    } else {
      showToast(`Error occurred: ${result.error}`, 'error');
    }
  });

  elements.btnSplitClear.addEventListener('click', clearSplitSelection);
  
  function clearSplitSelection() {
    state.splitFile = null;
    elements.splitDetailsContainer.classList.add('d-none');
    elements.splitDropzone.classList.remove('d-none');
    elements.splitRangeInput.value = '';
  }

  // Rotate Action
  elements.btnRotateAction.addEventListener('click', async () => {
    if (!state.rotateFile) return;
    
    const outputPath = await window.pdfgilAPI.selectSavePath({
      title: 'Save rotated PDF file',
      defaultPath: 'rotated_document.pdf'
    });
    
    if (!outputPath) return;
    
    showToast('Applying rotations...', 'loading');
    const result = await window.pdfgilAPI.rotatePDF(state.rotateFile, state.rotateState, outputPath);
    
    if (result.success) {
      showToast('Rotations saved successfully!', 'success');
      clearRotateSelection();
    } else {
      showToast(`Error occurred: ${result.error}`, 'error');
    }
  });

  elements.btnRotateClear.addEventListener('click', clearRotateSelection);
  
  function clearRotateSelection() {
    state.rotateFile = null;
    state.rotateState = {};
    elements.rotateDetailsContainer.classList.add('d-none');
    elements.rotateDropzone.classList.remove('d-none');
    elements.rotateGallery.innerHTML = '';
    clearPdfCache();
  }

  // Compress Action
  elements.btnCompressAction.addEventListener('click', async () => {
    if (!state.compressFile) return;
    
    const profile = document.querySelector('input[name="compress-profile"]:checked').value;
    
    const outputPath = await window.pdfgilAPI.selectSavePath({
      title: 'Save compressed PDF file',
      defaultPath: 'compressed_document.pdf'
    });
    
    if (!outputPath) return;
    
    showToast('Compressing PDF...', 'loading');
    const result = await window.pdfgilAPI.compressPDF(state.compressFile, profile, outputPath);
    
    if (result.success) {
      const msg = result.fallback 
        ? `${result.message}` 
        : 'Compression process completed successfully!';
      showToast(msg, result.fallback ? 'warning' : 'success');
      clearCompressSelection();
    } else {
      showToast(`Error occurred: ${result.error}`, 'error');
    }
  });

  elements.btnCompressClear.addEventListener('click', clearCompressSelection);
  
  function clearCompressSelection() {
    state.compressFile = null;
    elements.compressDetailsContainer.classList.add('d-none');
    elements.compressDropzone.classList.remove('d-none');
  }
}
