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

| File | Ports |
|---|---|
| `pdfExtract.js` | `sorted-summit-plain/extractor.py` |
| `stateDetect.js` | `sorted-summit-plain/retriever.py`'s `detect_state()` |
| `llmClient.js` | `sorted-summit-plain/analyzer.py` |
| `chartData.js` | `sorted-summit-plain/chart_data.py` |
| `reportRender.js` | `sorted-summit-plain/templates/report_redesign_v07.html` + `renderer.py` |
| `scripts/build_reference_data.py` | `sorted-summit-plain/retriever.py`'s state-matching logic (one-time, offline) |
