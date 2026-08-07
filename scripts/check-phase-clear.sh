#!/usr/bin/env bash
# Fail if a PHASE_N_HUMAN_CHECKLIST.md is not fully cleared.
# Usage: ./scripts/check-phase-clear.sh docs/phases/PHASE_N_HUMAN_CHECKLIST.md
set -euo pipefail

if [ $# -ne 1 ]; then
  echo "usage: $0 path/to/PHASE_N_HUMAN_CHECKLIST.md" >&2
  exit 2
fi

CHECKLIST="$1"

if [ ! -f "$CHECKLIST" ]; then
  echo "error: checklist not found: $CHECKLIST" >&2
  exit 2
fi

fail=0

# Unchecked markdown task items: "- [ ]" at line start (optional leading spaces)
unchecked="$(rg -n --pcre2 '^\s*- \[ \]' "$CHECKLIST" || true)"
if [ -n "$unchecked" ]; then
  count="$(printf '%s\n' "$unchecked" | wc -l | tr -d ' ')"
  echo "FAIL: $count unchecked box(es) in $CHECKLIST"
  printf '%s\n' "$unchecked"
  fail=1
fi

# Sign-off table: require non-empty Tester and Date cell values.
# Matches rows like: | Tester | value |  or  | Tester | |
tester_line="$(rg -n --pcre2 '^\|\s*Tester\s*\|' "$CHECKLIST" || true)"
date_line="$(rg -n --pcre2 '^\|\s*Date\s*\|' "$CHECKLIST" || true)"

extract_value() {
  # second pipe-delimited cell, trimmed
  printf '%s' "$1" | awk -F'|' '{
    v=$3
    gsub(/^[ \t]+|[ \t]+$/, "", v)
    print v
  }'
}

if [ -z "$tester_line" ]; then
  echo "FAIL: no Tester row in sign-off table ($CHECKLIST)"
  fail=1
else
  tester_val="$(extract_value "$tester_line")"
  if [ -z "$tester_val" ]; then
    echo "FAIL: Tester sign-off is empty ($CHECKLIST)"
    echo "$tester_line"
    fail=1
  fi
fi

if [ -z "$date_line" ]; then
  echo "FAIL: no Date row in sign-off table ($CHECKLIST)"
  fail=1
else
  date_val="$(extract_value "$date_line")"
  if [ -z "$date_val" ]; then
    echo "FAIL: Date sign-off is empty ($CHECKLIST)"
    echo "$date_line"
    fail=1
  fi
fi

if [ "$fail" -ne 0 ]; then
  echo ""
  echo "Phase is NOT cleared. Do not mark COMPLETE. Do not start the next phase."
  exit 1
fi

echo "OK: $CHECKLIST is fully cleared (no unchecked boxes; Tester and Date filled)."
exit 0
