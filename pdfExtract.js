// Port of sorted-summit-plain/extractor.py — client-side PDF extraction via pdf.js.
//
// pdf.js's getTextContent() returns an unordered bag of text items with no layout
// reconstruction, unlike pdfplumber.extract_text() which reconstructs rows/columns.
// A naive join (fine for prose) would scramble the multi-column BE/RE/Actuals tables
// this whole app depends on. reconstructPageText() below groups items into rows by
// y-coordinate and sorts by x within each row before joining, to preserve table
// structure reasonably well.

const Y_TOLERANCE = 2; // px, items within this y-distance are treated as the same row
const COLUMN_GAP_THRESHOLD = 8; // px, gaps larger than this get extra spacing (column boundary)

function reconstructPageText(items) {
  if (items.length === 0) return '';

  const rows = [];
  for (const item of items) {
    if (!item.str || !item.str.trim()) continue;
    const x = item.transform[4];
    const y = item.transform[5];
    let row = rows.find((r) => Math.abs(r.y - y) <= Y_TOLERANCE);
    if (!row) {
      row = { y, items: [] };
      rows.push(row);
    }
    row.items.push({ x, width: item.width || item.str.length * 4, str: item.str });
  }

  // PDF y-coordinates increase upward — sort descending for top-to-bottom reading order
  rows.sort((a, b) => b.y - a.y);

  const lines = rows.map((row) => {
    row.items.sort((a, b) => a.x - b.x);
    let line = '';
    let lastEnd = null;
    for (const it of row.items) {
      if (lastEnd !== null) {
        const gap = it.x - lastEnd;
        line += gap > COLUMN_GAP_THRESHOLD ? '  ' : (gap > 0.5 ? ' ' : '');
      }
      line += it.str;
      lastEnd = it.x + it.width;
    }
    return line.trim();
  });

  return lines.filter((l) => l.length > 0).join('\n');
}

// Port of extractor.py's filter_english() — drop lines that are predominantly
// non-Latin script, keep pure-English lines, mixed lines, and pure number rows.
function filterEnglish(text) {
  const kept = [];
  for (const line of text.split('\n')) {
    const alphaChars = [...line].filter((c) => /\p{L}/u.test(c));
    if (alphaChars.length === 0) {
      kept.push(line); // pure numbers/symbols — always keep
      continue;
    }
    const asciiAlpha = alphaChars.filter((c) => c.charCodeAt(0) < 128).length;
    if (asciiAlpha / alphaChars.length >= 0.5) {
      kept.push(line);
    }
  }
  return kept.join('\n');
}

/**
 * Extracts text from a PDF File/Blob, matching extractor.py's extract() output shape.
 * @param {File} file
 * @param {{maxChars?: number, filterLang?: boolean}} opts
 * @returns {Promise<{text: string, pageCount: number, charCount: number, truncated: boolean}>}
 */
async function extractPdf(file, opts = {}) {
  const maxChars = opts.maxChars ?? MAX_EXTRACT_CHARS;
  const filterLang = opts.filterLang ?? true;

  if (typeof pdfjsLib === 'undefined') {
    throw new Error('PDF library (pdf.js) failed to load — check your internet connection and try again.');
  }
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

  const data = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const pageCount = pdf.numPages;

  const pages = [];
  for (let i = 1; i <= pageCount; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = reconstructPageText(content.items);
    pages.push(`--- Page ${i} ---\n${pageText}`);
  }

  let fullText = pages.join('\n\n');

  if (filterLang) {
    fullText = filterEnglish(fullText);
  }

  const truncated = maxChars != null && fullText.length > maxChars;
  if (truncated) {
    fullText = fullText.slice(0, maxChars);
  }

  return {
    text: fullText,
    pageCount,
    charCount: fullText.length,
    truncated,
  };
}
