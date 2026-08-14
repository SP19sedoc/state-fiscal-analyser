// Port of report_redesign_v07.html's Jinja templating + renderer.py's glue —
// builds the report view as an HTML string, then wires up its interactive bits
// (theme toggle, tabs, dimension collapse, sidebar jump, print/download).
//
// IMPORTANT: Jinja auto-escapes {{ }} by default; this does not. Every value that
// originates from the analysis JSON (which is derived from an uploaded PDF's text,
// i.e. attacker-influenceable) is passed through escapeHtml() before insertion.

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

function truncate(str, n) {
  if (!str) return '';
  return str.length > n ? str.slice(0, n - 1) + '…' : str;
}

function trendChartHtml(chart) {
  if (!chart) return '';
  const benchmarkLine = chart.benchmarkY !== null
    ? `<line x1="0" y1="${chart.benchmarkY}" x2="${chart.width}" y2="${chart.benchmarkY}" class="trend-benchmark-line" />`
    : '';
  const dots = chart.dots.map((d) => `<circle cx="${d.x}" cy="${d.y}" r="2.5" class="trend-dot" />`).join('');
  const benchmarkLabel = chart.benchmarkLabel
    ? `<span class="trend-benchmark-label">${escapeHtml(chart.benchmarkLabel)}</span>`
    : '';
  return `
<div class="trend-block">
  <div class="trend-caption">
    <span class="trend-value">${escapeHtml(chart.valueLabel)}</span>
    ${benchmarkLabel}
  </div>
  <svg class="trend-svg" viewBox="0 0 ${chart.width} ${chart.height}" preserveAspectRatio="none">
    ${benchmarkLine}
    <polyline points="${chart.pointsStr}" class="trend-line" />
    ${dots}
  </svg>
  <div class="trend-labels"><span>${escapeHtml(chart.firstLabel)}</span><span>${escapeHtml(chart.lastLabel)}</span></div>
</div>`;
}

function kpiValueHtml(val, label) {
  const isEmpty = !val || String(val).toLowerCase().includes('not available');
  const display = isEmpty ? '<div class="kpi-value na">N/A</div>' : `<div class="kpi-value">${escapeHtml(String(val).split('(')[0].trim())}</div>`;
  return `<div>${display}<div class="kpi-label">${escapeHtml(label)}</div></div>`;
}

function buildReportHtml(analysis, filename, pageCount, referenceData, charts) {
  const a = analysis;

  let badgeClass = 'caution';
  const fd = ((a.fiscal_position && a.fiscal_position.frbm_status) || '').toLowerCase();
  if (fd.includes('breach')) badgeClass = 'stress';
  else if (fd.includes('compliant')) badgeClass = 'healthy';

  const dimPills = DIM_META.map((d) =>
    `<div class="pill ${d.severity}" data-jump="dim-${d.key}"><span class="sev-dot"></span>${escapeHtml(d.label)}</div>`
  ).join('');

  const execSummary = (a.key_concerns && a.key_positives)
    ? `${escapeHtml(a.state_name)}'s ${escapeHtml(a.fiscal_year)} budget shows ${a.key_concerns.length} key areas of concern and ${a.key_positives.length} positives.
       Own tax revenue covers ${escapeHtml((a.revenue_profile && a.revenue_profile.own_tax_revenue_share) || 'a limited share')} of total receipts,
       while committed expenditure stands at ${escapeHtml((a.committed_expenditure && a.committed_expenditure.total_committed_share) || 'a significant portion')} of revenue receipts —
       leaving limited room for discretionary spending.`
    : `Analysis complete for ${escapeHtml(a.state_name)} ${escapeHtml(a.fiscal_year)}.`;

  const kpis = [
    [(a.fiscal_position && a.fiscal_position.fiscal_deficit_gsdp) || '', 'Fiscal Deficit / GSDP'],
    [(a.debt_sustainability && a.debt_sustainability.debt_gsdp_ratio) || '', 'Debt / GSDP'],
    [(a.committed_expenditure && a.committed_expenditure.total_committed_share) || '', 'Committed Expenditure'],
    [(a.revenue_profile && a.revenue_profile.own_tax_revenue_share) || '', 'Own Tax Revenue Share'],
  ].map(([val, label]) => kpiValueHtml(val, label)).join('');

  const concerns = (a.key_concerns || []).map((c) => `<li>${escapeHtml(c)}</li>`).join('');
  const positives = (a.key_positives || []).map((p) => `<li>${escapeHtml(p)}</li>`).join('');
  const recs = (a.policy_recommendations || []).map((r) => `<li>${escapeHtml(r)}</li>`).join('');

  const dimCards = DIM_META.map((d) => {
    const dim = a[d.key] || {};
    const headline = truncate(dim[d.headline] || '', 70);
    const chartHtml = d.chart ? trendChartHtml(charts[d.chart]) : '';
    const keyStats = (dim.key_stats && dim.key_stats.length)
      ? `<div class="legend">${dim.key_stats.map((s) => `<span class="item">${escapeHtml(s)}</span>`).join('')}</div>`
      : '';
    const benchmark = dim.benchmark
      ? `<div class="dim-benchmark"><strong>Benchmark:</strong> ${escapeHtml(dim.benchmark)}</div>`
      : '';
    const sources = (dim.sources && dim.sources.length)
      ? `<div class="dim-sources"><span class="src-label">Sources</span>${dim.sources.map((s) => `<span class="src-item">${escapeHtml(s)}</span>`).join('')}</div>`
      : '';
    return `
<div class="chart-block dim-block ${d.severity}" id="dim-${d.key}">
  <div class="dim-head">
    <h3>${escapeHtml(d.label)}</h3>
    <span class="dim-toggle">▼</span>
  </div>
  <div class="unit">${escapeHtml(headline)}</div>
  <div class="dim-body">
    ${chartHtml}
    <p class="dim-summary">${escapeHtml(dim.summary || 'No data available.')}</p>
    ${keyStats}
    ${benchmark}
    ${sources}
  </div>
</div>`;
  }).join('');

  const refSourceNames = referenceData && referenceData.sources
    ? referenceData.sources.map((s) => s.filename)
    : [];
  const refSourcesSection = refSourceNames.length
    ? `<div class="section-heading">Reference Sources Used</div>
       <div class="chart-block notes-block"><div class="notes-text">${escapeHtml(refSourceNames.join(' · '))}</div></div>`
    : '';
  const analystNotesSection = a.analyst_notes
    ? `<div class="section-heading">Analyst Notes</div>
       <div class="chart-block notes-block"><strong>Caveats &amp; Data Gaps</strong><div class="notes-text">${escapeHtml(a.analyst_notes)}</div></div>`
    : '';
  const noSourcesSection = (!refSourceNames.length && !a.analyst_notes)
    ? `<div class="chart-block notes-block"><div class="notes-text">No additional sources or analyst notes for this report.</div></div>`
    : '';

  const docTypeSummary = a.document_type_summary
    ? `<p class="doc-type-summary">${escapeHtml(a.document_type_summary)}</p>`
    : '';

  return `
<div class="app-shell">
  <aside class="sidebar">
    <h1>SORTED SUMMIT</h1>
    <p class="subtitle">Public Finance Intelligence</p>

    <div class="theme-toggle" id="themeToggle">
      <button class="theme-btn" data-theme-choice="storybook">Storybook</button>
      <button class="theme-btn" data-theme-choice="playground">Playground</button>
      <button class="theme-btn" data-theme-choice="arcade">Arcade</button>
    </div>

    <div class="sidebar-label">Report</div>
    <div class="meta-card">
      <strong>${escapeHtml(a.state_name)}</strong>
      <span class="fy-pill">FY ${escapeHtml(a.fiscal_year)}</span>
      <span class="meta-line">${escapeHtml(filename)}</span>
      <span class="meta-line">${pageCount} pages · ${escapeHtml(a.analysis_date)}</span>
      ${refSourceNames.length ? `<span class="meta-line">${refSourceNames.length} reference document(s)</span>` : ''}
    </div>

    <div class="sidebar-label">Jump to Dimension</div>
    <div class="pill-col" id="dimJump">${dimPills}</div>

    <div class="sidebar-actions">
      <button class="tool-btn primary" id="btnPrint">🖨 Print Report</button>
      <button class="tool-btn" id="btnDownload">⬇ Download HTML</button>
      <button class="tool-btn" id="btnNewAnalysis">← New Analysis</button>
    </div>
  </aside>

  <div class="content-col">
    <div class="sticky-shell">
      <nav class="tabs" id="tabNav">
        <button class="tab-btn active" data-tab="overview">Overview</button>
        <button class="tab-btn" data-tab="analysis">Full Analysis</button>
        <button class="tab-btn" data-tab="sources">Sources &amp; Notes</button>
      </nav>
      <div class="status-bar">
        <span class="status-badge badge-${badgeClass}">${escapeHtml((a.fiscal_position && a.fiscal_position.frbm_status) || 'Under Assessment')}</span>
        <span>${escapeHtml(a.state_name)} · FY ${escapeHtml(a.fiscal_year)}</span>
      </div>
    </div>

    <main>
      <section class="tabpanel" data-panel="overview">
        <div class="state-hero-wrap">
          <div class="state-hero-label">Analyzing</div>
          <div class="state-hero">${escapeHtml(a.state_name)} <span style="font-weight:400; color:var(--muted); font-size:0.6em;">· FY ${escapeHtml(a.fiscal_year)}</span></div>
          ${docTypeSummary}
        </div>

        <div class="chart-block health-block ${badgeClass}">
          <h3>Fiscal Health — ${escapeHtml(a.fiscal_year)}</h3>
          <div class="unit">Overall assessment based on FRBM status, deficit and debt trajectory</div>
          <p class="exec-summary">${execSummary}</p>
          <div class="kpi-strip">${kpis}</div>
        </div>

        <div class="section-heading">What You Need to Know</div>
        <div class="cp-grid">
          <div class="chart-block cp-block concerns">
            <div class="cp-title">Key Concerns</div>
            <ul class="cp-list concerns">${concerns}</ul>
          </div>
          <div class="chart-block cp-block positives">
            <div class="cp-title">Key Positives</div>
            <ul class="cp-list positives">${positives}</ul>
          </div>
        </div>

        <div class="section-heading">Policy Recommendations</div>
        <div class="chart-block recs-block">
          <div class="recs-title">Actionable Recommendations</div>
          <ol class="recs-list">${recs}</ol>
        </div>
      </section>

      <section class="tabpanel hidden" data-panel="analysis">
        <div class="section-heading">Full Analysis — Click any card to expand</div>
        ${dimCards}
      </section>

      <section class="tabpanel hidden" data-panel="sources">
        ${refSourcesSection}
        ${analystNotesSection}
        ${noSourcesSection}
      </section>
    </main>
  </div>
</div>`;
}

/** Wires up interactivity for the HTML built by buildReportHtml(). Call after inserting it into the DOM. */
function wireReportInteractions(container, onNewAnalysis, htmlForDownload) {
  const root = document.documentElement;
  let savedTheme = 'storybook';
  try { savedTheme = localStorage.getItem('ss-theme') || 'storybook'; } catch (e) {}
  root.dataset.theme = savedTheme;

  function setActiveTheme(theme) {
    container.querySelectorAll('.theme-btn').forEach((b) => {
      b.classList.toggle('active', b.dataset.themeChoice === theme);
    });
  }
  setActiveTheme(savedTheme);

  container.querySelectorAll('.theme-btn').forEach((b) => {
    b.onclick = () => {
      const theme = b.dataset.themeChoice;
      root.dataset.theme = theme;
      try { localStorage.setItem('ss-theme', theme); } catch (e) {}
      setActiveTheme(theme);
    };
  });

  const tabButtons = container.querySelectorAll('.tab-btn');
  const panels = container.querySelectorAll('.tabpanel');
  function showTab(tab) {
    tabButtons.forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
    panels.forEach((p) => p.classList.toggle('hidden', p.dataset.panel !== tab));
  }
  tabButtons.forEach((b) => { b.onclick = () => showTab(b.dataset.tab); });

  container.querySelectorAll('.dim-block').forEach((el) => {
    el.onclick = () => el.classList.toggle('open');
  });

  container.querySelectorAll('#dimJump .pill').forEach((p) => {
    p.onclick = () => {
      showTab('analysis');
      const target = container.querySelector(`#${p.dataset.jump}`);
      if (target) {
        target.classList.add('open');
        setTimeout(() => target.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30);
      }
    };
  });

  const btnPrint = container.querySelector('#btnPrint');
  if (btnPrint) btnPrint.onclick = () => window.print();

  const btnDownload = container.querySelector('#btnDownload');
  if (btnDownload) {
    btnDownload.onclick = () => {
      const blob = new Blob([htmlForDownload()], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'sorted_summit_report.html';
      link.click();
      URL.revokeObjectURL(url);
    };
  }

  const btnNew = container.querySelector('#btnNewAnalysis');
  if (btnNew) btnNew.onclick = onNewAnalysis;
}
