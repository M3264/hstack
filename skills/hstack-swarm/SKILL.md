---
name: hstack-swarm
description: Parallel mode for hstack in Claude Code. The worker plans a split, several workers on the same smaller model build independent parts in parallel, and an independent reviewer tries to break the result, while the frontier only briefs, approves and reviews. Use when the user runs /hstack-swarm (hstack must be active).
---

# /hstack-swarm

Use this for tasks that split into independent parts (separate modules, services or files). If hstack isn't active yet, run the `hstack-activate` flow first to get a worker model. Everything in the `hstack` skill still applies; only the build phase changes.

1. **Brief** as in `hstack` section 1.

2. **Plan the split.** Start one `hstack-worker` (your worker model) with the brief and this instruction:

   "Phase 1: plan only, and split the work into 2-6 independent parts with disjoint files. For each part give: name, owned files, what to build, its tests, its done command. Shared types and contracts go in a 'part 0' you build first."

   Review the split. Parts must not share files. Approve or REVISE as usual.

3. **Part 0 (if any).** Continue the same worker: "Build part 0 only, then report."

4. **Fan out.** Start one `hstack-worker` per remaining part, **in parallel and in the background**, on the same worker model. Give each one:
   - the brief
   - its part
   - its owned files
   - the rule "edit only your owned files and their tests"
   - "Phase 2: build it, test first, run your done command, then report"

   Wait for completion notifications. Never poll.

5. **Independent review.** Start one `hstack-reviewer` on the worker model with the brief and the list of parts. It runs the full checks and tries to break the work with new tests, without fixing product code. It returns defects with file and line.

6. **Fix.** Send each defect to the worker that owns that file (SendMessage), as one round of exact corrections.

7. **Review and report** as in `hstack` sections 4 and 5. Run the full done commands yourself once, and spot-check your RISKS.

Cost note: every part's tokens are at the worker's price. Your share is the brief, approvals and reviews. Keep the parts truly independent, so you never have to mediate conflicts.
