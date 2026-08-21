// Orchestration: wires the upload form to the extract → detect state → fetch
// reference → analyze → build charts → render pipeline, entirely client-side.
// Settings-panel logic here is a near-direct port of upload_redesign_v06.html's
// inline script (already vanilla JS with zero Flask coupling).

const uploadView = document.getElementById('uploadView');
const reportView = document.getElementById('reportView');

// ── Theme switcher (upload view) — Warm / Modern / Neon ──
(function () {
  const root = document.documentElement;
  let saved = 'playground';
  try { saved = localStorage.getItem('ss-theme') || 'playground'; } catch (e) {}
  root.dataset.theme = saved;

  function setActive(theme) {
    document.querySelectorAll('#uploadView .theme-btn').forEach((b) => {
      b.classList.toggle('active', b.dataset.themeChoice === theme);
    });
  }
  setActive(saved);

  document.querySelectorAll('#uploadView .theme-btn').forEach((b) => {
    b.onclick = () => {
      const theme = b.dataset.themeChoice;
      root.dataset.theme = theme;
      try { localStorage.setItem('ss-theme', theme); } catch (e) {}
      setActive(theme);
    };
  });
})();

// ── Provider / model settings panel ──
const LS_KEY_PREFIX = 'sorted_summit_';
function lsGet(k) { try { return localStorage.getItem(LS_KEY_PREFIX + k) || ''; } catch (e) { return ''; } }
function lsSet(k, v) { try { localStorage.setItem(LS_KEY_PREFIX + k, v); } catch (e) {} }
function lsDel(k) { try { localStorage.removeItem(LS_KEY_PREFIX + k); } catch (e) {} }

const providerSelect = document.getElementById('provider-select');
const modelSelect = document.getElementById('model-select');
const apiKeyInput = document.getElementById('api-key-input');
const providerNote = document.getElementById('provider-note');
const settingsHeader = document.getElementById('settings-header');
const settingsBody = document.getElementById('settings-body');
const savedBadge = document.getElementById('saved-badge');
const apiKeyError = document.getElementById('api-key-error');

function updateProviderUI(provider) {
  const cfg = PROVIDERS[provider];
  providerNote.innerHTML = cfg.note;
  apiKeyInput.placeholder = cfg.placeholder;
  modelSelect.innerHTML = cfg.models.map((m) => `<option value="${m.id}">${m.label}</option>`).join('');
  const savedModel = lsGet('model_' + provider);
  if (savedModel) modelSelect.value = savedModel;
}

function loadFromStorage() {
  const savedProvider = lsGet('provider') || 'anthropic';
  providerSelect.value = savedProvider;
  updateProviderUI(savedProvider);
  const savedKey = lsGet('key_' + savedProvider);
  if (savedKey) apiKeyInput.value = savedKey;
}

providerSelect.addEventListener('change', () => {
  updateProviderUI(providerSelect.value);
  apiKeyInput.value = lsGet('key_' + providerSelect.value);
  apiKeyError.style.display = 'none';
});

document.getElementById('btn-save-settings').addEventListener('click', () => {
  const provider = providerSelect.value;
  lsSet('provider', provider);
  lsSet('key_' + provider, apiKeyInput.value.trim());
  lsSet('model_' + provider, modelSelect.value);
  savedBadge.style.display = 'flex';
  setTimeout(() => { savedBadge.style.display = 'none'; }, 2000);
});

document.getElementById('btn-clear-key').addEventListener('click', () => {
  const provider = providerSelect.value;
  lsDel('key_' + provider);
  apiKeyInput.value = '';
  apiKeyError.style.display = 'none';
});

settingsHeader.addEventListener('click', () => {
  const open = settingsBody.classList.toggle('open');
  settingsHeader.classList.toggle('open', open);
});

loadFromStorage();
if (!apiKeyInput.value) {
  settingsBody.classList.add('open');
  settingsHeader.classList.add('open');
}

// ── File selection ──
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const fileSelected = document.getElementById('file-selected');
const fileNameEl = document.getElementById('file-name');
const btnAnalyze = document.getElementById('btn-analyze');
const form = document.getElementById('upload-form');
const progressSection = document.getElementById('progress-section');

let selectedFile = null;

function selectFile(file) {
  if (!file || file.type !== 'application/pdf') { alert('Please select a PDF file.'); return; }
  if (file.size > MAX_FILE_MB * 1024 * 1024) { alert(`File exceeds ${MAX_FILE_MB} MB limit.`); return; }
  selectedFile = file;
  fileNameEl.textContent = file.name + ' (' + (file.size / 1024 / 1024).toFixed(1) + ' MB)';
  fileSelected.style.display = 'block';
  btnAnalyze.disabled = false;
  btnAnalyze.textContent = 'Analyze Document →';
}

dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  if (e.dataTransfer.files[0]) selectFile(e.dataTransfer.files[0]);
});
dropZone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', () => { if (fileInput.files[0]) selectFile(fileInput.files[0]); });

// ── Progress UI ──
const STEP_IDS = ['step-extract', 'step-retrieve', 'step-analyze', 'step-render'];
function setStep(index, status) {
  const el = document.getElementById(STEP_IDS[index]);
  if (!el) return;
  el.className = status;
  el.querySelector('.step-icon').textContent = status === 'done' ? '✅' : status === 'active' ? '🔄' : '⏳';
}
function setProgress(pct) {
  document.getElementById('progress-bar').style.width = pct + '%';
}
function advanceTo(index) {
  for (let i = 0; i < index; i++) setStep(i, 'done');
  setStep(index, 'active');
  setProgress([25, 50, 75, 90][index]);
}

// ── Pipeline ──
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const provider = providerSelect.value;
  const apiKey = apiKeyInput.value.trim();
  const cfg = PROVIDERS[provider];
  if (!apiKey || !apiKey.startsWith(cfg.keyPrefix)) {
    apiKeyError.textContent = `Please enter a valid ${provider === 'anthropic' ? 'Anthropic' : 'OpenRouter'} API key (starts with ${cfg.keyPrefix})`;
    apiKeyError.style.display = 'block';
    settingsBody.classList.add('open');
    settingsHeader.classList.add('open');
    apiKeyInput.focus();
    return;
  }
  if (!selectedFile) return;

  apiKeyError.style.display = 'none';
  lsSet('provider', provider);
  lsSet('key_' + provider, apiKey);
  lsSet('model_' + provider, modelSelect.value);

  btnAnalyze.disabled = true;
  btnAnalyze.textContent = 'Analyzing…';
  progressSection.style.display = 'block';

  try {
    advanceTo(0);
    const extracted = await extractPdf(selectedFile, { maxChars: MAX_EXTRACT_CHARS, filterLang: true });

    advanceTo(1);
    const referenceData = await fetchReferenceData(extracted.text);

    advanceTo(2);
    const analysis = await analyze(
      extracted.text, selectedFile.name, extracted.pageCount,
      referenceData, apiKey, provider, modelSelect.value
    );

    advanceTo(3);
    const charts = buildChartData(analysis);

    setProgress(100);
    await showReport(analysis, selectedFile.name, extracted.pageCount, referenceData, charts);
  } catch (err) {
    console.error(err);
    btnAnalyze.disabled = false;
    btnAnalyze.textContent = 'Error — please try again';
    alert('Analysis failed: ' + (err.message || err));
    progressSection.style.display = 'none';
  }
});

// ── View switching ──
let _stylesCssCache = null;
async function getStylesCss() {
  if (_stylesCssCache === null) {
    const res = await fetch('styles.css');
    _stylesCssCache = await res.text();
  }
  return _stylesCssCache;
}

async function showReport(analysis, filename, pageCount, referenceData, charts) {
  reportView.innerHTML = buildReportHtml(analysis, filename, pageCount, referenceData, charts);
  uploadView.style.display = 'none';
  reportView.style.display = 'block';
  window.scrollTo(0, 0);

  const htmlForDownload = () => {
    // Self-contained document: inline the CSS so the downloaded file works offline.
    const css = _stylesCssCache || '';
    return `<!DOCTYPE html><html lang="en" data-theme="${document.documentElement.dataset.theme}"><head>
<meta charset="UTF-8"><title>Sorted Summit — ${analysis.state_name} ${analysis.fiscal_year}</title>
<style>${css}</style></head><body>${reportView.innerHTML}</body></html>`;
  };

  await getStylesCss(); // warm the cache before the download button can be clicked

  wireReportInteractions(reportView, resetToUpload, htmlForDownload);
}

function resetToUpload() {
  reportView.style.display = 'none';
  reportView.innerHTML = '';
  uploadView.style.display = 'flex';
  btnAnalyze.disabled = !selectedFile;
  btnAnalyze.textContent = selectedFile ? 'Analyze Document →' : 'Select a file to analyze';
  progressSection.style.display = 'none';
  STEP_IDS.forEach((id, i) => setStep(i, ''));
  setProgress(0);
  window.scrollTo(0, 0);
}
