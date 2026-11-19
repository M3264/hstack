#!/usr/bin/env python3
"""Token and cost numbers for one benchmark. Usage: cost.py <results-dir>"""
import glob, json, os, re, sys

R = sys.argv[1] if len(sys.argv) > 1 else "results"

# USD per 1M tokens: (cached input, input, output). Reasoning tokens are billed as output.
PRICES = {
    "muse-wonder-1.0": (0.20, 4.00, 20.00),
    "muse-spark-1.3": (0.15, 1.25, 4.25),
    "muse-spark-1.3-contributor": (0.002, 0.10, 0.20),
    "muse-spark-1.2": (0.15, 1.25, 4.25),
    "muse-spark-1.2-contributor": (0.002, 0.10, 0.20),
}


SESSIONS = os.path.expanduser("~/.local/share/muse/sessions")


def _log_meta(log):
    """(session id, model) from a `muse exec --json` log."""
    sid = model = None
    for line in open(log, errors="ignore"):
        if sid is None:
            m = re.search(r'"stream":\{"kind":"session","id":"([0-9a-f-]{36})"', line)
            if m:
                sid = m.group(1)
        if model is None and '"run_usage"' in line:
            m = re.search(r'"model":"([a-z0-9.-]+)"', line)
            if m:
                model = m.group(1)
        if sid and model:
            break
    return sid, model


def _session_records(sid):
    """Per-call usage records for a session and all its sub-agents (workflow children).
    Muse's run_usage in the --json log does not include sub-agents, so these are the source of truth."""
    dirs = glob.glob(os.path.join(SESSIONS, "*", "*", "*", sid))
    if not dirs:
        return None
    files = [os.path.join(dirs[0], "session.jsonl")] + glob.glob(os.path.join(dirs[0], "subagent", "*", "session.jsonl"))
    t = {"input": 0, "cached": 0, "output": 0, "reasoning": 0, "calls": 0, "subagents": len(files) - 1}
    for f in files:
        seen = set()
        for line in open(f, errors="ignore"):
            if "goal_usage_attribution" not in line:
                continue
            try:
                rec = json.loads(line)["payload"]["event"]["record"]
            except Exception:
                continue
            q = rec.get("quantity", {})
            if rec.get("usage_id") in seen or q.get("unit") != "tokens":
                continue
            seen.add(rec.get("usage_id"))
            t["calls"] += 1
            for k, src in (("input", "input_tokens"), ("cached", "cached_tokens"),
                           ("output", "output_tokens"), ("reasoning", "reasoning_tokens")):
                t[k] += q.get(src, 0)
    return t


def muse_usage(paths):
    """Usage per model across Muse --json logs, including sub-agents (from the session store).
    Each log's session is billed at that log's model. Reasoning tokens are billed as output."""
    models, cost = {}, 0.0
    for log in paths:
        sid, model = _log_meta(log)
        model = model or "unknown"
        rec = _session_records(sid) if sid else None
        if rec is None:  # fall back to the log's own run_usage (misses sub-agents)
            rec = {"input": 0, "cached": 0, "output": 0, "reasoning": 0, "calls": 0, "subagents": 0, "note": "log only"}
            for line in open(log, errors="ignore"):
                if '"run_usage"' in line:
                    for m in json.loads(line)["payload"]["models"]:
                        for k, src in (("input", "input_tokens"), ("cached", "cached_tokens"),
                                       ("output", "output_tokens"), ("reasoning", "reasoning_tokens")):
                            rec[k] += m.get(src, 0)
                        rec["calls"] += m.get("calls", 0)
        t = models.setdefault(model, {"input": 0, "cached": 0, "output": 0, "reasoning": 0, "calls": 0, "subagents": 0})
        for k in ("input", "cached", "output", "reasoning", "calls", "subagents"):
            t[k] += rec[k]
    for name, t in models.items():
        c_in, p_in, p_out = PRICES.get(name, PRICES["muse-wonder-1.0"])
        t["cost"] = round((t["cached"] * c_in + max(t["input"] - t["cached"], 0) * p_in
                           + (t["output"] + t["reasoning"]) * p_out) / 1e6, 4)
        cost += t["cost"]
    return {"models": models, "cost": round(cost, 4)}


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


out = {}
if os.path.exists(f"{R}/solo.frontier.log"):
    out["solo"] = muse_usage([f"{R}/solo.frontier.log"])
    out["solo_acceptance"] = acceptance(f"{R}/solo.acceptance.txt")
    out["solo_wall_s"] = wall("solo")
frontier = sorted(glob.glob(f"{R}/frontier-*.log"))
if frontier:
    f = muse_usage(frontier)
    f["per_call"] = [{"call": os.path.basename(p), "cost": muse_usage([p])["cost"]} for p in frontier]
    lead = muse_usage(glob.glob(f"{R}/*.lead.log"))
    out["hstack"] = {"frontier": f, "small": lead, "total_cost": round(f["cost"] + lead["cost"], 4)}
    out["hstack_acceptance"] = acceptance(f"{R}/hstack.acceptance.txt")
    out["hstack_wall_s"] = wall("hstack")
    if os.path.exists(f"{R}/events.txt"):
        out["hstack_events"] = open(f"{R}/events.txt").read().split("\n")[:-1]
if "solo" in out and "hstack" in out and out["solo"]["cost"]:
    out["hstack_vs_solo"] = f"{(out['hstack']['total_cost'] / out['solo']['cost'] - 1) * 100:+.0f}%"
print(json.dumps(out, indent=1))
