// PDFgil Application Logic — v2.0

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
  setupLightbox();
  setupConfirmModal();
  setupKeyboardShortcuts();

  const addMoreBtn = document.getElementById('btn-merge-add-more');
  if (addMoreBtn) {
    addMoreBtn.addEventListener('click', selectMergeFiles);
  }
});

// ─────────────────────────────────────────────
// WINDOW CONTROLS
// ─────────────────────────────────────────────
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

// ─────────────────────────────────────────────
// TAB NAVIGATION
// ─────────────────────────────────────────────
function setupTabs() {
  elements.tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      elements.tabs.forEach(t => t.classList.remove('active'));
      elements.sections.forEach(s => s.classList.remove('active'));

      tab.classList.add('active');
      const targetSection = document.getElementById(`sec-${tab.dataset.tab}`);
      if (targetSection) targetSection.classList.add('active');

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

// ─────────────────────────────────────────────
// THEME
// ─────────────────────────────────────────────
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
  elements.themeIcon.textContent = theme === 'dark' ? 'light_mode' : 'dark_mode';
}

// ─────────────────────────────────────────────
// STATUS TOAST
// ─────────────────────────────────────────────
function showToast(message, type = 'info') {
  elements.toastMessage.textContent = message;
  elements.toast.className = '';

  const icons = { success: 'check_circle', error: 'error', warning: 'warning', loading: 'hourglass_top', info: 'info' };
  const colors = { success: 'var(--citruss-lime)', error: 'var(--citruss-danger)', warning: 'var(--citruss-lemon)', loading: 'var(--citruss-orange)', info: 'var(--citruss-orange)' };

  elements.toastIcon.textContent = icons[type] || 'info';
  elements.toastIcon.style.color = colors[type] || colors.info;
  elements.toast.classList.remove('status-toast-hidden');

  if (type !== 'loading') {
    setTimeout(() => elements.toast.classList.add('status-toast-hidden'), 4000);
  }
}

function hideToast() {
  elements.toast.classList.add('status-toast-hidden');
}

// ─────────────────────────────────────────────
// BUTTON PROCESSING STATE
// ─────────────────────────────────────────────
function setProcessing(btn, isProcessing, originalHTML) {
  if (isProcessing) {
    btn._originalHTML = btn.innerHTML;
    btn.innerHTML = `<span class="btn-spinner"></span> Processing...`;
    btn.classList.add('btn-processing');
  } else {
    btn.innerHTML = btn._originalHTML || originalHTML || btn.innerHTML;
    btn.classList.remove('btn-processing');
  }
}

// ─────────────────────────────────────────────
// CONFIRM MODAL
// ─────────────────────────────────────────────
let confirmCallback = null;

function setupConfirmModal() {
  document.getElementById('confirm-ok').addEventListener('click', () => {
    const cb = confirmCallback; // capture before closeConfirm nullifies it
    closeConfirm();
    if (typeof cb === 'function') cb();
  });
  document.getElementById('confirm-cancel').addEventListener('click', closeConfirm);
  document.getElementById('confirm-backdrop').addEventListener('click', closeConfirm);
}

function showConfirm(title, msg, onConfirm) {
  document.getElementById('confirm-title').textContent = title;
  document.getElementById('confirm-msg').textContent = msg;
  confirmCallback = onConfirm;
  document.getElementById('confirm-modal').classList.remove('d-none');
}

function closeConfirm() {
  document.getElementById('confirm-modal').classList.add('d-none');
  confirmCallback = null;
}

// ─────────────────────────────────────────────
// SUCCESS RESULT CARD
// ─────────────────────────────────────────────
function showResultCard(outputPath, label) {
  const container = document.getElementById('result-card-container');
  if (!container) return;

  const fileName = outputPath.split(/[\\/]/).pop();
  const fileSize = getResultFileSize(outputPath);

  container.innerHTML = `
    <div class="result-card">
      <span class="material-symbols-rounded result-icon">check_circle</span>
      <div class="result-info">
        <div class="result-name" title="${outputPath}">${fileName}</div>
        <div class="result-meta">${label}${fileSize ? ' — ' + fileSize : ''}</div>
      </div>
      <div class="result-actions">
        <button class="citruss-btn btn-sm btn-success" onclick="openResultFile('${outputPath.replace(/\\/g, '\\\\')}')">
          <span class="material-symbols-rounded">open_in_new</span> Open
        </button>
        <button class="citruss-btn btn-sm" onclick="showResultInFolder('${outputPath.replace(/\\/g, '\\\\')}')">
          <span class="material-symbols-rounded">folder_open</span> Folder
        </button>
        <button class="citruss-btn btn-sm btn-icon" onclick="hideResultCard()" title="Dismiss">
          <span class="material-symbols-rounded">close</span>
        </button>
      </div>
    </div>
  `;
  container.classList.remove('d-none');
}

function getResultFileSize(outputPath) {
  // We don't have sync fs access in renderer — we'll just show a checkmark.
  return '';
}

window.hideResultCard = () => {
  const container = document.getElementById('result-card-container');
  if (container) {
    container.classList.add('d-none');
    container.innerHTML = '';
  }
};

window.openResultFile = async (filePath) => {
  try { await window.pdfgilAPI.openPath(filePath); } catch(e) { /* no-op */ }
};

window.showResultInFolder = async (filePath) => {
  try { await window.pdfgilAPI.showItemInFolder(filePath); } catch(e) { /* no-op */ }
};

// ─────────────────────────────────────────────
// KEYBOARD SHORTCUTS
// ─────────────────────────────────────────────
function setupKeyboardShortcuts() {
  window.addEventListener('keydown', (e) => {
    // Don't trigger if typing in an input/textarea
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    const activeTab = document.querySelector('#module-tabs button.active');
    if (!activeTab) return;
    const tab = activeTab.dataset.tab;

    // Ctrl+O — Open / select file
    if (e.ctrlKey && e.key === 'o') {
      e.preventDefault();
      if (tab === 'merge') selectMergeFiles();
      else if (tab === 'split') selectSplitFile();
      else if (tab === 'rotate') selectRotateFile();
      else if (tab === 'compress') selectCompressFile();
    }

    // Ctrl+Enter — Execute main action
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault();
      if (tab === 'merge' && elements.btnMergeAction) elements.btnMergeAction.click();
      else if (tab === 'split' && elements.btnSplitAction) elements.btnSplitAction.click();
      else if (tab === 'rotate' && elements.btnRotateAction) elements.btnRotateAction.click();
      else if (tab === 'compress' && elements.btnCompressAction) elements.btnCompressAction.click();
    }

    // Delete — Clear current module
    if (e.key === 'Delete') {
      e.preventDefault();
      if (tab === 'merge' && elements.btnMergeClear) elements.btnMergeClear.click();
      else if (tab === 'split' && elements.btnSplitClear) elements.btnSplitClear.click();
      else if (tab === 'rotate' && elements.btnRotateClear) elements.btnRotateClear.click();
      else if (tab === 'compress' && elements.btnCompressClear) elements.btnCompressClear.click();
    }
  });
}

// ─────────────────────────────────────────────
// DROPZONES & FILE UPLOAD
// ─────────────────────────────────────────────
function setupDropzones() {
  const configs = [
    { zone: elements.mergeDropzone, action: selectMergeFiles, type: 'merge' },
    { zone: elements.splitDropzone, action: selectSplitFile, type: 'split' },
    { zone: elements.rotateDropzone, action: selectRotateFile, type: 'rotate' },
    { zone: elements.compressDropzone, action: selectCompressFile, type: 'compress' }
  ];

  configs.forEach(({ zone, action, type }) => {
    zone.addEventListener('click', (e) => {
      if (e.target.tagName !== 'BUTTON') action();
    });

    const btn = zone.querySelector('button');
    if (btn) {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        action();
      });
    }

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
      handleDroppedFiles(type, files.map(f => f.path));
    });
  });

  // Global drag prevention
  window.addEventListener('dragover', (e) => e.preventDefault(), false);
  window.addEventListener('drop', async (e) => {
    e.preventDefault();
    const activeTab = document.querySelector('#module-tabs button.active');
    if (!activeTab) return;
    const files = Array.from(e.dataTransfer.files).filter(f => f.path && f.path.endsWith('.pdf'));
    if (files.length === 0) {
      showToast('Please drag and drop PDF files only.', 'error');
      return;
    }
    handleDroppedFiles(activeTab.dataset.tab, files.map(f => f.path));
  }, false);

  // Prevent click bubbling from list container to dropzone
  if (elements.mergeListContainer) {
    elements.mergeListContainer.addEventListener('click', (e) => e.stopPropagation());
  }
}

async function handleDroppedFiles(type, paths) {
  if (type === 'merge') {
    for (const path of paths) {
      if (!state.mergeFiles.some(f => f.path === path)) {
        state.mergeFiles.push({ path, rotation: 0 });
      }
    }
    renderMergeList();
  } else {
    const path = paths[0];
    if (type === 'split') loadSplitFile(path);
    else if (type === 'rotate') loadRotateFile(path);
    else if (type === 'compress') loadCompressFile(path);
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// ─────────────────────────────────────────────
// MERGE TAB
// ─────────────────────────────────────────────
async function selectMergeFiles() {
  const filePaths = await window.pdfgilAPI.selectFiles({ title: 'Select PDF Files to Merge', multi: true });
  if (filePaths) handleDroppedFiles('merge', filePaths);
}

function renderMergeList() {
  const mergePrompt = document.getElementById('merge-prompt');
  const footerBar = document.getElementById('merge-footer-bar');
  const secMerge = document.getElementById('sec-merge');
  const addMoreBtn = document.getElementById('btn-merge-add-more');
  const countBadge = document.getElementById('merge-file-count');
  const countText = document.getElementById('merge-file-count-text');
  const kbdHint = document.getElementById('merge-kbd-hint');

  if (state.mergeFiles.length === 0) {
    if (secMerge) secMerge.classList.remove('has-footer');
    elements.mergeDropzone.classList.remove('has-files');
    elements.mergeListContainer.classList.add('d-none');
    if (mergePrompt) mergePrompt.classList.remove('d-none');
    if (footerBar) footerBar.classList.add('d-none');
    if (addMoreBtn) addMoreBtn.classList.add('d-none');
    if (countBadge) countBadge.classList.add('d-none');
    if (kbdHint) kbdHint.classList.add('d-none');
    window.hideResultCard();
    return;
  }

  if (secMerge) secMerge.classList.add('has-footer');
  elements.mergeDropzone.classList.add('has-files');
  elements.mergeListContainer.classList.remove('d-none');
  if (mergePrompt) mergePrompt.classList.add('d-none');
  if (footerBar) footerBar.classList.remove('d-none');
  if (addMoreBtn) addMoreBtn.classList.remove('d-none');

  // Update file count badge
  if (countBadge && countText) {
    countBadge.classList.remove('d-none');
    const n = state.mergeFiles.length;
    countText.textContent = `${n} file${n !== 1 ? 's' : ''}`;
    // Re-trigger badge pop animation
    countBadge.style.animation = 'none';
    countBadge.offsetHeight; // reflow
    countBadge.style.animation = '';
  }
  if (kbdHint) kbdHint.classList.remove('d-none');

  elements.mergePreviewGrid.innerHTML = '';

  state.mergeFiles.forEach((fileObj, index) => {
    const file = fileObj.path;
    const rotation = fileObj.rotation || 0;
    const filename = file.split(/[\\/]/).pop();
    const card = document.createElement('div');
    card.className = 'page-card';
    card.setAttribute('draggable', 'true');

    // Drag & Drop reordering
    card.addEventListener('dragstart', (e) => {
      card.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', index);
    });

    card.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    });

    card.addEventListener('dragenter', () => card.classList.add('drag-over'));
    card.addEventListener('dragleave', () => card.classList.remove('drag-over'));

    card.addEventListener('drop', (e) => {
      e.preventDefault();
      card.classList.remove('drag-over');
      const srcIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
      if (srcIndex !== index && !isNaN(srcIndex)) {
        const draggedItem = state.mergeFiles[srcIndex];
        state.mergeFiles.splice(srcIndex, 1);
        state.mergeFiles.splice(index, 0, draggedItem);
        renderMergeList();
      }
    });

    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
      document.querySelectorAll('.page-card').forEach(c => c.classList.remove('drag-over'));
    });

    card.innerHTML = `
      <div class="page-thumbnail-container" onclick="openLightbox('${file.replace(/\\/g, '\\\\')}', 0, '${filename}')" style="cursor: pointer;">
        <canvas class="page-thumbnail-canvas rot-${rotation}" id="merge-canvas-${index}"></canvas>
      </div>
      <div class="page-number-badge" style="pointer-events: none; text-align: center; max-width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${filename}">
        ${filename}
      </div>
      <div class="file-item-actions">
        <button class="citruss-btn btn-sm btn-icon" onclick="moveMergeItem(${index}, -1)" ${index === 0 ? 'disabled' : ''} title="Move Left">
          <span class="material-symbols-rounded">arrow_back</span>
        </button>
        <button class="citruss-btn btn-sm btn-icon" id="rotate-btn-${index}" onclick="rotateMergeItem(${index}, this)" title="Rotate 90°">
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

    const canvas = document.getElementById(`merge-canvas-${index}`);
    renderPageThumbnail(file, 0, canvas);
  });
}

window.rotateMergeItem = (index, btn) => {
  if (index >= 0 && index < state.mergeFiles.length) {
    // Play spin animation on the button
    if (btn) {
      btn.classList.add('rotating');
      setTimeout(() => btn.classList.remove('rotating'), 350);
    }
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

// ─────────────────────────────────────────────
// SPLIT TAB
// ─────────────────────────────────────────────
async function selectSplitFile() {
  const filePaths = await window.pdfgilAPI.selectFiles({ title: 'Select PDF File to Split', multi: false });
  if (filePaths && filePaths.length > 0) loadSplitFile(filePaths[0]);
}

async function loadSplitFile(filePath) {
  try {
    showToast('Loading file...', 'loading');
    const metadata = await window.pdfgilAPI.getMetadata(filePath);
    state.splitFile = filePath;
    elements.splitFileName.textContent = filePath.split(/[\\/]/).pop();
    elements.splitFileMeta.textContent = `${metadata.pageCount} pages — ${formatBytes(metadata.sizeBytes)}`;
    elements.splitDetailsContainer.classList.remove('d-none');
    elements.splitDropzone.classList.add('d-none');
    hideToast();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ─────────────────────────────────────────────
// ROTATE TAB
// ─────────────────────────────────────────────
async function selectRotateFile() {
  const filePaths = await window.pdfgilAPI.selectFiles({ title: 'Select PDF File to Rotate', multi: false });
  if (filePaths && filePaths.length > 0) loadRotateFile(filePaths[0]);
}

async function loadRotateFile(filePath) {
  try {
    showToast('Preparing previews...', 'loading');
    const metadata = await window.pdfgilAPI.getMetadata(filePath);
    state.rotateFile = filePath;
    state.rotateState = {};
    elements.rotateFileName.textContent = filePath.split(/[\\/]/).pop();
    elements.rotateFileMeta.textContent = `${metadata.pageCount} pages`;
    elements.rotateGallery.innerHTML = '';
    elements.rotateDetailsContainer.classList.remove('d-none');
    elements.rotateDropzone.classList.add('d-none');
    clearPdfCache();

    for (let i = 0; i < metadata.pageCount; i++) {
      state.rotateState[i] = 0;

      const card = document.createElement('div');
      card.className = 'page-card';
      card.innerHTML = `
        <div class="page-thumbnail-container" onclick="openLightbox('${filePath.replace(/\\/g, '\\\\')}', ${i}, 'Page ${i + 1}')" style="cursor: pointer;">
          <canvas class="page-thumbnail-canvas rot-0" id="canvas-page-${i}"></canvas>
        </div>
        <div class="page-number-badge">Page ${i + 1}</div>
        <div class="file-item-actions">
          <button class="citruss-btn btn-sm btn-icon" id="rotate-page-btn-${i}" onclick="rotatePage(${i}, this)" title="Rotate 90°">
            <span class="material-symbols-rounded">rotate_right</span>
          </button>
        </div>
      `;
      elements.rotateGallery.appendChild(card);

      const canvas = document.getElementById(`canvas-page-${i}`);
      renderPageThumbnail(filePath, i, canvas);
    }

    hideToast();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

window.rotatePage = (pageIndex, btn) => {
  const currentAngle = state.rotateState[pageIndex] || 0;
  const newAngle = (currentAngle + 90) % 360;
  state.rotateState[pageIndex] = newAngle;

  const canvas = document.getElementById(`canvas-page-${pageIndex}`);
  if (canvas) {
    canvas.className = 'page-thumbnail-canvas';
    canvas.classList.add(`rot-${newAngle}`);
  }

  // Spin animation on rotate button
  if (btn) {
    btn.classList.add('rotating');
    setTimeout(() => btn.classList.remove('rotating'), 350);
  }
};

// ─────────────────────────────────────────────
// COMPRESS TAB
// ─────────────────────────────────────────────
async function selectCompressFile() {
  const filePaths = await window.pdfgilAPI.selectFiles({ title: 'Select PDF File to Compress', multi: false });
  if (filePaths && filePaths.length > 0) loadCompressFile(filePaths[0]);
}

async function loadCompressFile(filePath) {
  try {
    showToast('Loading file...', 'loading');
    const metadata = await window.pdfgilAPI.getMetadata(filePath);
    state.compressFile = filePath;
    state.compressOriginalSize = metadata.sizeBytes;
    elements.compressFileName.textContent = filePath.split(/[\\/]/).pop();
    elements.compressFileMeta.textContent = `Original Size: ${formatBytes(metadata.sizeBytes)}`;
    elements.compressDetailsContainer.classList.remove('d-none');
    elements.compressDropzone.classList.add('d-none');
    hideToast();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ─────────────────────────────────────────────
// ACTIONS
// ─────────────────────────────────────────────
function setupActions() {
  // ── Merge ──
  elements.btnMergeAction.addEventListener('click', async () => {
    if (state.mergeFiles.length < 2) {
      showToast('You must select at least 2 files to merge.', 'error');
      return;
    }

    const profile = document.getElementById('merge-compress-profile').value;
    const outputPath = await window.pdfgilAPI.selectSavePath({
      title: 'Save Merged PDF file',
      defaultPath: 'merged_document.pdf'
    });
    if (!outputPath) return;

    setProcessing(elements.btnMergeAction, true);
    showToast('Merging PDF files...', 'loading');

    const progressModal = showProgressModal('Merging PDFs', 'Please wait while we merge your documents...');

    const result = await window.pdfgilAPI.mergePDFs(state.mergeFiles, outputPath, { compressProfile: profile });
    setProcessing(elements.btnMergeAction, false);

    if (progressModal) progressModal.remove();

    if (result.success) {
      let fileSizeStr = '';
      try {
        const metadata = await window.pdfgilAPI.getMetadata(outputPath);
        fileSizeStr = ` (Size: ${formatBytes(metadata.sizeBytes)})`;
      } catch (err) {
        console.error(err);
      }

      const msg = result.fallback ? `Merge completed! ${result.message}` : 'Merge completed successfully!';
      showToast(msg + fileSizeStr, result.fallback ? 'warning' : 'success');
      
      showCustomResultModal(
        result.fallback ? 'Merge Completed with Warnings' : 'Merge Completed',
        msg + fileSizeStr,
        result.fallback ? 'warning' : 'success',
        outputPath
      );

      state.mergeFiles = [];
      renderMergeList();
      showResultCard(outputPath, 'Merged PDF saved');
    } else {
      showToast(`Error: ${result.error}`, 'error');
      if (typeof CitruSS !== 'undefined' && CitruSS.fire) {
        CitruSS.fire({ title: 'Error', text: result.error, icon: 'error' });
      }
    }
  });

  elements.btnMergeClear.addEventListener('click', () => {
    if (state.mergeFiles.length === 0) return;
    showConfirm(
      'Clear all files?',
      `${state.mergeFiles.length} file(s) will be removed from the merge list.`,
      () => {
        state.mergeFiles = [];
        renderMergeList();
      }
    );
  });

  // ── Split ──
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
      const originalPath = state.splitFile;
      const dotIndex = originalPath.lastIndexOf('.');
      const defaultPath = dotIndex !== -1 ? originalPath.substring(0, dotIndex) + '_splitted.pdf' : originalPath + '_splitted.pdf';
      outputPath = await window.pdfgilAPI.selectSavePath({ title: 'Save split pages', defaultPath });
      if (!outputPath) return;
    } else {
      outputPath = await window.pdfgilAPI.selectFolder();
      if (!outputPath) return;
    }

    setProcessing(elements.btnSplitAction, true);
    showToast('Splitting PDF...', 'loading');

    const progressModal = showProgressModal('Splitting PDF', 'Please wait while we split your document...');

    const result = await window.pdfgilAPI.splitPDF(state.splitFile, options, outputPath);
    setProcessing(elements.btnSplitAction, false);

    if (progressModal) progressModal.remove();

    if (result.success) {
      let sizeInfo = '';
      if (mode === 'range') {
        try {
          const metadata = await window.pdfgilAPI.getMetadata(outputPath);
          sizeInfo = ` (Size: ${formatBytes(metadata.sizeBytes)})`;
        } catch (err) {
          console.error(err);
        }
      } else {
        sizeInfo = ` (${result.files ? result.files.length : 0} files created)`;
      }

      const msg = `Split completed successfully!${sizeInfo}`;
      showToast(msg, 'success');

      showCustomResultModal(
        'Split Completed',
        msg,
        'success',
        outputPath
      );

      clearSplitSelection();
    } else {
      showToast(`Error: ${result.error}`, 'error');
      if (typeof CitruSS !== 'undefined' && CitruSS.fire) {
        CitruSS.fire({ title: 'Error', text: result.error, icon: 'error' });
      }
    }
  });

  elements.btnSplitClear.addEventListener('click', () => {
    if (!state.splitFile) return;
    showConfirm('Clear selection?', 'The loaded file will be removed from Split.', clearSplitSelection);
  });

  function clearSplitSelection() {
    state.splitFile = null;
    elements.splitDetailsContainer.classList.add('d-none');
    elements.splitDropzone.classList.remove('d-none');
    elements.splitRangeInput.value = '';
  }

  // ── Rotate ──
  elements.btnRotateAction.addEventListener('click', async () => {
    if (!state.rotateFile) return;

    const originalPath = state.rotateFile;
    const dotIndex = originalPath.lastIndexOf('.');
    const defaultPath = dotIndex !== -1 ? originalPath.substring(0, dotIndex) + '_rotated.pdf' : originalPath + '_rotated.pdf';
    const outputPath = await window.pdfgilAPI.selectSavePath({
      title: 'Save rotated PDF file',
      defaultPath
    });
    if (!outputPath) return;

    setProcessing(elements.btnRotateAction, true);
    showToast('Applying rotations...', 'loading');

    const progressModal = showProgressModal('Rotating PDF', 'Please wait while we rotate your document pages...');

    const result = await window.pdfgilAPI.rotatePDF(state.rotateFile, state.rotateState, outputPath);
    setProcessing(elements.btnRotateAction, false);

    if (progressModal) progressModal.remove();

    if (result.success) {
      let fileSizeStr = '';
      try {
        const metadata = await window.pdfgilAPI.getMetadata(outputPath);
        fileSizeStr = ` (Size: ${formatBytes(metadata.sizeBytes)})`;
      } catch (err) {
        console.error(err);
      }

      const msg = `Rotations saved successfully!${fileSizeStr}`;
      showToast(msg, 'success');

      showCustomResultModal(
        'Rotations Saved',
        msg,
        'success',
        outputPath
      );

      clearRotateSelection();
    } else {
      showToast(`Error: ${result.error}`, 'error');
      if (typeof CitruSS !== 'undefined' && CitruSS.fire) {
        CitruSS.fire({ title: 'Error', text: result.error, icon: 'error' });
      }
    }
  });

  elements.btnRotateClear.addEventListener('click', () => {
    if (!state.rotateFile) return;
    showConfirm('Clear selection?', 'The loaded file and all rotation data will be reset.', clearRotateSelection);
  });

  function clearRotateSelection() {
    state.rotateFile = null;
    state.rotateState = {};
    elements.rotateDetailsContainer.classList.add('d-none');
    elements.rotateDropzone.classList.remove('d-none');
    elements.rotateGallery.innerHTML = '';
    clearPdfCache();
  }

  // ── Compress ──
  elements.btnCompressAction.addEventListener('click', async () => {
    if (!state.compressFile) return;

    const profile = document.querySelector('input[name="compress-profile"]:checked').value;
    const originalPath = state.compressFile;
    const dotIndex = originalPath.lastIndexOf('.');
    const defaultPath = dotIndex !== -1 ? originalPath.substring(0, dotIndex) + '_compressed.pdf' : originalPath + '_compressed.pdf';
    const outputPath = await window.pdfgilAPI.selectSavePath({
      title: 'Save compressed PDF file',
      defaultPath
    });
    if (!outputPath) return;

    setProcessing(elements.btnCompressAction, true);
    showToast('Compressing PDF...', 'loading');

    const progressModal = showProgressModal('Compressing PDF', 'Please wait while we compress your document...');

    const result = await window.pdfgilAPI.compressPDF(state.compressFile, profile, outputPath);
    setProcessing(elements.btnCompressAction, false);

    if (progressModal) progressModal.remove();

    if (result.success) {
      let compressionDetails = '';
      let progressHTML = '';
      try {
        const metadata = await window.pdfgilAPI.getMetadata(outputPath);
        const originalSize = state.compressOriginalSize || 0;
        const compressedSize = metadata.sizeBytes;

        if (originalSize > 0) {
          const reduction = Math.round(((originalSize - compressedSize) / originalSize) * 100);
          compressionDetails = ` (Compressed from ${formatBytes(originalSize)} to ${formatBytes(compressedSize)}, ${reduction}% reduction)`;
          
          progressHTML = `
            <div style="margin: 16px auto; text-align: left; width: 85%;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 0.85rem; color: var(--citruss-text-muted);">
                <span>Size Saved (Reduction)</span>
                <span style="font-weight: 700; color: var(--citruss-lime);">${reduction}%</span>
              </div>
              <div class="citruss-progress-bar progress-lime">
                <div class="progress-fill" style="width: ${reduction}%;"></div>
              </div>
            </div>
          `;
        } else {
          compressionDetails = ` (Size: ${formatBytes(compressedSize)})`;
        }
      } catch (err) {
        console.error(err);
      }

      const baseMsg = result.fallback ? result.message : 'Compression completed successfully!';
      const msg = baseMsg + compressionDetails;
      showToast(msg, result.fallback ? 'warning' : 'success');

      showCustomResultModal(
        result.fallback ? 'Compression Completed with Warnings' : 'Compression Completed',
        msg,
        result.fallback ? 'warning' : 'success',
        outputPath,
        progressHTML
      );

      clearCompressSelection();
    } else {
      showToast(`Error: ${result.error}`, 'error');
      if (typeof CitruSS !== 'undefined' && CitruSS.fire) {
        CitruSS.fire({ title: 'Error', text: result.error, icon: 'error' });
      }
    }
  });

  elements.btnCompressClear.addEventListener('click', () => {
    if (!state.compressFile) return;
    showConfirm('Clear selection?', 'The loaded file will be removed from Compress.', clearCompressSelection);
  });

  function clearCompressSelection() {
    state.compressFile = null;
    elements.compressDetailsContainer.classList.add('d-none');
    elements.compressDropzone.classList.remove('d-none');
  }
}

// ─────────────────────────────────────────────
// LIGHTBOX PREVIEW MODAL
// ─────────────────────────────────────────────
function setupLightbox() {
  const closeBtn = document.getElementById('btn-lightbox-close');
  const backdrop = document.getElementById('lightbox-backdrop');
  if (closeBtn) closeBtn.addEventListener('click', window.closeLightbox);
  if (backdrop) backdrop.addEventListener('click', window.closeLightbox);
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') window.closeLightbox();
  });
}

window.openLightbox = async (filePath, pageIndex, title) => {
  const modal = document.getElementById('preview-lightbox');
  const modalTitle = document.getElementById('lightbox-title');
  const canvas = document.getElementById('lightbox-canvas');
  if (!modal || !canvas) return;

  modalTitle.textContent = title;
  modal.classList.remove('d-none');
  showToast('Loading preview...', 'loading');

  try {
    const pdfDoc = await getPdfDocument(filePath);
    const page = await pdfDoc.getPage(pageIndex + 1);
    const context = canvas.getContext('2d');
    const initialViewport = page.getViewport({ scale: 1.0 });
    const targetHeight = window.innerHeight * 0.82;
    const scale = targetHeight / initialViewport.height;
    const viewport = page.getViewport({ scale });
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    await page.render({ canvasContext: context, viewport }).promise;
    hideToast();
  } catch (error) {
    console.error('Error rendering lightbox preview:', error);
    showToast('Failed to load preview.', 'error');
  }
};

window.closeLightbox = () => {
  const modal = document.getElementById('preview-lightbox');
  if (modal) modal.classList.add('d-none');
};

function showProgressModal(title, text) {
  if (typeof CitruSS !== 'undefined' && CitruSS.fire) {
    CitruSS.fire({
      title: title,
      text: text,
      icon: 'info'
    });
    const progressModal = document.querySelector('.citruss-swal-container');
    if (progressModal) {
      const iconEl = progressModal.querySelector('.citruss-swal-icon');
      if (iconEl) iconEl.remove();
      const buttonsEl = progressModal.querySelector('.citruss-swal-box > div[style*="display:flex"]');
      if (buttonsEl) buttonsEl.remove();

      const boxEl = progressModal.querySelector('.citruss-swal-box');
      if (boxEl) {
        const spinnerWrapper = document.createElement('div');
        spinnerWrapper.style.display = 'flex';
        spinnerWrapper.style.justifyContent = 'center';
        spinnerWrapper.style.marginBottom = '16px';
        spinnerWrapper.innerHTML = `
          <div class="citruss-spinner" style="
            width: 32px; 
            height: 32px; 
            border: 3px solid rgba(255,255,255,0.1); 
            border-top-color: var(--citruss-lime); 
            border-radius: 50%; 
            animation: spin 1s linear infinite;
          "></div>
        `;
        boxEl.insertBefore(spinnerWrapper, boxEl.firstChild);
      }
      return progressModal;
    }
  }
  return null;
}

function showCustomResultModal(title, text, type, outputPath, extraHTML = '') {
  if (typeof CitruSS !== 'undefined' && CitruSS.fire) {
    CitruSS.fire({
      title: title,
      text: text,
      icon: type,
      confirmButtonText: 'OK'
    });

    const swalContainer = document.querySelector('.citruss-swal-container');
    if (swalContainer) {
      if (extraHTML) {
        const textEl = swalContainer.querySelector('.citruss-swal-box > p');
        if (textEl) {
          textEl.insertAdjacentHTML('afterend', extraHTML);
        }
      }

      const buttonsContainer = swalContainer.querySelector('.citruss-swal-box > div[style*="display:flex"]');
      if (buttonsContainer) {
        buttonsContainer.style.alignItems = 'center';
        const isDir = !outputPath.endsWith('.pdf');
        buttonsContainer.innerHTML = `
          ${!isDir ? `
          <button class="citruss-btn" id="swal-open-file">
            <span class="material-symbols-rounded">open_in_new</span> Open
          </button>` : ''}
          <button class="citruss-btn" id="swal-open-folder">
            <span class="material-symbols-rounded">folder_open</span> Folder
          </button>
          <button class="citruss-btn btn-icon" id="swal-close" title="Close" style="padding:0 !important; width:36px; height:36px; display:flex; align-items:center; justify-content:center;">
            <span class="material-symbols-rounded">close</span>
          </button>
        `;

        const btnOpen = buttonsContainer.querySelector('#swal-open-file');
        const btnFolder = buttonsContainer.querySelector('#swal-open-folder');
        const btnClose = buttonsContainer.querySelector('#swal-close');

        const closeDialog = () => {
          swalContainer.classList.remove('active');
          const box = swalContainer.querySelector('.citruss-swal-box');
          if (box) box.classList.remove('show');
          setTimeout(() => swalContainer.remove(), 300);
        };

        if (btnOpen) {
          btnOpen.onclick = () => {
            window.openResultFile(outputPath);
            closeDialog();
          };
        }
        if (btnFolder) {
          btnFolder.onclick = () => {
            if (isDir) {
              window.openResultFile(outputPath);
            } else {
              window.showResultInFolder(outputPath);
            }
            closeDialog();
          };
        }
        if (btnClose) {
          btnClose.onclick = () => {
            closeDialog();
          };
        }
      }
    }
  }
}
