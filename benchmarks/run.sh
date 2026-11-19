#!/usr/bin/env bash
# hstack benchmark: the same task done two ways, with exact token accounting.
#
# Usage: benchmarks/run.sh <benchmark-dir> solo|hstack
#   solo    the frontier model alone implements base/BENCH-SPEC.md
#   hstack  the frontier writes a short intake; a small-model lead does spec, plan, tests and code
#           (with its own sub-agents); the frontier answers each checkpoint (one call per event)
#           and approves the result
# Then:    python3 benchmarks/cost.py benchmarks/.work/<benchmark>/results
#
# Both sides run in Muse Code (muse exec --json, so every call's token usage is recorded).
# Env: FRONTIER_MODEL (default muse-wonder-1.0), SMALL_MODEL (default muse-spark-1.3-contributor),
#      MAX_EVENTS (default 12), PROGRESS (0 disables the progress window).
set -uo pipefail

HERE=$(cd "$(dirname "$0")" && pwd)
H=$(cd "$HERE/.." && pwd)
D=$(cd "${1:?usage: run.sh <benchmark-dir> solo|hstack}" && pwd)
mode=${2:?solo|hstack}
NAME=$(basename "$D")
WORK=$HERE/.work/$NAME
R=$WORK/results
FRONTIER_MODEL=${FRONTIER_MODEL:-muse-wonder-1.0}
SMALL_MODEL=${SMALL_MODEL:-muse-spark-1.3-contributor}
mkdir -p "$R"

DEPS=$WORK/deps
if [ ! -d "$DEPS/node_modules" ]; then
  mkdir -p "$DEPS" && cp "$D/base/package.json" "$DEPS/" && (cd "$DEPS" && npm install --silent >/dev/null 2>&1)
fi

fresh() { # copy base/ to $1 as a git repo with node_modules linked
  rm -rf "$1"; mkdir -p "$1"
  (cd "$D/base" && tar -cf - .) | (cd "$1" && tar -xf -)
  ln -s "$DEPS/node_modules" "$1/node_modules"
  (cd "$1" && git init -q && git add -A && git -c user.email=bench@hstack -c user.name=bench commit -qm base)
}

acceptance() { # run the hidden suite in $1, write $2
  mkdir -p "$1/test"; cp "$D/hidden/acceptance.test.ts" "$1/test/acceptance.test.ts"
  (cd "$1" && npx vitest run test/acceptance.test.ts > "$2" 2>&1; npx tsc --noEmit >> "$2" 2>&1 && echo "TSC_OK" >> "$2")
}

muse_call() { # <cwd> <log> <prompt-text>: one frontier call; fails loudly on a non-zero exit
  local cwd=$1 log=$2 prompt="$2.prompt.md"
  printf '%s\n' "$3" > "$prompt"
  (cd "$cwd" && muse exec --json --model "$FRONTIER_MODEL" --prompt-file "$prompt" > "$log" 2>&1)
  local code=$?
  [ $code -ne 0 ] && { echo "frontier call failed ($code): $log" >&2; tail -3 "$log" >&2; exit 1; }
}

if [ "$mode" = solo ]; then
  W=$WORK/run-solo; fresh "$W"
  date +%s > "$R/solo.start"
  muse_call "$W" "$R/solo.frontier.log" "Implement everything in BENCH-SPEC.md in this directory: every module and its tests. You are done only when \`npx tsc --noEmit\` and \`npx vitest run\` both pass. Do not modify package.json, tsconfig.json or vitest.config.ts. Finish with a one-paragraph summary."
  date +%s > "$R/solo.end"
  acceptance "$W" "$R/solo.acceptance.txt"
  echo "solo done: $R"; exit 0
fi

# ---------------- hstack
REPO=$WORK/run-hstack; O=$WORK/run-hstack-orch; fresh "$REPO"; rm -rf "$O"
rm -f "$R"/frontier-*.log "$R"/*.lead.log "$R/events.txt"
date +%s > "$R/hstack.start"
SKILL="$H/skills/hstack/SKILL.md"
n=0
frontier() { # <cwd> <prompt>
  n=$((n + 1)); muse_call "$1" "$R/frontier-$(printf %02d $n).log" "$2"
}

# 1. Intake (frontier). The task statement is BENCH-SPEC.md; the frontier writes only the intake.
mkdir -p "$REPO/.hstack"
frontier "$REPO" "You are the senior engineer. Follow the hstack skill at $SKILL (HSTACK=$H). The task for this repo: implement everything in BENCH-SPEC.md (every module with tests; done when \`npx tsc --noEmit\` and \`npx vitest run\` pass; package.json, tsconfig.json and vitest.config.ts are off-limits). Write ONLY the intake (section 1 of the skill) to .hstack/intake.md, pointing to BENCH-SPEC.md instead of restating it. Do not start the lead; a harness does that. Reply DONE."
[ -s "$REPO/.hstack/intake.md" ] || { echo "no intake written" >&2; exit 1; }

# 2. Start the small-model lead (scripts only).
WT=$(LEAD_CMD="muse exec --json --trust-workspace --model $SMALL_MODEL --prompt-file {prompt}" \
     "$H/scripts/start.sh" "$REPO" "$O" task "$REPO/.hstack/intake.md")
echo "$WT" > "$R/worktree.txt"

# 3. Checkpoint loop: scripts wait for free; the frontier wakes once per event.
events=0; line=""
while :; do
  line=$("$H/scripts/wait.sh" "$WT" 240)
  echo "$line" >> "$R/events.txt"
  case "$line" in
    EVENT*)
      events=$((events + 1))
      [ $events -gt "${MAX_EVENTS:-12}" ] && { echo "too many events" >> "$R/events.txt"; break; }
      set -- $line
      frontier "$WT" "You are the senior engineer. Follow section 3 of the hstack skill at $SKILL (HSTACK=$H). The intake is .hstack/intake.md. Checkpoint from the lead: event $2, file $3. Read the event, decide, and answer with \`$H/scripts/direct.sh $WT $2\`. For a done event, run the definition-of-done commands in this directory once before deciding. Reply with one line."
      ;;
    *) break ;;
  esac
done

# 4. Finish (frontier): merge and confirm.
frontier "$REPO" "You are the senior engineer. Follow section 4 of the hstack skill at $SKILL (HSTACK=$H). The lead has exited ($line). Run \`$H/scripts/collect.sh $O\` and \`$H/scripts/merge.sh $O\`, then \`npx tsc --noEmit\` and \`npx vitest run\` in this directory. Do not write product code. Do not run cleanup. Reply with a 3-line report."
date +%s > "$R/hstack.end"
acceptance "$REPO" "$R/hstack.acceptance.txt"
cp "$O"/logs/*.log "$R/" 2>/dev/null
cp -R "$WT/.hstack" "$R/hstack-checkpoints" 2>/dev/null
echo "hstack done: $R"
