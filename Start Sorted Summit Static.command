#!/bin/bash
cd "$(dirname "$0")"
echo "=================================================="
echo "  SORTED SUMMIT — Static (no server, no backend)"
echo "  $(date '+%A, %d %B %Y')"
echo "=================================================="
echo ""
echo "  Starting a local file server on http://127.0.0.1:8123"
echo "  Opening browser…"
echo ""
sleep 1
open "http://127.0.0.1:8123"
python3 -m http.server 8123
