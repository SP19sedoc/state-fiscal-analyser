# Sorted Summit (static)

A zero-backend rewrite of [Sorted Summit](../sorted-summit-plain/) — analyzes an
uploaded Indian state budget PDF across 9 public finance dimensions, with
state-scoped cross-referencing against that state's own CAG audit report and
Finance Commission report.

Modeled on [scholar-web](https://github.com/TakshashilaInst/scholar-web)'s
architecture: static HTML/CSS/JS, no server, no build step. PDF extraction runs
in the browser via `pdf.js`; the LLM call goes straight from your browser to
Anthropic or OpenRouter using your own API key (stored only in your browser's
`localStorage`, never sent anywhere else).

## Features

- **Upload & extract** — drag-and-drop or browse for a PDF (max 50 MB); text is
  pulled out client-side via `pdf.js`, with row/column reconstruction so
  multi-column BE/RE/Actuals budget tables survive extraction intact.
- **Automatic state detection & reference cross-checking** — the tool detects
  which state's budget was uploaded and pulls that state's own CAG State
  Finances Audit Report and 16th Finance Commission evaluation report from
  `data/reference/` (pre-extracted for all 30 states plus Delhi and J&K). The
  cross-check is strictly state-scoped: a state with no reference data gets
  `null`, never another state's numbers by accident.
- **9-dimension fiscal analysis** — Revenue Profile, Expenditure Quality,
  Committed Expenditure, Fiscal Position, Debt Sustainability, Off-Budget
  Borrowings, Subsidy Burden, Devolution & Grants, Budget Credibility — each
  with a summary, key stats, sources, and (for three dimensions) a 5-year
  trend chart drawn only from explicit tables in the source documents, never
  estimated.
- **Bring-your-own-key, two providers** — Anthropic direct, or OpenRouter
  (DeepSeek, Gemini, GPT-4o, Llama, Claude and others via one key). The
  response streams in with a live per-dimension progress checklist instead of
  a blank wait.
- **Structured report view** — Overview (fiscal-health badge, KPI strip,
  concerns/positives), Full Analysis (expandable per-dimension cards),
  Sources & Notes (methodology, provenance, caveats); print, download as a
  self-contained HTML file, or jump to the state's page on the State Fiscal
  Indicators dashboard for cross-state/year comparison.
- **Classroom mode** (optional) — guess a budget's FRBM compliance before the
  AI's assessment is revealed, then see your guess against the actual call.
- **Trivia ticker** — 120 state-specific, factual "did you know" points
  (drawn from the same CAG/FC reference data — see `trivia-repository.xlsx`)
  rotate every 15 seconds during the analyze step, the longest part of the
  wait.
- **3 themes** (Warm / Modern / Neon) and a mobile-responsive layout, both
  persisted/adaptive per visitor.
- **Zero backend** — no server-side code or storage anywhere in the pipeline;
  the only network calls are to your chosen LLM provider and (for reference
  data) this same static host.

## Local development

No build step — just serve the folder:

```
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

## Regenerating reference data

If `sorted-summit-plain/reference_docs/` changes (new/updated CAG or Finance
Commission PDFs), rebuild the per-state reference JSON:

```
pip install -r scripts/requirements-build.txt
python3 scripts/build_reference_data.py
```

This reads PDFs from `../sorted-summit-plain/reference_docs` (never copied or
committed here — keep that folder backed up separately) and writes one JSON
file per state into `data/reference/`.

## Deploying

Push to a **public** GitHub repo (GitHub Pages on a free account requires a
public repo — fine here, there's nothing sensitive in this codebase), then
enable Pages in the repo's Settings (source: `main` branch, root). No build
step, no Actions workflow needed.

## File structure

| File / directory | Role | Ports |
|---|---|---|
| `index.html` | Upload page markup + shell for the report/prediction views | — |
| `styles.css` | All styling — 3 themes, desktop + mobile (≤700px) layouts, print stylesheet | — |
| `config.js` | Shared constants: the 9 dimensions, provider/model lists, states list | `sorted-summit-plain/config.py` |
| `app.js` | Orchestration — upload → extract → detect state → fetch reference → analyze → render; settings panel, classroom mode, theme switcher | `upload_redesign_v06.html`'s inline script |
| `pdfExtract.js` | Client-side PDF text extraction | `sorted-summit-plain/extractor.py` |
| `stateDetect.js` | Detects state from document text, fetches its reference JSON | `sorted-summit-plain/retriever.py`'s `detect_state()` |
| `llmClient.js` | Direct browser→provider LLM calls (Anthropic/OpenRouter), streaming | `sorted-summit-plain/analyzer.py` |
| `chartData.js` | Precomputes trend-chart data | `sorted-summit-plain/chart_data.py` |
| `reportRender.js` | Builds the report HTML string + wires its interactions (tabs, theme, print, download) | `sorted-summit-plain/templates/report_redesign_v07.html` + `renderer.py` |
| `trivia.js` | Loading-screen trivia ticker (120 state-specific facts) | — |
| `data/reference/*.json` | Pre-extracted CAG + Finance Commission report excerpts, one file per state | — |
| `trivia-repository.xlsx` | Source spreadsheet the 120 trivia facts were curated from (not read at runtime) | — |
| `scripts/build_reference_data.py` | Regenerates `data/reference/` from source PDFs | `sorted-summit-plain/retriever.py`'s state-matching logic (one-time, offline) |

See [`HANDOFF.md`](HANDOFF.md) for current project status, recent changes, and open items.
