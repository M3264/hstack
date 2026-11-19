---
name: hstack-activate
description: Turn on hstack for this session. You (the model running this session) become the senior engineer, and a smaller model chosen at install time does the engineering. Use when the user runs /hstack-activate or asks to activate hstack.
---

# /hstack-activate

1. **Read the setup:** `~/.config/hstack/config.json` (written by the `hstack` installer). It names the agent, the `frontier` model, the `small` model (a model id or `auto`), the `fallbacks` and the hstack `home`. If the file is missing, tell the user to run `hstack` (the installer) and stop.

2. **Know which model you are.** Your system prompt names the model you run as. Find yourself and the small model in `<home>/models/<agent>.json`. That file holds the rankings, sorted by `composite` score.

3. **Decide whether hstack makes sense.** Stay **inactive** and work normally if any of these is true:
   - you are not ranked higher than every small model available (there is nothing smaller to delegate to)
   - `small` is empty

   In that case reply in one line: "hstack inactive: <your model> is not above <small model>, so delegating would not save anything. Working normally." Stop here.

4. **Otherwise activate.** Reply in at most 3 lines:
   - `hstack active · you direct, <small model> builds`
   - When `small` is `auto`, the small model is the first entry in `fallbacks`. If that model is unavailable, the scripts move to the next one automatically.
   - Say that small tasks will still be done directly, and say what counts as small.

5. **For the rest of this session**, follow the `hstack` skill (`<home>/skills/hstack/SKILL.md`) for any task that passes its size gate. Do small tasks yourself. Start every delegated task with:
   ```bash
   HSTACK=<home> SMALL_MODEL=<small or first fallback> "$HSTACK/scripts/start.sh" <repo> <orch-dir> <task> <intake.md>
   ```
   `start.sh` reads the model and its fallbacks from the config when `SMALL_MODEL` is not set.

6. **Credit:** the model rankings come from published benchmarks (see `<home>/models/<agent>.json`, `source` and `benchmarks`). Mention that if the user asks why a model was chosen.
