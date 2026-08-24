# Handoff — Sorted Summit (static)

Last updated: 2026-08-24

For setup, running locally, and a feature list, see [`README.md`](README.md).
This document is a status/handoff note: what changed recently, what's still
uncommitted, and what to check before shipping.

## ⚠️ Repository status — read this first

**Nothing has been committed since the initial two commits.** The working
tree currently has substantial uncommitted changes across five files, from
two different sources:

1. **Pre-existing local changes** (already sitting uncommitted before this
   round of work started, not made by this assistant): `app.js`,
   `index.html` carry large diffs (200 / 33 lines) that
   add — among other things — the classroom-mode prediction flow, the
   provider/model settings panel, and a rename of
   the app from "SORTED SUMMIT" to "State Budget Analyser" and its theme
   names from Storybook/Playground/Arcade to Warm/Modern/Neon. **These have
   not been reviewed or tested as part of this handoff** — treat them as an
   in-progress feature branch that needs its own look before merging/committing.
2. **This session's changes** (detailed below): `trivia.js` (new, untracked),
   `styles.css`, `llmClient.js`, and small parts of `index.html` and
   `reportRender.js`. (`llmClient.js`'s original streaming/multi-provider
   groundwork was pre-existing per #1 above, but this session made further,
   deliberate edits to it — see item 7 below — so it's no longer purely
   "someone else's untested diff.")

Run `git diff app.js llmClient.js` and the non-trivia parts of
`git diff index.html` to see #1 in full before deciding what to commit.

Nothing has been pushed to `origin`
(`https://github.com/SP19sedoc/state-fiscal-analyser.git`) — if there's a
live deployment (e.g. GitHub Pages), it is running the **last commit only**
and reflects none of the work described below.

Also present, not part of the app: `trivia-repository.xlsx` (source
spreadsheet, untracked — see below), and a stray Excel lock file
`~$trivia-repository.xlsx` that's safe to delete.

## What changed this session

Chronological summary; see individual commits-to-be for the actual diffs.

1. **Built a 120-fact trivia repository** (`trivia-repository.xlsx`) from
   `data/reference/*.json` — the CAG State Finances Audit Report and 16th
   Finance Commission evaluation report excerpts already stored per state.
   Six parallel research passes extracted 4 facts per state (30 states ×
   4), each grounded in an actual figure from the source text — no invented
   numbers. A sample was spot-checked against the source JSON afterward.
2. **Wired those facts into the live app** — `trivia.js`'s `TRIVIA_FACTS`
   array now holds all 120 state-specific facts, replacing the original 22
   generic public-finance-definition facts. No changes needed to how the
   ticker is invoked (`app.js` already calls `startTrivia()`/`stopTrivia()`
   around the analyze step).
3. **Fixed mobile layout order** (`styles.css`) — below 700px, the page
   used to stack the sidebar (title, 9-dimension list, toggles) *above* the
   actual upload form / report content, burying the primary action below a
   full scroll. Now the main content renders first (`order` on the existing
   flex children), with a compact `.mobile-header` (title + tagline only)
   kept pinned at the very top so branding isn't lost. Caught and fixed a
   follow-on bug from the same change: the desktop `align-items: flex-start`
   rule left the sidebar shrunk to its content width once stacked vertically
   — added a mobile-scoped `align-items: stretch` override.
4. **Fixed a report-page theming bug** (`reportRender.js`) — first-time
   visitors (no saved theme in `localStorage`) got the report rendered in
   Neon/arcade, while the upload page correctly defaulted to Modern. The
   report's own theme-init code had a mismatched fallback (`'arcade'`
   instead of `'playground'`); fixed to match.
5. **Removed duplicate copy** — the sidebar's intro paragraph
   (`index.html`) nearly duplicated the main upload card's own description
   and was removed; a redundant "entirely in your browser, no server
   involved" clause was trimmed from that same paragraph since the status
   bar already states it as a badge; the sticky status bar's label
   (`"Upload a State Budget Document"`) duplicated the card's `<h2>` right
   below it and was removed, leaving just the informational tag.
6. **Tuned the trivia rotation interval** (`trivia.js`) — per feedback that
   the facts were hard to read in time, raised from the original 5s to 9s,
   then to 15s. Verified with a `MutationObserver` timing harness against a
   cache-free origin (see the caching note below) that 15000ms is what
   actually ships.
7. **Fixed Anthropic reports failing outright** (`llmClient.js`) — every
   Anthropic run on a real test document (`Odisha.pdf`, both providers
   tested by the user) came back as "Unknown Unknown" with every dimension
   reading `"Parse error — see analyst notes"`. The captured raw response
   showed the JSON cut off mid-sentence, still inside the *first* of nine
   dimensions — the signature of hitting `max_tokens`, not a real malformed
   response. Both `callAnthropic` and `callOpenRouter` had `max_tokens:
   8192` hardcoded, while `claude-sonnet-4-6` supports up to 128k output
   tokens natively and Claude was visibly more verbose per field than
   DeepSeek was for the same prompt. Raised to `32000` (Anthropic) /
   `16000` (OpenRouter) — free headroom, since providers bill for tokens
   actually generated, not this ceiling. Also added `stop_reason`/
   `finish_reason` truncation detection to both streaming paths, so if a
   document is ever large enough to exceed even the new cap, the fallback
   `analyst_notes` says so specifically instead of showing a generic JSON
   parse error. Verified via a synthetic-SSE-stream harness in the browser
   console (no live Anthropic key available in this environment) — the
   user should re-run the same PDF through Anthropic to confirm a complete
   report now comes back.

## Known caveats / things to watch

- **Aggressive browser caching of static JS/CSS.** Neither `python3 -m
  http.server` nor the file references in `index.html` set cache-busting
  (no version query strings, no cache-control headers). During this
  session, a browser tab that had loaded the page once kept serving a
  stale cached `trivia.js` on every subsequent reload — even in a brand-new
  tab pointed at the same `localhost` port — until tested against a
  never-before-visited origin. **If a change to `trivia.js`/`styles.css`/
  any JS file doesn't seem to be taking effect, hard-refresh (Cmd+Shift+R)
  or test in a private window before assuming the code is wrong.** Worth
  considering a cache-busting query param (e.g. `trivia.js?v=2`) if this
  keeps causing confusion for real users after deploys.
- **Trivia fact accuracy** — each of the 120 facts cites a real figure from
  `data/reference/*.json`, but that reference data is itself a *truncated*
  excerpt (~25–50K characters) of much longer source PDFs (150–300 pages
  each). Facts were extracted from the captured excerpt only and spot
  checked (not exhaustively verified against the full original PDFs).
- **The pre-existing uncommitted work in `app.js` / `index.html`**
  (classroom mode, multi-provider settings) — see the repository-status
  section above. Untested by this session, aside from the specific
  `llmClient.js` bug fixed in item 7.
- **`max_tokens` was raised, not made unbounded.** If a much larger/denser
  budget document than `Odisha.pdf` still exceeds 32000 (Anthropic) /
  16000 (OpenRouter) output tokens, the new truncation detection will at
  least surface a clear message instead of a silent parse failure — but
  the underlying fix would be raising the cap further (both models support
  well beyond these values) or trimming the schema's verbosity.

## Suggested next steps

1. Review the non-trivia diffs in `app.js`, `llmClient.js`, and `index.html`
   and confirm that feature work (classroom mode, provider settings,
   streaming) is finished and desired before committing it.
2. Decide on a commit plan — likely one commit for the pre-existing feature
   work and one (or a few) for this session's trivia/mobile/copy fixes, so
   the history stays legible.
3. Push to `origin` and confirm the deployment (GitHub Pages or otherwise)
   picks up the changes; if users hit the caching issue above post-deploy,
   consider adding cache-busting to the script/style tags.
4. Delete `~$trivia-repository.xlsx` (Excel lock file, not a real asset).
   `trivia-repository.xlsx` itself is optional to commit — it's the source
   record for `trivia.js`'s fact set but isn't read by the app at runtime.
