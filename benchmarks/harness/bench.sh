#!/usr/bin/env bash
# hstack benchmark: same task, two ways. Usage: bench.sh solo | hstack
# solo:   Claude Code (Opus) alone implements BENCH-SPEC.md.
# hstack: Claude Code (Opus) plans, Muse workers implement, Claude verifies and merges.
set -uo pipefail
B=/Users/shellhaki/hstack-bench
H=/Users/shellhaki/muse-orchestrator
MODEL=claude-opus-5-5
mode=${1:?solo|hstack}
R=$B/results; mkdir -p "$R"
TOOLS="Read Write Edit Glob Grep Bash"

fresh() { # copy base to $1 as a git repo with node_modules linked
  rm -rf "$1"; mkdir -p "$1"
  (cd $B/base && tar --exclude node_modules -cf - .) | (cd "$1" && tar -xf -)
  ln -s $B/base/node_modules "$1/node_modules"
  (cd "$1" && git init -q && git add -A && git -c user.email=b@b -c user.name=bench commit -qm base)
}

acceptance() { # run the hidden suite in $1, write $2
  mkdir -p "$1/test"; cp $B/hidden/acceptance.test.ts "$1/test/acceptance.test.ts"
  (cd "$1" && npx vitest run test/acceptance.test.ts > "$2" 2>&1; npx tsc --noEmit >> "$2" 2>&1 && echo "TSC_OK" >> "$2")
}

if [ "$mode" = solo ]; then
  W=$B/run-solo; fresh $W; cd $W
  date +%s > $R/solo.start
  claude -p "Implement everything in BENCH-SPEC.md in this directory: the four modules and their tests. You are done only when \`npx tsc --noEmit\` and \`npx vitest run\` both pass. Do not modify package.json, tsconfig.json or vitest.config.ts. Finish with a one-paragraph summary." \
    --model $MODEL --output-format json --permission-mode acceptEdits --allowedTools $TOOLS --max-budget-usd 20 \
    > $R/solo.json 2> $R/solo.err
  date +%s > $R/solo.end
  acceptance $W $R/solo.acceptance.txt
  echo "solo done"
  exit 0
fi

# ---- hstack
W=$B/run-hstack; O=$B/run-hstack-orch; fresh $W; rm -rf $O; cd $W
date +%s > $R/hstack.start
claude -p "You are the hstack orchestrator (the large model). Read $H/skills/hstack/SKILL.md, $H/skills/hstack-plan/SKILL.md, $H/templates/brief-checklist.md, $H/templates/_common.md and $H/templates/task.md. The full spec is BENCH-SPEC.md in this directory (already written; do not rewrite it). Split it into exactly four work packages named wp-slug, wp-semver, wp-csv, wp-ratelimit (one module each, independent, no shared stubs needed). For each write specs/tasks/<name>.md and specs/tasks/<name>.owns, plus one specs/tasks/_common.md, following the templates and the brief checklist. Workers have no network and must not touch package.json or configs; their definition of done is \`npx tsc --noEmit\` and \`npx vitest run src/<module>.test.ts\`. Do NOT implement the modules and do NOT launch workers: a harness launches them after you finish. Reply DONE." \
  --model $MODEL --output-format json --permission-mode acceptEdits --allowedTools $TOOLS --max-budget-usd 10 \
  > $R/hstack.plan.json 2> $R/hstack.plan.err
SID=$(python3 -c "import json;print(json.load(open('$R/hstack.plan.json'))['session_id'])")

# Workers: scripts only, no orchestrator tokens. Muse emits per-run token usage with --json.
$H/scripts/setup.sh $W $O wp-slug wp-semver wp-csv wp-ratelimit > $R/hstack.setup.txt 2>&1
MODE=headless TASKS_DIR=specs/tasks AGENT_CMD='muse exec --json --prompt-file {prompt}' \
  $H/scripts/run.sh $O > $R/hstack.run.txt 2>&1

cd $W
claude -p "The four Muse workers have finished. Orchestration dir: $O. Follow $H/skills/hstack-verify/SKILL.md: run \`VERIFY_CMD='npx tsc --noEmit && npx vitest run' $H/scripts/collect.sh $O\`, read each worker report in $O/<name>/.orch/, review the patches against BENCH-SPEC.md, merge with \`$H/scripts/merge.sh $O\`, then run \`npx tsc --noEmit\` and \`npx vitest run\` in this directory and fix any remaining problems yourself. Do not run cleanup. Finish with a short report." \
  --resume "$SID" --model $MODEL --output-format json --permission-mode acceptEdits --allowedTools $TOOLS --add-dir $O --max-budget-usd 10 \
  > $R/hstack.verify.json 2> $R/hstack.verify.err
date +%s > $R/hstack.end
acceptance $W $R/hstack.acceptance.txt
cp $O/logs/*.log $R/ 2>/dev/null
echo "hstack done"
