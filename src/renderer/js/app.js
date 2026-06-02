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
});

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
        showToast('Lütfen sadece PDF dosyalarını sürükleyin.', 'error');
        return;
      }
      
      const filePaths = files.map(f => f.path);
      handleDroppedFiles(type, filePaths);
    });
  });
}

// Handle drops based on tab context
async function handleDroppedFiles(type, paths) {
  if (type === 'merge') {
    for (const path of paths) {
      if (!state.mergeFiles.includes(path)) {
        state.mergeFiles.push(path);
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
  const filePaths = await window.pdfgilAPI.selectFiles({ title: 'Birleştirilecek PDF Dosyalarını Seçin', multi: true });
  if (filePaths) {
    handleDroppedFiles('merge', filePaths);
  }
}

function renderMergeList() {
  if (state.mergeFiles.length === 0) {
    elements.mergeListContainer.classList.add('d-none');
    return;
  }
  
  elements.mergeListContainer.classList.remove('d-none');
  elements.mergePreviewGrid.innerHTML = '';
  
  state.mergeFiles.forEach((file, index) => {
    const filename = file.split(/[\\/]/).pop();
    const card = document.createElement('div');
    card.className = 'page-card';
    card.innerHTML = `
      <div class="page-thumbnail-container">
        <canvas class="page-thumbnail-canvas rot-0" id="merge-canvas-${index}"></canvas>
      </div>
      <div class="page-number-badge" style="text-align: center; max-width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${filename}">
        ${filename}
      </div>
      <div class="file-item-actions">
        <button class="citruss-btn btn-sm btn-icon" onclick="moveMergeItem(${index}, -1)" ${index === 0 ? 'disabled' : ''} title="Sola Taşı">
          <span class="material-symbols-rounded">arrow_back</span>
        </button>
        <button class="citruss-btn btn-sm btn-icon" onclick="moveMergeItem(${index}, 1)" ${index === state.mergeFiles.length - 1 ? 'disabled' : ''} title="Sağa Taşı">
          <span class="material-symbols-rounded">arrow_forward</span>
        </button>
        <button class="citruss-btn btn-sm btn-icon btn-danger" onclick="removeMergeItem(${index})" title="Çıkar">
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
  state.mergeFiles.splice(index, 1);
  renderMergeList();
};

// --- Split Tab Logic ---
async function selectSplitFile() {
  const filePaths = await window.pdfgilAPI.selectFiles({ title: 'Ayırılacak PDF Dosyasını Seçin', multi: false });
  if (filePaths && filePaths.length > 0) {
    loadSplitFile(filePaths[0]);
  }
}

async function loadSplitFile(filePath) {
  try {
    showToast('Dosya yükleniyor...', 'loading');
    const metadata = await window.pdfgilAPI.getMetadata(filePath);
    state.splitFile = filePath;
    
    elements.splitFileName.textContent = filePath.split(/[\\/]/).pop();
    elements.splitFileMeta.textContent = `${metadata.pageCount} sayfa - ${formatBytes(metadata.sizeBytes)}`;
    
    elements.splitDetailsContainer.classList.remove('d-none');
    elements.splitDropzone.classList.add('d-none');
    hideToast();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// --- Rotate Tab Logic ---
async function selectRotateFile() {
  const filePaths = await window.pdfgilAPI.selectFiles({ title: 'Döndürülecek PDF Dosyasını Seçin', multi: false });
  if (filePaths && filePaths.length > 0) {
    loadRotateFile(filePaths[0]);
  }
}

async function loadRotateFile(filePath) {
  try {
    showToast('Önizlemeler hazırlanıyor...', 'loading');
    const metadata = await window.pdfgilAPI.getMetadata(filePath);
    state.rotateFile = filePath;
    state.rotateState = {}; // reset
    
    elements.rotateFileName.textContent = filePath.split(/[\\/]/).pop();
    elements.rotateFileMeta.textContent = `${metadata.pageCount} sayfa`;
    
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
        <div class="page-number-badge">Sayfa ${i + 1}</div>
        <button class="citruss-btn btn-sm btn-icon" onclick="rotatePage(${i})" title="90 Derece Döndür">
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
  const filePaths = await window.pdfgilAPI.selectFiles({ title: 'Sıkıştırılacak PDF Dosyasını Seçin', multi: false });
  if (filePaths && filePaths.length > 0) {
    loadCompressFile(filePaths[0]);
  }
}

async function loadCompressFile(filePath) {
  try {
    showToast('Dosya yükleniyor...', 'loading');
    const metadata = await window.pdfgilAPI.getMetadata(filePath);
    state.compressFile = filePath;
    
    elements.compressFileName.textContent = filePath.split(/[\\/]/).pop();
    elements.compressFileMeta.textContent = `Orijinal Boyut: ${formatBytes(metadata.sizeBytes)}`;
    
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
      showToast('Birleştirmek için en az 2 dosya seçmelisiniz.', 'error');
      return;
    }
    
    const profile = document.querySelector('input[name="merge-compress-profile"]:checked').value;
    
    const outputPath = await window.pdfgilAPI.selectSavePath({
      title: 'Birleştirilen PDF dosyasını kaydet',
      defaultPath: 'birlesmis_belge.pdf'
    });
    
    if (!outputPath) return;
    
    showToast('PDF dosyaları birleştiriliyor...', 'loading');
    const result = await window.pdfgilAPI.mergePDFs(state.mergeFiles, outputPath, { compressProfile: profile });
    
    if (result.success) {
      const msg = result.fallback
        ? `Birleştirme tamamlandı! ${result.message}`
        : 'Birleştirme işlemi başarıyla tamamlandı!';
      showToast(msg, result.fallback ? 'warning' : 'success');
      // Reset list
      state.mergeFiles = [];
      renderMergeList();
    } else {
      showToast(`Hata oluştu: ${result.error}`, 'error');
    }
  });

  elements.btnMergeClear.addEventListener('click', () => {
    state.mergeFiles = [];
    renderMergeList();
  });

  // Split Action
  // Radios toggling the custom range display
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
        showToast('Lütfen sayfa aralığını girin (örn: 2-5).', 'error');
        return;
      }
      options.range = rangeVal;
      
      outputPath = await window.pdfgilAPI.selectSavePath({
        title: 'Ayrılan sayfaları kaydet',
        defaultPath: 'ayrilmis_belge.pdf'
      });
      if (!outputPath) return;
    } else {
      // Split all pages individually, output is to a directory
      outputPath = await window.pdfgilAPI.selectFolder();
      if (!outputPath) return;
    }
    
    showToast('PDF ayrılıyor...', 'loading');
    const result = await window.pdfgilAPI.splitPDF(state.splitFile, options, outputPath);
    
    if (result.success) {
      showToast('Ayırma işlemi başarıyla tamamlandı!', 'success');
      clearSplitSelection();
    } else {
      showToast(`Hata oluştu: ${result.error}`, 'error');
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
      title: 'Döndürülen PDF dosyasını kaydet',
      defaultPath: 'dondurulmus_belge.pdf'
    });
    
    if (!outputPath) return;
    
    showToast('Döndürme işlemi uygulanıyor...', 'loading');
    const result = await window.pdfgilAPI.rotatePDF(state.rotateFile, state.rotateState, outputPath);
    
    if (result.success) {
      showToast('Döndürme işlemi başarıyla tamamlandı!', 'success');
      clearRotateSelection();
    } else {
      showToast(`Hata oluştu: ${result.error}`, 'error');
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
      title: 'Sıkıştırılmış PDF dosyasını kaydet',
      defaultPath: 'sikistirilmis_belge.pdf'
    });
    
    if (!outputPath) return;
    
    showToast('PDF sıkıştırılıyor...', 'loading');
    const result = await window.pdfgilAPI.compressPDF(state.compressFile, profile, outputPath);
    
    if (result.success) {
      const msg = result.fallback 
        ? `${result.message}` 
        : 'Sıkıştırma işlemi başarıyla tamamlandı!';
      showToast(msg, result.fallback ? 'warning' : 'success');
      clearCompressSelection();
    } else {
      showToast(`Hata oluştu: ${result.error}`, 'error');
    }
  });

  elements.btnCompressClear.addEventListener('click', clearCompressSelection);
  
  function clearCompressSelection() {
    state.compressFile = null;
    elements.compressDetailsContainer.classList.add('d-none');
    elements.compressDropzone.classList.remove('d-none');
  }
}
