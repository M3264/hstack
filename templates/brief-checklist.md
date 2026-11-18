# Worker brief checklist

Small models do exactly what the brief says and fill every gap with a guess. Run every task file through this list before launch. If an item applies and the brief doesn't answer it, the worker will guess, and you'll be fixing the guess later.

## Values, not intentions
- [ ] Every output that leaves the app is specified **by example**: input, then exact output.
  - Bad: "the share button copies the post link".
  - Good: `"/posts/abc"` on `https://site.dev` copies `https://site.dev/posts/abc`.
- [ ] Formats are explicit: absolute or relative URLs, date format and time zone, units, casing, separators, max lengths.
- [ ] Where a value is computed is explicit: at render, at click time, on the server, or on the client. Name what must never run during render or prerender.

## Every user-visible state
- [ ] A state table for each interactive element: idle, loading, success, error, disabled, empty. For each state:
  - trigger
  - what the user **sees** (icon, text, color)
  - what assistive tech hears (`aria-label`, live region text)
  - how long it lasts, and what happens after
- [ ] Success and failure both get **visible** feedback. Screen-reader-only feedback is never enough on its own.
- [ ] Repeat interactions are covered: clicking twice, clicking during loading, unmounting mid-state (timers cleared).
- [ ] Failure never reports success.

## Real environment facts (mocks hide these)
- [ ] What the database driver returns for each column type (e.g. timestamps come back as `Date`, not strings).
- [ ] Framework rendering rules that apply. Which routes or pages must be dynamic, and how to make them dynamic in this framework version.
- [ ] Real request shapes: body-less POSTs, headers browsers actually send, cookies over http in dev versus https in prod.
- [ ] Where an item can be linked to, if the feature shares or deep-links anything. Give the exact permalink format per item type.

## Boundaries
- [ ] Owned files listed by path. Everything else is read-only.
- [ ] The exact contract with parallel workers: prop names, types, and example values they will pass.
- [ ] What must **not** change (layout, classes, existing behavior).

## Proof
- [ ] One named test per row of every state table and every input-to-output example (`SB-1`, `PL-3`, ...).
- [ ] Timing behavior tested with fake timers.
- [ ] The definition-of-done commands, scoped to the owned paths.

## Bugs found in practice because a brief skipped one of these
- A share button copied `/posts/<id>` (relative), so pasted links were dead. The brief said "copy the permalink" without an example.
- The same button had no visible "copied" state, only a screen-reader announcement. The brief said "announce it via aria-live".
- It announced "Link copied" even when copying failed. The brief had no failure state.
- Project and gallery share buttons copied the list page URL. The brief never said what an item's permalink is.
- Every sign-in failed because mocked rows used string timestamps while the real driver returns `Date`.
