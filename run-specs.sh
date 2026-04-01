#!/bin/bash
set -euo pipefail

# ── CLI flags ─────────────────────────────────────────────────────────────
for arg in "$@"; do
  case "$arg" in
    --last) LAST_ONLY=1 ;;
    --dry)  DRY_RUN=1 ;;
    --help|-h)
      echo "Usage: ./run-specs.sh [--last] [--dry]"
      echo "  --last  Run only the last (most recent) spec"
      echo "  --dry   Print prompts without running Claude"
      echo ""
      echo "Environment variables:"
      echo "  START_FROM=spec/...  Skip specs before this one"
      echo "  MODEL=opus           Override Claude model"

      exit 0
      ;;
  esac
done

# ── Signal handling ───────────────────────────────────────────────────────
# Use a temp file for child output so the child runs as a direct child of
# this script (not inside a command-substitution subshell). This lets
# SIGINT propagate cleanly when the user presses Ctrl+C.
CL_OUTPUT=$(mktemp)

cleanup() {
  set +e  # don't exit on errors during cleanup
  printf "\n\033[1;31mInterrupted — stopping...\033[0m\n"
  # Kill all children in our process group
  kill -- -$$ 2>/dev/null || true
  rm -f "$CL_OUTPUT"
  exit 130
}
trap cleanup INT TERM
trap 'rm -f "$CL_OUTPUT"' EXIT

# ── Configuration ──────────────────────────────────────────────────────────
MAGIC="XYZZY_SPEC_DONE"
MAX_NUDGES=5
CL="${CL:-claude}"
MODEL="${MODEL:-}"                           # e.g. MODEL=opus ./run-specs.sh
SKIP_PERMISSIONS="${SKIP_PERMISSIONS:-1}"    # set to 0 to use normal permission mode
START_FROM="${START_FROM:-}"                  # e.g. START_FROM=spec/004-content-pipeline.md
DRY_RUN="${DRY_RUN:-}"                       # set to 1 to print prompts without running

LAST_ONLY="${LAST_ONLY:-}"                   # set to 1 to run only the last spec

# ── Helpers ────────────────────────────────────────────────────────────────
cl_args=(-p)
[[ "$SKIP_PERMISSIONS" == "1" ]] && cl_args+=(--dangerously-skip-permissions)
[[ -n "$MODEL" ]] && cl_args+=(--model "$MODEL")

log()  { printf "\n\033[1;36m>>> %s\033[0m\n" "$*"; }
warn() { printf "\033[1;33m!!! %s\033[0m\n" "$*"; }
err()  { printf "\033[1;31mERR %s\033[0m\n" "$*"; }

# ── Spec list (auto-scanned, sorted by filename) ─────────────────────────
SPECS=()
while IFS= read -r f; do SPECS+=("$f"); done < <(
  # Core specs: spec/NNN-*.md (exclude README and non-spec files)
  find spec -maxdepth 1 -name '[0-9]*-*.md' -type f | sort
  # UI sprint specs: spec/ui/sprint-*.md
  find spec/ui -maxdepth 1 -name 'sprint-*.md' -type f | sort -t- -k2,2 -V
)

if [[ -z "${SPECS[*]}" ]]; then
  err "No spec files found in spec/ or spec/ui/"
  exit 1
fi

# ── --last flag: keep only the last spec ──────────────────────────────────
if [[ -n "$LAST_ONLY" ]]; then
  SPECS=("${SPECS[${#SPECS[@]}-1]}")
  log "Running last spec only: ${SPECS[0]}"
fi


run_cl() {
  # $1 = prompt, rest = extra args. Writes JSON output to $CL_OUTPUT.
  local prompt="$1"; shift
  if [[ -n "$DRY_RUN" ]]; then
    echo "[DRY RUN] $CL ${cl_args[*]} $* ..." >&2
    echo "{\"result\":\"$MAGIC\",\"session_id\":\"dry-run\"}" > "$CL_OUTPUT"
    return 0
  fi
  # Run child in foreground (not inside $(...) subshell) so Ctrl+C
  # propagates SIGINT directly to both the script and the child.
  "$CL" "${cl_args[@]}" "$@" --output-format json "$prompt" \
    > "$CL_OUTPUT" \
    || true  # don't let set -e kill us on non-zero exit
}

extract_json_field() {
  # $1 = json string, $2 = field name — lightweight, no python needed
  echo "$1" | sed -n "s/.*\"$2\":\"\([^\"]*\)\".*/\1/p" | head -1
}

# ── Main loop ──────────────────────────────────────────────────────────────
skipping=true
[[ -z "$START_FROM" ]] && skipping=false

for spec in "${SPECS[@]}"; do
  # Handle START_FROM
  if $skipping; then
    if [[ "$spec" == "$START_FROM" ]]; then
      skipping=false
    else
      log "Skipping $spec (START_FROM=$START_FROM)"
      continue
    fi
  fi

  spec_title=$(head -1 "$spec" | sed 's/^#* *//')

  log "Starting: $spec — $spec_title"

  # ── Phase 1: Implementation ─────────────────────────────────────────────
  impl_prompt="$(cat <<EOF
You are implementing ONE spec for the PVM debugger rewrite. This is your ONLY task.

SPEC FILE: $spec
Read it now with the Read tool. It contains exact interfaces, file paths, and acceptance criteria.

IMPORTANT: You must work on THIS SPEC ONLY. Do NOT look at other spec files. Do NOT implement
anything from other specs. Do NOT bundle multiple tasks together. Focus entirely on $spec.

RULES:
1. Read AGENTS.md and the spec file before writing any code.
2. Implement ONLY what this spec requires — nothing more, nothing less.
3. Follow all constraints in AGENTS.md (package namespace, no Redux, real interpreters, etc.).
4. Run the verify/test commands from the spec to confirm everything passes.
5. Commit all changes with a descriptive commit message.
6. Mark the spec as implemented by adding "Status: Implemented" near the top of the spec file and commit that too.

When you are FULLY DONE (code written, tests passing, changes committed, spec marked), end your
response with exactly this line:
$MAGIC

Do NOT output $MAGIC until everything is committed and verified.
EOF
)"

  run_cl "$impl_prompt"
  json_out=$(cat "$CL_OUTPUT")
  session_id=$(extract_json_field "$json_out" "session_id")
  result=$(extract_json_field "$json_out" "result")

  log "Session: $session_id"

  # ── Phase 2: Nudge loop ─────────────────────────────────────────────────
  nudge=0
  while ! echo "$result" | grep -qF "$MAGIC"; do
    nudge=$((nudge + 1))
    if [[ $nudge -gt $MAX_NUDGES ]]; then
      err "Giving up on $spec after $MAX_NUDGES nudges. Moving on."
      break
    fi

    warn "Magic sequence not found (nudge $nudge/$MAX_NUDGES). Pushing to finish..."

    nudge_prompt="$(cat <<EOF
You are not done yet. The spec $spec must be fully implemented, tested, and committed.

If you are stuck on something, make your best judgement call and proceed.
If tests are failing, fix them. If you are unsure about a design choice, pick the simpler option.
Do not ask questions — make decisions and finish the work.

When FULLY DONE (code written, tests pass, changes committed, spec marked as implemented), reply with exactly:
$MAGIC
EOF
)"

    run_cl "$nudge_prompt" --resume "$session_id"
    json_out=$(cat "$CL_OUTPUT")
    result=$(extract_json_field "$json_out" "result")
  done

  # ── Phase 3: Reflect ────────────────────────────────────────────────────
  log "Reflecting on $spec..."

  reflect_prompt="Reflect on the implementation of $spec using /reflect"
  run_cl "$reflect_prompt" --resume "$session_id"

  log "Completed: $spec"
  echo "────────────────────────────────────────────────────────────"
done

log "All specs processed!"
