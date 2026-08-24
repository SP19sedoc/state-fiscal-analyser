"""
One-time local build script: turns sorted-summit-plain/reference_docs/*.pdf into
one static JSON file per Indian state, for the zero-backend static site to fetch
on demand at runtime instead of doing a live vector-search RAG lookup.

Run manually whenever reference_docs/ changes:
    python3 scripts/build_reference_data.py [--source PATH]

Deliberately does NOT import from sorted-summit-plain/ — this repo must stay
fully independent (per the "new files/folders, keep the old app as-is" ask).
The state-matching logic below is a direct copy of retriever.py's proven
_normalize()/_matching_sources() approach (verified against all 32 states with
zero cross-contamination earlier in the same project) — kept in sync manually,
not shared code.
"""
import argparse
import json
import os
import re
import sys
from datetime import date

import pdfplumber

INDIAN_STATES = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
    "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
    "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
    "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
    "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
    "Delhi", "Jammu and Kashmir", "Ladakh", "Puducherry",
]

# Same alias table as retriever.py — filenames that abbreviate/misspell the state.
ALIASES = {
    "jnk": "Jammu and Kashmir",
}

MAX_REFERENCE_CHARS_PER_STATE = 50_000


def normalize(s: str) -> str:
    return re.sub(r"[^a-z0-9]", "", s.lower())


def slugify(state: str) -> str:
    """Must stay identical to stateDetect.js's slug function."""
    return state.replace(" ", "_")


def bucket_by_state(pdf_files: list[str]) -> dict[str, list[str]]:
    """Returns {state_name: [filenames]}. Warns on 0 or >1 matches per file."""
    buckets: dict[str, list[str]] = {}
    for filename in pdf_files:
        token = re.sub(r"^(CAG|FC|16thFC)_", "", filename, flags=re.IGNORECASE)
        token = re.sub(r"\.pdf$", "", token, flags=re.IGNORECASE)
        norm_token = normalize(token)

        matches = []
        alias_state = ALIASES.get(norm_token)
        if alias_state:
            matches.append(alias_state)
        else:
            for state in INDIAN_STATES:
                norm_state = normalize(state)
                if norm_token and (norm_token in norm_state or norm_state in norm_token):
                    matches.append(state)

        if len(matches) == 0:
            print(f"  ⚠ WARNING: '{filename}' matched no state — skipping", file=sys.stderr)
            continue
        if len(matches) > 1:
            print(f"  ⚠ WARNING: '{filename}' matched multiple states {matches} — skipping", file=sys.stderr)
            continue

        buckets.setdefault(matches[0], []).append(filename)
    return buckets


def extract_text(filepath: str, char_cap: int) -> tuple[str, int, bool]:
    """Returns (text, page_count, truncated)."""
    pages = []
    with pdfplumber.open(filepath) as pdf:
        page_count = len(pdf.pages)
        for i, page in enumerate(pdf.pages, start=1):
            text = page.extract_text() or ""
            pages.append(f"--- Page {i} ---\n{text}")
    full_text = "\n\n".join(pages)
    truncated = len(full_text) > char_cap
    if truncated:
        full_text = full_text[:char_cap]
    return full_text, page_count, truncated


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", default="../sorted-summit-plain/reference_docs",
                        help="Path to the reference_docs/ folder (read in place, never copied)")
    parser.add_argument("--out", default="data/reference",
                        help="Output directory for the generated JSON files")
    args = parser.parse_args()

    script_dir = os.path.dirname(os.path.abspath(__file__))
    repo_root = os.path.dirname(script_dir)
    source_dir = os.path.normpath(os.path.join(repo_root, args.source))
    out_dir = os.path.normpath(os.path.join(repo_root, args.out))

    if not os.path.isdir(source_dir):
        print(f"✗ Source folder not found: {source_dir}", file=sys.stderr)
        sys.exit(1)

    pdf_files = sorted(f for f in os.listdir(source_dir) if f.lower().endswith(".pdf"))
    print(f"Found {len(pdf_files)} reference PDFs in {source_dir}")

    buckets = bucket_by_state(pdf_files)
    print(f"Bucketed into {len(buckets)} states")

    os.makedirs(out_dir, exist_ok=True)
    state_slugs = []

    for state, filenames in sorted(buckets.items()):
        cap_per_file = MAX_REFERENCE_CHARS_PER_STATE // len(filenames)
        sources = []
        for filename in filenames:
            filepath = os.path.join(source_dir, filename)
            print(f"  [{state}] extracting {filename} (cap {cap_per_file:,} chars)…")
            try:
                text, page_count, truncated = extract_text(filepath, cap_per_file)
            except Exception as e:
                print(f"    ✗ Failed to extract {filename}: {e}", file=sys.stderr)
                continue
            sources.append({
                "filename": filename,
                "text": text,
                "char_count": len(text),
                "page_count": page_count,
                "truncated": truncated,
            })

        if not sources:
            continue

        slug = slugify(state)
        state_slugs.append(slug)
        out_path = os.path.join(out_dir, f"{slug}.json")
        with open(out_path, "w") as f:
            json.dump({
                "state": state,
                "generated_at": date.today().isoformat(),
                "sources": sources,
            }, f)
        total_chars = sum(s["char_count"] for s in sources)
        print(f"  ✓ wrote {out_path} ({len(sources)} file(s), {total_chars:,} chars total)")

    index_path = os.path.join(out_dir, "index.json")
    with open(index_path, "w") as f:
        json.dump({"states": sorted(state_slugs)}, f, indent=2)
    print(f"\n✓ Done. {len(state_slugs)} states written. Index: {index_path}")


if __name__ == "__main__":
    main()
