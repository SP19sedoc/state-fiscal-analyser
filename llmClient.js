// Port of sorted-summit-plain/analyzer.py — direct browser-to-provider LLM calls.
//
// Anthropic: uses the officially-supported 'anthropic-dangerous-direct-browser-access'
// header for BYOK apps calling from the browser (confirmed via scholar-web's live
// production code at github.com/TakshashilaInst/scholar-web).
// OpenRouter: needs no special header — a plain Authorization: Bearer works from the
// browser (confirmed both by reading scholar-web's code and a live test request).

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// fetch() rejects (rather than resolving with a non-ok response) only when no HTTP
// response ever came back — a real network-level failure (DNS, connection reset, a
// blocked CORS preflight), not an API error like a bad key or rate limit. Those are
// often transient, so retry once before giving up. A response that *did* come back,
// even a 401 or 500, is never retried here — that's a real, actionable error already
// handled by each caller's `if (!res.ok)` branch.
async function fetchWithRetry(url, options, retryDelayMs = 1500) {
  try {
    return await fetch(url, options);
  } catch (e) {
    await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    return await fetch(url, options);
  }
}

const JSON_SCHEMA = `{
  "document_title": "string — inferred title of the document",
  "state_name": "string — state name (e.g. Karnataka, Bihar)",
  "fiscal_year": "string — primary budget year e.g. 2024-25",
  "analysis_date": "string — today's date in YYYY-MM-DD",
  "document_type_summary": "2-3 sentences: what document(s) this actually is — e.g. Budget Speech, Budget at a Glance / Highlights, Annual Financial Statement, Receipts Budget, Expenditure Budget, Output-Outcome Framework, Demand for Grants, Medium-Term Fiscal Policy Statement, or a combination. Name the specific volumes/sections present and, if relevant, what's notably absent.",

  "revenue_profile": {
    "summary": "3-4 sentences with specific figures and YoY trends",
    "own_tax_revenue_share": "% of total receipts, with year",
    "central_transfers_share": "% of total receipts",
    "tax_buoyancy_signal": "Improving / Stable / Declining — with evidence",
    "key_stats": ["stat with figure", "stat with figure", "stat with figure"],
    "sources": ["Where each figure above came from — e.g. 'Budget document, p.14 (Receipts Budget)' or 'CAG_Karnataka.pdf'. One entry per distinct source used in this section."]
  },

  "expenditure_quality": {
    "summary": "3-4 sentences with specific figures",
    "capex_share": "% of total expenditure",
    "social_sector_share": "% of revenue expenditure",
    "key_stats": ["stat with figure", "stat with figure", "stat with figure"],
    "sources": ["Page-level or document-level citation for each figure above"]
  },

  "committed_expenditure": {
    "summary": "3-4 sentences — how much is locked in, what it means for discretionary space",
    "salaries_pensions_share": "% of revenue receipts",
    "interest_payments_share": "% of revenue receipts",
    "total_committed_share": "% of revenue receipts",
    "key_stats": ["stat with figure", "stat with figure", "stat with figure"],
    "sources": ["Page-level or document-level citation for each figure above"]
  },

  "fiscal_position": {
    "summary": "3-4 sentences covering fiscal, revenue, and primary deficit",
    "fiscal_deficit_gsdp": "% of GSDP",
    "revenue_balance": "Surplus or Deficit, % of GSDP",
    "primary_deficit": "% of GSDP",
    "frbm_status": "Compliant / Marginally breaching / Breaching — with context",
    "benchmark": "The applicable FRBM fiscal deficit ceiling (statutory default is 3% of GSDP, but state it precisely if the document or reference context cites a different state-specific glide path/relaxation) and how the actual figure compares. Write 'No official benchmark found in available documents' if you cannot ground this.",
    "benchmark_pct": "number, the numeric ceiling stated in benchmark above as a plain float — or null if benchmark could not be grounded",
    "trend": "array of up to 5 objects {\\"year\\": \\"YYYY-YY\\", \\"value\\": number}, oldest year first — this metric's value in each of the last several years, taken ONLY from an explicit multi-year comparison table in the budget document (many show BE/RE/Actuals across years) or the reference CAG/FC context (state audit reports typically include a 5-year fiscal trend table). Include only years you can find explicitly stated — never estimate, interpolate, or guess a year's figure. Return [] if no such table exists.",
    "key_stats": ["stat with figure", "stat with figure", "stat with figure"],
    "sources": ["Page-level or document-level citation for each figure above, including for the benchmark and trend"]
  },

  "debt_sustainability": {
    "summary": "3-4 sentences on debt stock, trajectory, and servicing pressure",
    "debt_gsdp_ratio": "% of GSDP",
    "interest_revenue_ratio": "% of revenue receipts",
    "benchmark": "The applicable debt-GSDP ceiling/glide path per the FRBM Act or the relevant Finance Commission award, if stated in the budget document or the reference CAG/FC context. Write 'No official benchmark found in available documents' if you cannot ground this — do not invent a figure.",
    "benchmark_pct": "number, the numeric ceiling stated in benchmark above as a plain float — or null if benchmark could not be grounded",
    "trend": "array of up to 5 objects {\\"year\\": \\"YYYY-YY\\", \\"value\\": number}, oldest year first — same rules as fiscal_position.trend above, applied to the debt-GSDP ratio",
    "key_stats": ["stat with figure", "stat with figure", "stat with figure"],
    "sources": ["Page-level or document-level citation for each figure above, including for the benchmark and trend"]
  },

  "off_budget_borrowings": {
    "summary": "3-4 sentences on PSU/SPV borrowings, guarantees, adjusted fiscal deficit",
    "psu_borrowings_estimate": "amount or 'not disclosed'",
    "state_guarantees": "amount outstanding",
    "adjusted_fiscal_deficit": "adjusted % of GSDP including off-budget",
    "key_stats": ["stat with figure", "stat with figure", "stat with figure"],
    "sources": ["Page-level or document-level citation for each figure above"]
  },

  "subsidy_burden": {
    "summary": "3-4 sentences on subsidy composition, targeting, and growth trajectory",
    "power_subsidy": "amount and % of revenue expenditure",
    "total_subsidy_share": "% of revenue expenditure",
    "subsidy_growth": "annual growth rate",
    "key_stats": ["stat with figure", "stat with figure", "stat with figure"],
    "sources": ["Page-level or document-level citation for each figure above"]
  },

  "devolution_and_grants": {
    "summary": "3-4 sentences on FC devolution, CSS dependency, local body transfers",
    "fc_devolution_share": "% of total receipts",
    "css_grants": "amount (Centre share)",
    "state_matching": "amount (state matching obligation)",
    "benchmark": "The state's approved share of the vertical/horizontal devolution pool per the applicable Finance Commission award, if stated in the reference FC context — compare to the actual devolution received. Write 'No official benchmark found in available documents' if you cannot ground this.",
    "benchmark_pct": "number, the numeric share stated in benchmark above as a plain float — or null if benchmark could not be grounded",
    "trend": "array of up to 5 objects {\\"year\\": \\"YYYY-YY\\", \\"value\\": number}, oldest year first — same rules as fiscal_position.trend above, applied to the FC devolution share",
    "key_stats": ["stat with figure", "stat with figure", "stat with figure"],
    "sources": ["Page-level or document-level citation for each figure above, including for the benchmark and trend"]
  },

  "budget_credibility": {
    "summary": "3-4 sentences on RE vs BE variance patterns, what it signals",
    "capex_be_re_variance": "% variance (negative = underspent)",
    "revenue_receipt_variance": "% variance",
    "overall_credibility": "Strong / Moderate / Weak — with reasoning",
    "key_stats": ["stat with figure", "stat with figure"],
    "sources": ["Page-level or document-level citation for each figure above"]
  },

  "key_concerns": [
    "Specific concern with figures, ending with a parenthetical source, e.g. '... (Source: Budget document, p.22)' — 5 items",
    "...", "...", "...", "..."
  ],

  "key_positives": [
    "Specific positive with figures, ending with a parenthetical source — 5 items",
    "...", "...", "...", "..."
  ],

  "policy_recommendations": [
    "Specific, actionable recommendation grounded in the data — 5 items",
    "...", "...", "...", "..."
  ],

  "analyst_notes": "Caveats: data gaps, document quality issues, what could not be assessed, and — separately — list any dimensions above where a benchmark could not be grounded in the available documents"
}`;

const SYSTEM_PROMPT =
  "You are a senior public finance economist specializing in Indian state finances. " +
  "You analyze state budget documents and produce structured assessments for policy researchers. " +
  "You are rigorous about sourcing: every figure you state must be traceable to a specific page in the " +
  "uploaded document or a named reference document, and you never state a benchmark you cannot ground. " +
  "When you are not sure, you say so rather than guessing. " +
  "You must return ONLY a valid JSON object. No markdown fences, no preamble, no explanation outside the JSON.";

function buildPrompt(budgetText, filename, pageCount, referenceData) {
  const parts = [];
  parts.push(
    `Analyze the following state budget document and return a structured JSON report.\n` +
    `Document: ${filename} (${pageCount} pages)\n\n` +
    `Return ONLY the JSON object matching this schema exactly:\n${JSON_SCHEMA}`
  );

  if (referenceData && referenceData.sources && referenceData.sources.length > 0) {
    parts.push('\n\nREFERENCE CONTEXT (from CAG audit reports and Finance Commission documents for this state):');
    for (const source of referenceData.sources) {
      parts.push(`\n--- Source: ${source.filename} ---\n${source.text}`);
    }
  }

  parts.push(
    "\n\nNOTE ON THE TEXT BELOW: each page is marked '--- Page N ---'. " +
    "Use these markers to cite the page number for figures you pull from this document."
  );
  parts.push(`\n\nBUDGET DOCUMENT TEXT:\n--- BEGIN ---\n${budgetText}\n--- END ---`);
  parts.push(
    "\n\nIMPORTANT INSTRUCTIONS:\n" +
    "- Extract specific figures with crore/lakh Cr amounts and years wherever available\n" +
    "- If data for a field is not present in the document, write 'data not available' — do not hallucinate\n" +
    "- Cross-reference findings with the CAG/FC context provided above\n" +
    "- SOURCING (critical — every figure must be traceable): for every 'sources' array, cite where each " +
    "figure came from. If it's from the uploaded budget document, cite the page number using the " +
    "'--- Page N ---' markers (e.g. 'Budget document, p.34'). If it's from the reference context, cite the " +
    "filename shown after 'Source:' above (e.g. 'CAG_Karnataka.pdf'). If a figure is computed/derived rather " +
    "than directly stated, say so explicitly (e.g. 'Computed from p.12 and p.45'). Never leave a 'sources' " +
    "array empty if the section has any figures — if you truly cannot pin down a source for a figure, do not " +
    "state that figure.\n" +
    "- BENCHMARKS: only state a 'benchmark' value when it is grounded either in a well-established statutory " +
    "rule (the FRBM Act's default 3% fiscal deficit ceiling) or explicitly stated in the reference CAG/FC " +
    "context. Do not invent conventional or informal norms — if ungrounded, write " +
    "'No official benchmark found in available documents'.\n" +
    "- 'benchmark_pct' (fiscal_position, debt_sustainability, devolution_and_grants): this exists purely so " +
    "the benchmark can be charted alongside the trend. Emit a plain float with no '%' sign and no text (e.g. " +
    "3.0, not \"3.0%\"), matching the numeric ceiling/share stated in 'benchmark'. It must be null whenever " +
    "'benchmark' says 'No official benchmark found in available documents' — never invent a numeric value not " +
    "grounded in the document.\n" +
    "- TREND DATA ('trend' field in fiscal_position, debt_sustainability, devolution_and_grants): only " +
    "include a year if you can point to it explicitly stated in a multi-year table — either the budget " +
    "document's own BE/RE/Actuals comparison across years, or a multi-year trend table in the reference " +
    "CAG/FC context. Do not fabricate, estimate, or interpolate any year's figure to fill out the series — " +
    "an empty array or a short 2-3 year series is normal and expected when no fuller table exists. Getting " +
    "this wrong is worse than returning fewer years.\n" +
    "- The reference context above (if any) has already been filtered to this state's own CAG and Finance " +
    "Commission documents only — do not introduce comparisons to other states' figures.\n" +
    "- Set analysis_date to today: " + new Date().toISOString().slice(0, 10) + "\n" +
    "- Return ONLY the JSON object, no explanation, no markdown fences"
  );
  return parts.join('');
}

function extractJson(raw) {
  let text = raw.trim();
  text = text.replace(/^```(?:json)?\s*/, '');
  text = text.replace(/\s*```$/, '');
  text = text.trim();
  try {
    return JSON.parse(text);
  } catch (e) {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
    throw e;
  }
}

// Reads an SSE response body, calling onEvent(dataStr) for each 'data: ' line's
// payload (excluding the terminal '[DONE]' sentinel some providers send).
async function readSse(res, onEvent) {
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop(); // last (possibly partial) line stays in the buffer
    for (const line of lines) {
      if (!line.startsWith('data:')) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === '[DONE]') continue;
      onEvent(payload);
    }
  }
}

/**
 * @param {(chunk: string, totalSoFar: string) => void} [onDelta] - called with each
 * newly streamed text chunk as it arrives, so the UI can show live progress instead
 * of sitting frozen until the full (often 8k-token) response completes.
 */
async function callAnthropic(apiKey, model, userPrompt, onDelta) {
  const res = await fetchWithRetry(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: model || 'claude-sonnet-4-6',
      max_tokens: 8192,
      temperature: 0.2,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
      stream: true,
    }),
  });
  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Anthropic API error (${res.status}): ${errBody.slice(0, 500)}`);
  }

  let full = '';
  let streamError = null;
  await readSse(res, (payload) => {
    let evt;
    try { evt = JSON.parse(payload); } catch (e) { return; }
    if (evt.type === 'content_block_delta' && evt.delta && evt.delta.type === 'text_delta') {
      full += evt.delta.text;
      if (onDelta) onDelta(evt.delta.text, full);
    } else if (evt.type === 'error') {
      streamError = evt.error && evt.error.message ? evt.error.message : 'stream error';
    }
  });
  if (streamError) throw new Error(`Anthropic API error (stream): ${streamError}`);
  return full;
}

async function callOpenRouter(apiKey, model, userPrompt, onDelta) {
  const res = await fetchWithRetry(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model || 'deepseek/deepseek-chat-v3-0324',
      max_tokens: 8192,
      temperature: 0.2,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      stream: true,
    }),
  });
  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`OpenRouter API error (${res.status}): ${errBody.slice(0, 500)}`);
  }

  let full = '';
  await readSse(res, (payload) => {
    let evt;
    try { evt = JSON.parse(payload); } catch (e) { return; }
    const delta = evt.choices && evt.choices[0] && evt.choices[0].delta && evt.choices[0].delta.content;
    if (delta) {
      full += delta;
      if (onDelta) onDelta(delta, full);
    }
  });
  return full;
}

/**
 * Calls the chosen provider and returns the parsed analysis dict, matching
 * analyzer.py's analyze() shape and error-fallback behavior.
 * @param {(chunk: string, totalSoFar: string) => void} [onDelta] - optional live-progress callback.
 */
async function analyze(budgetText, filename, pageCount, referenceData, apiKey, provider, model, onDelta) {
  const userPrompt = buildPrompt(budgetText, filename, pageCount, referenceData);

  const raw = provider === 'openrouter'
    ? await callOpenRouter(apiKey, model, userPrompt, onDelta)
    : await callAnthropic(apiKey, model, userPrompt, onDelta);

  let result;
  try {
    result = extractJson(raw);
  } catch (e) {
    result = {};
    for (const dim of DIMENSIONS) {
      result[dim] = { summary: 'Parse error — see analyst notes', key_stats: [], sources: [] };
    }
    result.document_title = filename;
    result.state_name = 'Unknown';
    result.fiscal_year = 'Unknown';
    result.analysis_date = new Date().toISOString().slice(0, 10);
    result.document_type_summary = '';
    result.key_concerns = [];
    result.key_positives = [];
    result.policy_recommendations = [];
    result.analyst_notes = `JSON parse failed: ${e.message}\n\nRaw response:\n${raw.slice(0, 3000)}`;
  }

  if (!result.analysis_date) result.analysis_date = new Date().toISOString().slice(0, 10);
  if (!result.document_type_summary) result.document_type_summary = '';
  return result;
}
