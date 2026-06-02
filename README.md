# 🍊 PDFgil

PDFgil is a beautiful, premium, and lightweight desktop application built with Electron.js for local PDF manipulation. The interface is designed using modern aesthetics with vibrant glassmorphic gradients and smooth responsive components powered by the CitruSS CSS framework.

All PDF operations are carried out **entirely locally** on your machine, ensuring complete privacy and security for your documents.

---

## ✨ Features

- 📂 **Merge PDFs**: Import multiple PDF files, visually arrange their sequence (drag or re-order), apply optional output compression, and merge them.
- ✂️ **Split PDF**: Extract every single page into individual PDF files or export a specific page range (e.g., `2-5`, `4`, `1`).
- 🔄 **Rotate PDF**: Visual gallery layout showing document pages. Rotate individual pages in 90-degree increments before saving.
- 📉 **Compress PDF**: Reduce file size using standard (150 DPI) or aggressive (96 DPI) compression. Includes automatic fallback compression if Ghostscript is not installed.
- 🎨 **Premium UI/UX**: Custom themed dark/light modes, micro-interactions, drag-and-drop zones, and a frosted glass visual aesthetic.

---

## 🛠️ Technology Stack

- **Core**: Electron.js, Node.js, HTML5, JavaScript (ES6+)
- **Styling**: Vanilla CSS, CitruSS CSS framework, Google Material Symbols Rounded
- **PDF Core**: `pdf-lib` (Local Javascript PDF parsing/manipulation)
- **PDF Rendering**: `pdfjs-dist` (Async visual page thumbnail previews)
- **Advanced Compression**: Ghostscript integration (optional, falls back gracefully to `pdf-lib` stream compression if not present)

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v16 or higher recommended)
- [Ghostscript](https://www.ghostscript.com/) (Optional, but recommended for advanced image downsampling and maximum compression ratio)

### Installation

1. Clone or download this repository.
2. Open your terminal in the project directory and install the dependencies:
   ```bash
   npm install
   ```

### Running the Application

To run the application in development mode:
```bash
npm start
```

---

## 🔒 Security & Privacy

Since PDFgil is a local desktop application, none of your files are uploaded to third-party servers. All processing (merging, splitting, rotating, and compressing) is performed offline inside your computer's sandbox.

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
