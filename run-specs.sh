#!/bin/bash
set -euo pipefail

# Kill all child processes on exit (Ctrl+C, etc.)
cleanup() {
  printf "\n\033[1;31mInterrupted — killing child processes...\033[0m\n"
  kill -- -$$ 2>/dev/null || true
  exit 130
}
trap cleanup INT TERM

# ── Configuration ──────────────────────────────────────────────────────────
MAGIC="XYZZY_SPEC_DONE"
MAX_NUDGES=5
CL="${CL:-claude}"
MODEL="${MODEL:-}"                           # e.g. MODEL=opus ./run-specs.sh
SKIP_PERMISSIONS="${SKIP_PERMISSIONS:-1}"    # set to 0 to use normal permission mode
START_FROM="${START_FROM:-}"                  # e.g. START_FROM=spec/004-content-pipeline.md
DRY_RUN="${DRY_RUN:-}"                       # set to 1 to print prompts without running
LOG_DIR="${LOG_DIR:-logs}"                   # directory for per-spec log files

# ── Spec list (order matters) ──────────────────────────────────────────────
SPECS=(
  spec/001-workspace-bootstrap.md
  spec/002-types-and-contracts.md
  spec/003-trace-parser.md
  spec/004-content-pipeline.md
  spec/005-runtime-worker-and-adapters.md
  spec/006-orchestrator.md
  spec/007-cli-trace-replay.md
  spec/ui/001-app-shell-and-routing.md
  spec/ui/002-load-wizard-step1.md
  spec/ui/003-load-wizard-step2.md
  spec/ui/004-debugger-layout.md
  spec/ui/005-instructions-panel.md
  spec/ui/006-registers-and-status.md
  spec/ui/007-memory-panel.md
  spec/ui/008-execution-controls.md
  spec/ui/009-pvm-tabs-and-divergence.md
  spec/ui/010-drawer-settings-tab.md
  spec/ui/011-drawer-trace-log-tab.md
  spec/ui/011b-drawer-logs-tab.md
  spec/ui/012-drawer-host-call-tab.md
  spec/ui/013-persistence-and-reload.md
  spec/ui/014-block-stepping.md
  spec/ui/015-integration-smoke-test.md
  spec/ui/016-user-documentation.md
)

# ── Helpers ────────────────────────────────────────────────────────────────
cl_args=(-p)
[[ "$SKIP_PERMISSIONS" == "1" ]] && cl_args+=(--dangerously-skip-permissions)
[[ -n "$MODEL" ]] && cl_args+=(--model "$MODEL")

log()  { printf "\n\033[1;36m>>> %s\033[0m\n" "$*"; }
warn() { printf "\033[1;33m!!! %s\033[0m\n" "$*"; }
err()  { printf "\033[1;31mERR %s\033[0m\n" "$*"; }

# current_log is set per-spec in the main loop
current_log=""

run_cl() {
  # $1 = prompt, rest = extra args
  local prompt="$1"; shift
  if [[ -n "$DRY_RUN" ]]; then
    echo "[DRY RUN] $CL ${cl_args[*]} $* ..." >&2
    echo "{\"result\":\"$MAGIC\",\"session_id\":\"dry-run\"}"
    return
  fi
  "$CL" "${cl_args[@]}" "$@" --output-format json "$prompt" 2> >(tee -a "$current_log" >&2)
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

  # Set up per-spec log file
  spec_slug=$(echo "$spec" | sed 's|/|_|g; s|\.md$||')
  mkdir -p "$LOG_DIR"
  current_log="$LOG_DIR/${spec_slug}.log"
  : > "$current_log"  # truncate

  log "Starting: $spec — $spec_title"
  log "Log file: $current_log (tail -f $current_log)"

  # ── Phase 1: Implementation ─────────────────────────────────────────────
  impl_prompt="$(cat <<EOF
You are implementing ONE spec for the PVM debugger rewrite. This is your ONLY task.

SPEC FILE: $spec
Read it now with the Read tool. It contains exact interfaces, file paths, and acceptance criteria.

IMPORTANT: You must work on THIS SPEC ONLY. Do NOT look at other spec files. Do NOT implement
anything from other specs. Do NOT bundle multiple tasks together. Focus entirely on $spec.

RULES:
1. Read AGENTS.md, docs/rewrite-architecture.md, and the spec file before writing any code.
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

  json_out=$(run_cl "$impl_prompt")
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

    json_out=$(run_cl "$nudge_prompt" --resume "$session_id")
    result=$(extract_json_field "$json_out" "result")
  done

  # ── Phase 3: Reflect ────────────────────────────────────────────────────
  log "Reflecting on $spec..."

  reflect_prompt="Reflect on the implementation of $spec using /reflect"
  run_cl "$reflect_prompt" --resume "$session_id" >/dev/null

  log "Completed: $spec"
  echo "────────────────────────────────────────────────────────────"
done

log "All specs processed!"
