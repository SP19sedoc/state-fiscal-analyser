// Orchestration: wires the upload form to the extract → detect state → fetch
// reference → analyze → build charts → render pipeline, entirely client-side.
// Settings-panel logic here is a near-direct port of upload_redesign_v06.html's
// inline script (already vanilla JS with zero Flask coupling).

const uploadView = document.getElementById('uploadView');
const reportView = document.getElementById('reportView');
const predictView = document.getElementById('predictView');

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

// ── Classroom mode (optional prediction step) ──
// Off by default — this is purely for teaching contexts. When on, the user guesses
// the FRBM-compliance call before the AI's assessment is revealed, then sees both
// side by side. Adds zero friction for the professional-analyst path when left off.
const classroomToggle = document.getElementById('classroom-mode-toggle');
(function () {
  let saved = false;
  try { saved = localStorage.getItem('ss-classroom-mode') === '1'; } catch (e) {}
  classroomToggle.checked = saved;
  classroomToggle.addEventListener('change', () => {
    try { localStorage.setItem('ss-classroom-mode', classroomToggle.checked ? '1' : '0'); } catch (e) {}
  });
})();

const FRBM_GUESS_OPTIONS = [
  { value: 'compliant', icon: '✅', label: 'Compliant' },
  { value: 'marginal',  icon: '⚠️', label: 'Marginally breaching' },
  { value: 'breaching', icon: '🚨', label: 'Breaching' },
];

function classifyFrbmStatus(statusText) {
  const s = (statusText || '').toLowerCase();
  if (s.includes('marginal')) return 'marginal';
  if (s.includes('breach')) return 'breaching';
  if (s.includes('compliant')) return 'compliant';
  return null;
}

/** Shows the prediction interstitial and resolves with the user's guess value. */
function showPrediction(stateName, fiscalYear) {
  return new Promise((resolve) => {
    predictView.innerHTML = `
<div class="predict-wrap">
  <div class="chart-block predict-card">
    <h2>🎓 Before you see the assessment…</h2>
    <p class="subtitle">Is ${escapeHtml(stateName)}'s ${escapeHtml(fiscalYear)} budget FRBM-compliant?</p>
    <div id="predictChoices" class="pill-col"></div>
  </div>
</div>`;
    const choicesEl = predictView.querySelector('#predictChoices');
    FRBM_GUESS_OPTIONS.forEach((opt) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tool-btn';
      btn.textContent = `${opt.icon} ${opt.label}`;
      btn.onclick = () => resolve(opt.value);
      choicesEl.appendChild(btn);
    });
    uploadView.style.display = 'none';
    predictView.style.display = 'block';
    window.scrollTo(0, 0);
  });
}

/** Builds the "your guess vs. actual" banner shown at the top of the report. */
function guessResultBannerHtml(guessValue, analysis) {
  const actualStatus = (analysis.fiscal_position && analysis.fiscal_position.frbm_status) || 'Under assessment';
  const actual = classifyFrbmStatus(actualStatus);
  const guessOpt = FRBM_GUESS_OPTIONS.find((o) => o.value === guessValue);
  const resultLabel = actual === null
    ? "the report doesn't state a clear compliant/breaching call to check this against"
    : (actual === guessValue ? 'correct ✅' : 'not quite ❌');
  return `<div class="chart-block guess-banner">
    <strong>Your guess:</strong> ${escapeHtml(guessOpt ? guessOpt.label : guessValue)}
    &nbsp;·&nbsp; <strong>Actual:</strong> ${escapeHtml(actualStatus)}
    &nbsp;·&nbsp; ${resultLabel}
  </div>`;
}

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

// Caches the extract+retrieve results (the two steps that never depend on the LLM
// call) keyed to the exact File object currently selected. If the LLM step fails —
// a bad response, a rate limit, a network blip — retrying the same file re-runs
// only the analyze step onward, instead of re-parsing the PDF and re-fetching
// reference data for no reason. A newly selected file naturally invalidates this,
// since selectFile() assigns a new File object.
let cachedExtraction = null; // { file, extracted, referenceData }

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

// Ticks off each of the 9 fiscal dimensions as its JSON key appears in the
// streamed LLM response, so the "Analyzing…" wait shows real progress instead
// of an indeterminate spinner. Cheap on purpose: a substring check per delta,
// only against dimensions not yet marked done.
const analyzeChecklistEl = document.getElementById('analyze-checklist');
function resetAnalyzeChecklist() {
  analyzeChecklistEl.innerHTML = DIMENSIONS.map((dim) =>
    `<span class="chip" data-dim="${dim}">${escapeHtml(DIMENSION_LABELS[dim])}</span>`
  ).join('');
}
function updateAnalyzeChecklist(totalSoFar) {
  let doneCount = 0;
  analyzeChecklistEl.querySelectorAll('.chip').forEach((chip) => {
    const dim = chip.dataset.dim;
    if (chip.classList.contains('done')) { doneCount++; return; }
    if (totalSoFar.includes(`"${dim}"`)) { chip.classList.add('done'); doneCount++; }
  });
  return doneCount;
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
    let extracted, referenceData;
    if (cachedExtraction && cachedExtraction.file === selectedFile) {
      // Retrying the same file after a failed analyze step — skip straight to it.
      ({ extracted, referenceData } = cachedExtraction);
      advanceTo(2);
    } else {
      advanceTo(0);
      extracted = await extractPdf(selectedFile, { maxChars: MAX_EXTRACT_CHARS, filterLang: true });

      advanceTo(1);
      referenceData = await fetchReferenceData(extracted.text);
      cachedExtraction = { file: selectedFile, extracted, referenceData };

      advanceTo(2);
    }

    const liveStatus = document.getElementById('analyze-live-status');
    liveStatus.textContent = '';
    resetAnalyzeChecklist();
    startTrivia('trivia-ticker');
    let analysis;
    try {
      analysis = await analyze(
        extracted.text, selectedFile.name, extracted.pageCount,
        referenceData, apiKey, provider, modelSelect.value,
        (chunk, totalSoFar) => {
          // Streamed response — nudge the bar from 75% toward 89% (90% is reserved
          // for the render step) as text arrives, so the UI never sits frozen.
          const doneCount = updateAnalyzeChecklist(totalSoFar);
          liveStatus.textContent = `(${doneCount}/${DIMENSIONS.length} sections drafted)`;
          setProgress(Math.min(89, 75 + Math.floor(totalSoFar.length / 200)));
        }
      );
    } finally {
      stopTrivia();
    }
    liveStatus.textContent = '';
    analyzeChecklistEl.innerHTML = '';

    advanceTo(3);
    const charts = buildChartData(analysis);

    setProgress(100);

    let guess = null;
    if (classroomToggle.checked) {
      progressSection.style.display = 'none';
      guess = await showPrediction(analysis.state_name, analysis.fiscal_year);
    }

    await showReport(analysis, selectedFile.name, extracted.pageCount, referenceData, charts, guess, {
      truncated: extracted.truncated,
      charCount: extracted.charCount,
      provider,
      model: modelSelect.value,
    });
  } catch (err) {
    console.error(err);
    stopTrivia();
    document.getElementById('analyze-live-status').textContent = '';
    analyzeChecklistEl.innerHTML = '';
    btnAnalyze.disabled = false;
    btnAnalyze.textContent = 'Error — please try again';
    // fetch() only rejects like this (as opposed to resolving with a non-ok status)
    // when no HTTP response ever came back — a network-level failure already retried
    // once in llmClient.js. If it's still failing at this point, the raw browser
    // message ("Load failed" in Safari, "Failed to fetch" in Chrome) isn't actionable
    // on its own, so replace it with troubleshooting copy. Real API errors (bad key,
    // rate limit, etc.) already carry their own specific message and skip this.
    const isConnectionFailure = err instanceof TypeError
      || /load failed|failed to fetch|networkerror/i.test(err.message || '');
    const providerName = provider === 'openrouter' ? 'OpenRouter' : 'Anthropic';
    const message = isConnectionFailure
      ? `Couldn't reach ${providerName}'s API, even after a retry. Check your internet connection and try again — ` +
        `if it keeps happening, try switching provider in Settings, since the issue may be specific to reaching ` +
        `this one API from your network.`
      : 'Analysis failed: ' + (err.message || err);
    alert(message);
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

async function showReport(analysis, filename, pageCount, referenceData, charts, guess, meta) {
  reportView.innerHTML = buildReportHtml(analysis, filename, pageCount, referenceData, charts, meta);

  if (guess) {
    const heroWrap = reportView.querySelector('.state-hero-wrap');
    if (heroWrap) heroWrap.insertAdjacentHTML('afterend', guessResultBannerHtml(guess, analysis));
  }

  predictView.style.display = 'none';
  predictView.innerHTML = '';
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
  predictView.style.display = 'none';
  predictView.innerHTML = '';
  uploadView.style.display = 'flex';
  btnAnalyze.disabled = !selectedFile;
  btnAnalyze.textContent = selectedFile ? 'Analyze Document →' : 'Select a file to analyze';
  progressSection.style.display = 'none';
  STEP_IDS.forEach((id, i) => setStep(i, ''));
  setProgress(0);
  window.scrollTo(0, 0);
}
