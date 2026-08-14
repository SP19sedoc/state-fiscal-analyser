// Port of sorted-summit-plain/retriever.py's detect_state() + the fetch-by-state
// half of retrieve(). The embedding/vector-search half is gone entirely — replaced
// by a pre-built static JSON file per state (see scripts/build_reference_data.py).
//
// The state-scoping guarantee from retriever.py carries over unchanged: an
// analysis is cross-checked ONLY against that same state's own CAG/FC documents,
// never another state's, and never silently — a state with no reference data
// returns null rather than falling back to something unrelated.

/**
 * Scans the first 3000 chars of the document for a known Indian state name.
 * Same heuristic as retriever.py's detect_state().
 * @param {string} text
 * @returns {string|null}
 */
function detectState(text) {
  const sample = text.slice(0, 3000).toLowerCase();
  for (const state of INDIAN_STATES) {
    if (sample.includes(state.toLowerCase())) {
      return state;
    }
  }
  return null;
}

/** Must stay identical to build_reference_data.py's slugify(). */
function slugifyState(state) {
  return state.replace(/ /g, '_');
}

let _referenceIndexCache = null;

async function _loadReferenceIndex() {
  if (_referenceIndexCache === null) {
    const res = await fetch('data/reference/index.json');
    if (!res.ok) {
      console.warn('Could not load data/reference/index.json — proceeding with no reference data.');
      _referenceIndexCache = { states: [] };
    } else {
      _referenceIndexCache = await res.json();
    }
  }
  return _referenceIndexCache;
}

/**
 * Detects the state from the uploaded document's text, then fetches that state's
 * pre-built reference JSON if one exists. Returns null (not a fallback to some
 * other state) if the state can't be detected or has no reference data — the
 * analysis proceeds using only the uploaded document in that case, exactly as
 * the Python retriever.retrieve() did when no reference docs existed.
 *
 * @param {string} documentText
 * @returns {Promise<{state: string, sources: Array<{filename:string, text:string}>} | null>}
 */
async function fetchReferenceData(documentText) {
  const state = detectState(documentText);
  if (!state) return null;

  const index = await _loadReferenceIndex();
  const slug = slugifyState(state);
  if (!index.states.includes(slug)) {
    console.info(`No reference data available for ${state} — analysis will use the uploaded document only.`);
    return null;
  }

  const res = await fetch(`data/reference/${slug}.json`);
  if (!res.ok) {
    console.warn(`Failed to fetch reference data for ${state} (${res.status}) — proceeding without it.`);
    return null;
  }
  const data = await res.json();
  return data;
}
