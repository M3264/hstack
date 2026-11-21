#!/usr/bin/env python3
"""Cost per model for Claude Code benchmark runs. Usage: cost-claude.py <results-dir>

Uses `claude -p --output-format json` modelUsage, which includes every sub-agent's model with
token counts and list-price cost (costUSD) as computed by Claude Code itself."""
import json, os, re, sys

R = sys.argv[1]


def usage(path):
    d = json.load(open(path))
    models = {}
    for name, u in (d.get("modelUsage") or {}).items():
        models[name] = {
            "input": u.get("inputTokens", 0),
            "cache_write": u.get("cacheCreationInputTokens", 0),
            "cache_read": u.get("cacheReadInputTokens", 0),
            "output": u.get("outputTokens", 0),
            "cost": round(u.get("costUSD", 0.0), 4),
        }
    return {"models": models, "cost": round(d.get("total_cost_usd", 0.0), 4),
            "turns": d.get("num_turns"), "duration_s": round((d.get("duration_ms") or 0) / 1000)}


def acceptance(path):
    if not os.path.exists(path):
        return "not run"
    s = open(path, errors="ignore").read()
    passed = re.search(r"Tests\s+(?:\d+ failed \| )?(\d+) passed", s)
    failed = re.search(r"Tests\s+(\d+) failed", s)
    p = int(passed.group(1)) if passed else 0
    f = int(failed.group(1)) if failed else 0
    return f"{p}/{p + f} passed, tsc {'ok' if 'TSC_OK' in s else 'FAILED'}"


def wall(m):
    try:
        return int(open(f"{R}/{m}.end").read()) - int(open(f"{R}/{m}.start").read())
    except Exception:
        return None


out = {}
for m in ("solo", "hstack"):
    if os.path.exists(f"{R}/{m}.json") and os.path.getsize(f"{R}/{m}.json") > 0:
        out[m] = usage(f"{R}/{m}.json")
        out[m]["acceptance"] = acceptance(f"{R}/{m}.acceptance.txt")
        out[m]["wall_s"] = wall(m)
if "solo" in out and "hstack" in out and out["solo"]["cost"]:
    out["hstack_vs_solo"] = f"{(out['hstack']['cost'] / out['solo']['cost'] - 1) * 100:+.0f}%"
print(json.dumps(out, indent=1))
