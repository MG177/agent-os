#!/usr/bin/env bash
# Design-system token guard.
#
# The accent is a TOKEN, not a literal: use bg-primary / text-primary /
# text-primary-foreground / bg-accent / border-primary / ring-ring, never
# bg-blue-600 / text-blue-700 / etc. Elevation is the neutral shadow scale
# (shadow-sm/md/lg) — never a colored glow. No violet→blue brand gradients.
#
# Categorical/state colors (violet, emerald, amber, rose, sky, cyan) are allowed
# as solid fills/text — only their use as *glow shadows* is banned.
#
# Run from anywhere: apps/web/scripts/check-design-tokens.sh
set -euo pipefail
cd "$(dirname "$0")/.."

PATTERN='(bg|text|border|ring|from|to|decoration)-(blue|indigo)-[0-9]|shadow-(blue|indigo|violet|emerald|amber|sky|cyan|rose)-[0-9]|bg-gradient-to-[a-z]+ from-(violet|indigo)'

if grep -rEn "$PATTERN" src --include=*.tsx --include=*.ts --include=*.css; then
  echo ""
  echo "✗ design-system guard failed (see matches above)."
  echo "  • accent → use primary tokens (bg-primary, text-primary, bg-accent, ring-ring)"
  echo "  • elevation → shadow-sm/md/lg only (no colored glow)"
  echo "  • no violet→blue brand gradients"
  echo "  See docs/design-system.md."
  exit 1
fi

echo "✓ design-system guard: clean"
