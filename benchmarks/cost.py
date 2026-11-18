#!/usr/bin/env python3
"""Turn benchmark outputs into token and cost numbers. Usage: cost.py <results-dir>"""
import glob, json, os, re, sys

R = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), "results")

# Prices per 1M tokens, Claude Opus 5.5 standard API pricing (provided by the user, 2026-11-18).
# Thinking tokens are included in output.
OPUS = {"input": 4.00, "output": 20.00, "cache_write_5m": 5.00, "cache_write_1h": 8.00, "cache_read": 0.20}
MUSE = {"input": 0.10, "cached": 0.002, "output": 0.20}


def claude_usage(path):
    """Opus tokens from a `claude -p --output-format json` result, priced with the rates above.
    Claude Code's own helper calls to smaller models are added at their CLI-reported cost."""
    if not os.path.exists(path) or os.path.getsize(path) == 0:
        return None
    d = json.load(open(path))
    t = {"input": 0, "cache_write_5m": 0, "cache_write_1h": 0, "cache_read": 0, "output": 0,
         "helper_models_cost": 0.0}
    # Use the per-run `usage` block: `modelUsage` is cumulative across a resumed session.
    u = d.get("usage", {})
    cc = u.get("cache_creation") or {}
    t["input"] = u.get("input_tokens", 0)
    t["cache_write_5m"] = cc.get("ephemeral_5m_input_tokens", 0)
    t["cache_write_1h"] = cc.get("ephemeral_1h_input_tokens", u.get("cache_creation_input_tokens", 0) if not cc else 0)
    t["cache_read"] = u.get("cache_read_input_tokens", 0)
    t["output"] = u.get("output_tokens", 0)
    for model, mu in (d.get("modelUsage") or {}).items():
        if "opus" not in model:
            t["helper_models_cost"] += mu.get("costUSD", 0.0)
    t["cost"] = round(sum(t[k] * OPUS[k] for k in ("input", "cache_write_5m", "cache_write_1h", "cache_read", "output")) / 1e6
                      + t["helper_models_cost"], 4)
    t["cli_reported_cost_cumulative"] = d.get("total_cost_usd")
    t["turns"] = d.get("num_turns")
    t["duration_s"] = round((d.get("duration_ms") or 0) / 1000)
    return t


def muse_usage(results_dir):
    """Sum the final run_usage event of every Muse run found in worker logs."""
    t = {"input": 0, "cached": 0, "output": 0, "reasoning": 0, "runs": 0}
    for log in glob.glob(os.path.join(results_dir, "wp-*.log")):
        last = {}
        for line in open(log, errors="ignore"):
            if '"run_usage"' not in line:
                continue
            try:
                p = json.loads(line)["payload"]
            except Exception:
                continue
            last[p["run_stream"]["id"]] = p
        for p in last.values():
            t["runs"] += 1
            for m in p["models"]:
                t["input"] += m.get("input_tokens", 0)
                t["cached"] += m.get("cached_tokens", 0)
                t["output"] += m.get("output_tokens", 0)
                t["reasoning"] += m.get("reasoning_tokens", 0)
    uncached = max(t["input"] - t["cached"], 0)
    # Conservative: bill reasoning tokens as output on top of output tokens.
    t["cost"] = (uncached * MUSE["input"] + t["cached"] * MUSE["cached"]
                 + (t["output"] + t["reasoning"]) * MUSE["output"]) / 1e6
    return t


def acceptance(path):
    if not os.path.exists(path):
        return "not run"
    s = open(path, errors="ignore").read()
    passed = re.search(r"Tests\s+(?:\d+ failed \| )?(\d+) passed", s)
    failed = re.search(r"Tests\s+(\d+) failed", s)
    p = int(passed.group(1)) if passed else 0
    f = int(failed.group(1)) if failed else 0
    return f"{p}/{p + f} passed, tsc {'ok' if 'TSC_OK' in s else 'FAILED'}"


def wall(name):
    try:
        return int(open(f"{R}/{name}.end").read()) - int(open(f"{R}/{name}.start").read())
    except Exception:
        return None


solo = claude_usage(f"{R}/solo.json")
plan = claude_usage(f"{R}/hstack.plan.json")
verify = claude_usage(f"{R}/hstack.verify.json")
muse = muse_usage(R)
print(json.dumps({
    "solo": solo, "hstack_plan": plan, "hstack_verify": verify, "muse": muse,
    "solo_acceptance": acceptance(f"{R}/solo.acceptance.txt"),
    "hstack_acceptance": acceptance(f"{R}/hstack.acceptance.txt"),
    "solo_wall_s": wall("solo"), "hstack_wall_s": wall("hstack"),
}, indent=1))
