#!/bin/bash
set -euo pipefail

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
LOG_DIR="${LOG_DIR:-logs}"                   # directory for per-spec log files

# ── Spec list (order matters) ──────────────────────────────────────────────
SPECS=(
  # Core package specs (sequential)
  spec/001-workspace-bootstrap.md
  spec/002-types-and-contracts.md
  spec/003-trace-parser.md
  spec/004-content-pipeline.md
  spec/005-runtime-worker-and-adapters.md
  spec/006-orchestrator.md
  spec/007-cli-trace-replay.md

  # UI sprints — Phase 1: Minimal Viable Debugger
  spec/ui/sprint-01-app-shell-and-routing.md
  spec/ui/sprint-02-load-bundled-example.md
  spec/ui/sprint-03-flat-instruction-list.md
  spec/ui/sprint-04-registers-and-status.md
  spec/ui/sprint-05-single-step.md
  spec/ui/sprint-06-memory-panel.md
  spec/ui/sprint-07-debugger-layout.md
  spec/ui/sprint-08-run-pause-reset-load.md

  # UI sprints — Phase 2: Complete Load Wizard
  spec/ui/sprint-09-full-example-browser.md
  spec/ui/sprint-10-file-upload.md
  spec/ui/sprint-11-url-and-manual-hex.md
  spec/ui/sprint-12-detection-summary.md
  spec/ui/sprint-13-spi-entrypoint-config.md

  # UI sprints — Phase 3: Drawer + Settings
  spec/ui/sprint-14-bottom-drawer-shell.md
  spec/ui/sprint-15-settings-tab.md
  spec/ui/sprint-16-stepping-modes.md
  spec/ui/sprint-17-keyboard-shortcuts.md

  # UI sprints — Phase 4: Host Calls + Traces
  spec/ui/sprint-18-host-call-resume.md
  spec/ui/sprint-19-host-call-drawer-tab.md
  spec/ui/sprint-20-host-call-storage.md
  spec/ui/sprint-21-ecalli-trace-tab.md
  spec/ui/sprint-22-ecalli-trace-raw-and-download.md
  spec/ui/sprint-23-logs-tab.md

  # UI sprints — Phase 5: Multi-PVM
  spec/ui/sprint-24-multi-pvm-tabs.md
  spec/ui/sprint-25-divergence-detection.md

  # UI sprints — Phase 6: Panel Polish
  spec/ui/sprint-26-instructions-breakpoints.md
  spec/ui/sprint-27-instructions-blocks-and-virtualization.md
  spec/ui/sprint-28-instructions-asm-raw-and-popover.md
  spec/ui/sprint-29-registers-inline-editing.md
  spec/ui/sprint-30-registers-change-highlighting.md
  spec/ui/sprint-31-memory-spi-labels-and-editing.md
  spec/ui/sprint-32-memory-change-highlighting.md

  # UI sprints — Phase 7: Cross-Cutting + Wrap-Up
  spec/ui/sprint-33-block-stepping.md
  spec/ui/sprint-34-persistence-and-reload.md
  spec/ui/sprint-35-mobile-responsive.md
  spec/ui/sprint-36-integration-smoke-test.md
  spec/ui/sprint-37-user-documentation.md
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
    2> >(tee -a "$current_log" >&2) \
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
