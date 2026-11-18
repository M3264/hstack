#!/usr/bin/env bash
# hstack benchmark runner: the same task, done two ways, with exact token accounting.
#
# Usage: benchmarks/run.sh <benchmark-dir> solo|hstack
#   solo    the large model alone implements base/BENCH-SPEC.md
#   hstack  the large model plans (hstack-plan), small workers build (hstack-run scripts),
#           the large model verifies and merges (hstack-verify)
# Then:   python3 benchmarks/cost.py benchmarks/.work/<benchmark>/results
#
# Env: MODEL (default claude-opus-5-5), AGENT_CMD (default: muse exec --json --prompt-file {prompt};
#      keep --json so worker token usage is recorded), MODE (run.sh mode, default progress),
#      SOLO_BUDGET / PHASE_BUDGET (USD caps per claude run, default 40 / 10).
set -uo pipefail

HERE=$(cd "$(dirname "$0")" && pwd)
H=$(cd "$HERE/.." && pwd)                       # hstack repo root
D=$(cd "${1:?usage: run.sh <benchmark-dir> solo|hstack}" && pwd)
mode=${2:?solo|hstack}
NAME=$(basename "$D")
WORK=$HERE/.work/$NAME                          # git-ignored
R=$WORK/results
MODEL=${MODEL:-claude-opus-5-5}
WORKERS=$(cat "$D/workers.txt")
TOOLS="Read Write Edit Glob Grep Bash"
mkdir -p "$R"

# One shared node_modules per benchmark, installed once from base/package.json.
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

if [ "$mode" = solo ]; then
  W=$WORK/run-solo; fresh "$W"; cd "$W"
  date +%s > "$R/solo.start"
  claude -p "Implement everything in BENCH-SPEC.md in this directory: every module and its tests. You are done only when \`npx tsc --noEmit\` and \`npx vitest run\` both pass. Do not modify package.json, tsconfig.json or vitest.config.ts. Finish with a one-paragraph summary." \
    --model "$MODEL" --output-format json --permission-mode acceptEdits --allowedTools $TOOLS --max-budget-usd "${SOLO_BUDGET:-40}" \
    > "$R/solo.json" 2> "$R/solo.err"
  date +%s > "$R/solo.end"
  acceptance "$W" "$R/solo.acceptance.txt"
  echo "solo done: $R"
  exit 0
fi

W=$WORK/run-hstack; O=$WORK/run-hstack-orch; fresh "$W"; rm -rf "$O"; cd "$W"
date +%s > "$R/hstack.start"

# 1. Plan (large model).
claude -p "You are the hstack orchestrator (the large model). The decision to delegate is already made. Read $H/skills/hstack-plan/SKILL.md (follow 'Keep briefs thin when the spec is already precise') and $H/templates/brief-checklist.md. The full spec is BENCH-SPEC.md in this directory (already written and precise; do not rewrite it). Create one work package per module, named: $WORKERS (independent, no shared stubs). For each write specs/tasks/<name>.md and specs/tasks/<name>.owns, plus one short specs/tasks/_common.md. Workers have no network and must not touch package.json or configs; their definition of done is \`npx tsc --noEmit\` and \`npx vitest run src/<module>.test.ts\`, and their report goes to .orch/<name>.report.md. Do NOT implement the modules and do NOT launch workers: a harness launches them after you finish. Reply DONE." \
  --model "$MODEL" --output-format json --permission-mode acceptEdits --allowedTools $TOOLS --max-budget-usd "${PHASE_BUDGET:-10}" \
  > "$R/hstack.plan.json" 2> "$R/hstack.plan.err"
SID=$(python3 -c "import json;print(json.load(open('$R/hstack.plan.json'))['session_id'])")

# 2. Build (small models). Scripts only: no large-model tokens.
"$H/scripts/setup.sh" "$W" "$O" $WORKERS > "$R/hstack.setup.txt" 2>&1
MODE=${MODE:-progress} TASKS_DIR=specs/tasks AGENT_CMD=${AGENT_CMD:-'muse exec --json --prompt-file {prompt}'} \
  "$H/scripts/run.sh" "$O" > "$R/hstack.run.txt" 2>&1

# 3. Verify and merge (large model, same session).
cd "$W"
claude -p "The workers have finished. Orchestration dir: $O. Follow $H/skills/hstack-verify/SKILL.md: run \`VERIFY_CMD='npx tsc --noEmit && npx vitest run' $H/scripts/collect.sh $O\`, read each worker report in $O/<name>/.orch/, review the patches against BENCH-SPEC.md, merge with \`$H/scripts/merge.sh $O\`, then run \`npx tsc --noEmit\` and \`npx vitest run\` in this directory and fix any remaining problems yourself. Do not run cleanup. Finish with a short report." \
  --resume "$SID" --model "$MODEL" --output-format json --permission-mode acceptEdits --allowedTools $TOOLS --add-dir "$O" --max-budget-usd "${PHASE_BUDGET:-10}" \
  > "$R/hstack.verify.json" 2> "$R/hstack.verify.err"
date +%s > "$R/hstack.end"
acceptance "$W" "$R/hstack.acceptance.txt"
cp "$O"/logs/*.log "$R/" 2>/dev/null
echo "hstack done: $R"
