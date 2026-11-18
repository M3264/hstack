# Benchmark task: four utility modules

Implement four independent TypeScript modules in `src/`, each with its own Vitest tests next to it (`src/<name>.test.ts`). No runtime dependencies. Strict TypeScript, and no `any`.

Done when `npx tsc --noEmit` and `npx vitest run` both pass and every behavior below is covered by a test. Exported names and signatures must match exactly, because a hidden acceptance suite imports them.

---

## 1. `src/slug.ts`

```ts
export type SlugOptions = { separator?: string; maxLength?: number; lowercase?: boolean };
export function slugify(input: string, options?: SlugOptions): string;
```
- Defaults: `separator = "-"`, `lowercase = true`, no max length.
- Strip diacritics (`"Crème Brûlée"` becomes `"creme-brulee"`).
- Replace `&` with ` and `.
- Every run of characters that aren't ASCII letters or digits becomes one separator, with no leading or trailing separator.
- `maxLength`: cut to at most `maxLength` characters without ending on a separator, and never cut mid-word when a shorter cut at a word boundary exists. `slugify("hello big world", { maxLength: 12 })` gives `"hello-big"`. If the first word alone is longer than `maxLength`, hard-cut it: `slugify("abcdefghij", { maxLength: 4 })` gives `"abcd"`.
- Examples:
  - `"Hello, World!"` gives `"hello-world"`
  - `"  --Rock & Roll--  "` gives `"rock-and-roll"`
  - `"Hello World"` with `{ separator: "_" }` gives `"hello_world"`
  - `"Hello World"` with `{ lowercase: false }` gives `"Hello-World"`
  - `"!!!"` gives `""`

## 2. `src/semver.ts`

```ts
export type SemVer = { major: number; minor: number; patch: number; prerelease: string[] };
export function parse(version: string): SemVer | null;
export function compare(a: string, b: string): -1 | 0 | 1;
export function satisfies(version: string, range: string): boolean;
```
- `parse`: accepts an optional leading `v` and `MAJOR.MINOR.PATCH` with an optional `-prerelease` (dot-separated identifiers). Build metadata `+...` is accepted and ignored. Anything else returns `null` (`"1.2"`, `"01.2.3"`, `"1.2.3-"`, `"a.b.c"`).
- `compare`: semver 2.0 precedence. A prerelease sorts lower than the same release. Numeric identifiers compare numerically and sort lower than alphanumeric ones. More identifiers win when all earlier ones are equal.
  - `1.0.0-alpha < 1.0.0-alpha.1 < 1.0.0-alpha.beta < 1.0.0-beta < 1.0.0-beta.2 < 1.0.0-beta.11 < 1.0.0-rc.1 < 1.0.0`
  - It throws `Error("Invalid version: <input>")` for unparseable input.
- `satisfies`: the range is one or more comparator sets joined by `||`. A set is space-separated comparators that must all match. Supported forms:
  - `1.2.3` and `=1.2.3` (exact match)
  - `>`, `>=`, `<`, `<=`
  - `^1.2.3`, meaning `>=1.2.3 <2.0.0`
  - `^0.2.3`, meaning `>=0.2.3 <0.3.0`
  - `^0.0.3`, meaning `>=0.0.3 <0.0.4`
  - `~1.2.3`, meaning `>=1.2.3 <1.3.0`
  - `*` matches anything that isn't a prerelease.

  A prerelease version only satisfies a set if some comparator in that set has the same `major.minor.patch` and also has a prerelease (npm rule). An invalid version or range returns `false`.
  - `satisfies("1.5.0", "^1.2.3")` gives `true`
  - `satisfies("2.0.0", "^1.2.3")` gives `false`
  - `satisfies("1.2.4-beta", "^1.2.3")` gives `false`
  - `satisfies("1.2.4-beta", ">=1.2.4-alpha")` gives `true`
  - `satisfies("3.1.0", "^1.0.0 || >=3.0.0 <4")` gives `true`. Note that a comparator may omit minor and patch (`<4` means `<4.0.0`).

## 3. `src/csv.ts`

```ts
export type CsvOptions = { delimiter?: string; header?: boolean };
export function parseCsv(text: string, options?: CsvOptions): string[][] | Record<string, string>[];
export function stringifyCsv(rows: string[][], options?: { delimiter?: string }): string;
```
- RFC 4180: fields may be quoted with `"`, a quoted field may contain the delimiter, newlines and `""` (an escaped quote). Accept both `\n` and `\r\n` line endings. A trailing newline at the end of the text doesn't create an empty row. An empty input gives `[]`.
- `delimiter` defaults to `,`.
- `header: true` returns objects keyed by the first row. Rows shorter than the header fill missing keys with `""`. Longer rows throw `Error("Row <n> has <k> fields, expected <h>")`, where `n` is the 1-based data row number.
- An unterminated quote throws `Error("Unterminated quote at line <l>")`, where `l` is the 1-based line where the quoted field started.
- `stringifyCsv` quotes a field only if it contains the delimiter, `"`, `\r` or `\n`. It doubles inner quotes, joins rows with `\n`, and adds no trailing newline. Round-trip: `parseCsv(stringifyCsv(rows))` deep-equals `rows` for any `string[][]` with at least one row.

## 4. `src/ratelimit.ts`

```ts
export type Clock = () => number; // milliseconds
export class TokenBucket {
  constructor(opts: { capacity: number; refillPerSecond: number; clock?: Clock });
  take(count?: number): boolean;
  available(): number;
  retryAfterMs(count?: number): number;
}
export function slidingWindowLimiter(opts: { limit: number; windowMs: number; clock?: Clock }): (key: string) => { allowed: boolean; remaining: number; resetMs: number };
```
- `TokenBucket`:
  - Starts full.
  - Refills continuously at `refillPerSecond` and never above `capacity`.
  - `take(n = 1)` removes `n` and returns `true` only if at least `n` are available; otherwise it removes nothing and returns `false`.
  - `available()` returns the current float amount, refilled to now.
  - `retryAfterMs(n = 1)` returns `0` if `n` is available now, otherwise the ms until `n` will be available, rounded up. `Infinity` if `n > capacity`.
  - The constructor throws `RangeError` if `capacity <= 0` or `refillPerSecond < 0`.
- `slidingWindowLimiter`:
  - Tracks timestamps per key and allows at most `limit` calls in any trailing `windowMs` window.
  - A call is recorded only when allowed.
  - `remaining` is the number of calls still allowed after this one.
  - `resetMs` is the ms until the oldest counted call leaves the window, or `0` if there are none.
- Both default `clock` to `Date.now`. Tests must use an injected fake clock, never real time.
