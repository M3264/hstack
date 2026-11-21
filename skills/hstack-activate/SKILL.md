---
name: hstack-activate
description: Turn on hstack for this Claude Code session. The current (frontier) model becomes the senior engineer and asks which smaller model should do the work, repeating until a valid one is given. Use when the user runs /hstack-activate or asks to activate hstack.
---

# /hstack-activate

1. **Know the frontier.** It's the model running this session; your system prompt names it. Find it in `<home>/models/claude.json`, where `<home>` is `~/.config/hstack` (installed by `hstack`) or this repo. Models are listed from most to least capable.

2. **Smallest model already?** If the session's model is the last in the list, there's nothing smaller to delegate to. Reply in one line, "hstack inactive: <model> is already the smallest, so I'll work normally.", and stop.

3. **Ask for the worker.** Ask exactly: "Which smaller model should do the work? (e.g. haiku, sonnet)". If `~/.config/hstack/config.json` has a `worker`, suggest it as the default.

4. **Validate, and keep asking until it's valid.**
   - Match the answer loosely against each model's `alias`, `name` and `names`. Ignore case, spaces and the word "claude", so "Haiku 5.5", "haiku" and "claude-haiku-5-5" all match Haiku.
   - **Unknown name:** reply "I don't know that model. Options: <aliases of models below the frontier>", then ask again.
   - **Not smaller than the frontier:** reply "<model> isn't smaller than <frontier>, pick one of: <aliases below>", then ask again.
   - Repeat until it's valid. Don't guess for the user.

5. **Confirm and remember.** Reply in one line: `hstack active · <frontier> directs, <worker> builds (/hstack-swarm for parallel workers)`. Keep the worker's `alias` for the rest of the session. That alias is the `model` value you pass to the Agent tool.

6. **For every task after this**, follow the `hstack` skill (`<home>/skills/hstack/SKILL.md`) with this worker. Tasks below its size gate you do yourself.
