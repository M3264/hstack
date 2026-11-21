#!/usr/bin/env bash
# hstack benchmark in Claude Code (in-harness): the same task done two ways, in separate sessions.
#
# Usage: benchmarks/run-claude.sh <benchmark-dir> solo|hstack
#   solo    the frontier model (default claude-opus-5-5) implements base/BENCH-SPEC.md alone
#   hstack  the frontier directs one worker sub-agent on a smaller model (default haiku):
#           brief -> worker plans -> frontier reviews -> worker builds + tests -> frontier reviews
#           -> at most one correction round -> approve. The frontier never writes product code.
# Then:    python3 benchmarks/cost-claude.py benchmarks/.work/<benchmark>-claude/results
#
# Env: FRONTIER_MODEL (claude-opus-5-5), WORKER_MODEL (haiku: an Agent-tool model alias),
#      BUDGET (USD cap per run, default 30).
set -uo pipefail

HERE=$(cd "$(dirname "$0")" && pwd)
H=$(cd "$HERE/.." && pwd)
D=$(cd "${1:?usage: run-claude.sh <benchmark-dir> solo|hstack}" && pwd)
mode=${2:?solo|hstack}
WORK=$HERE/.work/$(basename "$D")-claude
R=$WORK/results
FRONTIER_MODEL=${FRONTIER_MODEL:-claude-opus-5-5}
WORKER_MODEL=${WORKER_MODEL:-haiku}
TOOLS="Read Write Edit Glob Grep Bash Agent SendMessage"
mkdir -p "$R"

DEPS=$WORK/deps
if [ ! -d "$DEPS/node_modules" ]; then
  mkdir -p "$DEPS" && cp "$D/base/package.json" "$DEPS/" && (cd "$DEPS" && npm install --silent >/dev/null 2>&1)
fi

fresh() {
  rm -rf "$1"; mkdir -p "$1"
  (cd "$D/base" && tar -cf - .) | (cd "$1" && tar -xf -)
  ln -s "$DEPS/node_modules" "$1/node_modules"
  (cd "$1" && git init -q && git add -A && git -c user.email=bench@hstack -c user.name=bench commit -qm base)
}

acceptance() {
  mkdir -p "$1/test"; cp "$D/hidden/acceptance.test.ts" "$1/test/acceptance.test.ts"
  (cd "$1" && npx vitest run test/acceptance.test.ts > "$2" 2>&1; npx tsc --noEmit >> "$2" 2>&1 && echo "TSC_OK" >> "$2")
}

ok_or_die() {
  python3 - "$1" <<'PY'
import json, sys
d = json.load(open(sys.argv[1]))
r = str(d.get("result", ""))
if d.get("is_error") or ("hit your" in r and "limit" in r):
    print(f"claude -p failed: {r[:200]}", file=sys.stderr); sys.exit(1)
PY
}

W=$WORK/run-$mode; fresh "$W"; cd "$W"
date +%s > "$R/$mode.start"

if [ "$mode" = solo ]; then
  PROMPT="Implement everything in BENCH-SPEC.md in this directory, with thorough tests. You are done only when \`npx tsc --noEmit\` and \`npx vitest run\` both pass. Do not modify package.json, tsconfig.json or vitest.config.ts. Finish with a one-paragraph summary."
else
  IFS= read -r -d '' PROMPT <<EOF || true
You are the senior engineer (frontier model) using hstack: a smaller, cheaper model does the engineering and you direct it. Your output tokens cost far more than the worker's, so write decisions, not text, and never write or edit product code or tests yourself.

Task for this repo: implement everything in BENCH-SPEC.md with thorough tests; done when \`npx tsc --noEmit\` and \`npx vitest run\` pass; package.json, tsconfig.json and vitest.config.ts are off-limits.

Follow this exact loop:
1. Intake (at most 15 lines): WHY, numbered acceptance criteria (point to BENCH-SPEC.md sections instead of restating them), constraints, and the RISKS you will review.
2. Start ONE worker with the Agent tool, model "$WORKER_MODEL". Its prompt: the intake, plus "Follow the engineering practice in $H/skills/hstack-practice/SKILL.md. Phase 1 only: explore, then write PLAN.md (spec decisions, files, a criteria-to-tests map, risks) and reply with a plan report of at most 20 lines. Do not write code yet."
3. Review the plan report. Continue the SAME worker with SendMessage: "APPROVE: build it" or "REVISE: <at most 8 lines>". The build instruction must say: write tests first, implement, run \`npx tsc --noEmit\` and \`npx vitest run\` until green, self-review against BENCH-SPEC.md, then reply with a done report of at most 25 lines: files changed, tests run and their real results, known issues, and the areas that need review.
4. Review the done report. Run \`npx tsc --noEmit\` and \`npx vitest run\` yourself once. Spot-check only the files covering your RISKS. If something is wrong, send at most ONE correction round to the same worker (exact defects, at most 10 lines), then check again.
5. Finish with a 5-line report: what was built, final check results, and the corrections you made.
EOF
fi

claude -p "$PROMPT" --model "$FRONTIER_MODEL" --output-format json --permission-mode acceptEdits \
  --allowedTools $TOOLS --max-budget-usd "${BUDGET:-30}" > "$R/$mode.json" 2> "$R/$mode.err"
ok_or_die "$R/$mode.json" || exit 1
date +%s > "$R/$mode.end"
acceptance "$W" "$R/$mode.acceptance.txt"
echo "$mode done: $R"
