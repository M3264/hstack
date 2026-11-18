# Benchmark 2 task: six engine modules

Implement six independent TypeScript modules in `src/`, each with thorough Vitest tests next to it (`src/<name>.test.ts`). No runtime dependencies. Strict TypeScript, and no `any`. Exported names and signatures must match exactly, because a hidden acceptance suite imports them. Every example below must hold exactly, character for character.

Done when `npx tsc --noEmit` and `npx vitest run` both pass.

---

## 1. `src/markdown.ts`: `export function renderMarkdown(src: string): string`

**Blocks**, separated by blank lines and output joined with `\n`:
- **ATX heading:** `#` to `######`, then a space, then text, gives `<hN>inline</hN>`.
- **Paragraph:** consecutive non-blank lines, joined with `\n` inside one `<p>`.
- **Fenced code:** a line of ```` ``` ```` with an optional language, then lines up to the next ```` ``` ````. It renders as `<pre><code class="language-LANG">ESCAPED</code></pre>`, with no `class` attribute when there is no language. The content is the lines joined with `\n` plus one trailing `\n`, and it gets no inline parsing.
- **Blockquote:** consecutive lines starting with `> ` (or exactly `>`). Strip the marker, render the inner text recursively as blocks, and output `<blockquote>\nINNER\n</blockquote>`.
- **Lists:** `- ` or `* ` items give `<ul>`. `N. ` items give `<ol>`, plus ` start="N"` when the first number isn't 1. A nested list is indented by 2 spaces under its item. Items are tight (no `<p>`). The format is exactly:
  - `"- a\n- b\n  - c\n- d"` gives `"<ul>\n<li>a</li>\n<li>b\n<ul>\n<li>c</li>\n</ul>\n</li>\n<li>d</li>\n</ul>"`
  - `"3. x\n4. y"` gives `"<ol start=\"3\">\n<li>x</li>\n<li>y</li>\n</ol>"`
- **Rule:** a line that is exactly `---` gives `<hr>`.

**Inline**, in headings, paragraphs and list items:
- `**x**` gives `<strong>x</strong>`.
- `*x*` and `_x_` give `<em>x</em>`.
- `` `x` `` gives `<code>x</code>`, escaped, with no parsing inside.
- `[text](url)` gives `<a href="URL">text</a>`, with the URL attribute-escaped. If the URL starts with `javascript:` (case-insensitive), output only the text.
- A backslash before one of `` \ ` * _ [ ] ( ) # - `` outputs that character literally.
- In text, `&`, `<`, `>` and `"` become `&amp;`, `&lt;`, `&gt;` and `&quot;`.

**Examples:**
- `"# Hi"` gives `"<h1>Hi</h1>"`
- `"Hello *world* and **bold** with `a<b`"` gives `"<p>Hello <em>world</em> and <strong>bold</strong> with <code>a&lt;b</code></p>"`
- `"[x](https://e.com?a=1&b=2)"` gives `"<p><a href=\"https://e.com?a=1&amp;b=2\">x</a></p>"`
- `"[x](javascript:alert(1))"` gives `"<p>x</p>"`
- `"> quote\n> more"` gives `"<blockquote>\n<p>quote\nmore</p>\n</blockquote>"`
- `"# T\n\npara\n\n---"` gives `"<h1>T</h1>\n<p>para</p>\n<hr>"`
- `"\\*not em\\* & <b>"` gives `"<p>*not em* &amp; &lt;b&gt;</p>"`
- ```` "```ts\nconst a = 1 < 2;\n```" ```` gives `"<pre><code class=\"language-ts\">const a = 1 &lt; 2;\n</code></pre>"`

## 2. `src/cron.ts`

```ts
export type CronSchedule = { minutes: number[]; hours: number[]; days: number[]; months: number[]; weekdays: number[]; domRestricted: boolean; dowRestricted: boolean };
export function parseCron(expr: string): CronSchedule;
export function nextRun(expr: string, after: Date): Date;
```

**Fields:** five, separated by whitespace: minute (0-59), hour (0-23), day of month (1-31), month (1-12 or `JAN`-`DEC`), weekday (0-7 or `SUN`-`SAT`, where 7 means Sunday). Names are case-insensitive.

**Syntax:** `*`, `a`, `a-b`, `*/n`, `a-b/n`, and comma lists of these. The arrays come out sorted, unique, with weekday 7 normalised to 0.

**Errors:** invalid input throws an `Error` whose message starts with `Invalid cron expression`. That covers a wrong field count, a value out of range, a step of 0, a reversed range, and unknown names.

**`nextRun`:**
- Works in UTC with minute resolution.
- Returns the first matching minute **strictly after** `after`, with seconds and ms at 0.
- If both day of month and weekday are restricted (neither is `*`), a day matches when **either** matches. Otherwise both must match.
- Searches up to 5 years ahead, then throws `Error("No run within 5 years")`.

**Examples** (dates are ISO UTC):
- `nextRun("*/15 * * * *", 2026-01-01T10:07:30Z)` gives `2026-01-01T10:15:00Z`
- `nextRun("0 9 * * MON-FRI", 2026-01-02T09:00:00Z)` gives `2026-01-05T09:00:00Z` (Jan 2 2026 is a Friday)
- `nextRun("0 0 1 * *", 2026-01-31T12:00:00Z)` gives `2026-02-01T00:00:00Z`
- `nextRun("30 2 29 2 *", 2026-03-01T00:00:00Z)` gives `2028-02-29T02:30:00Z`
- `nextRun("0 12 13 * 5", 2026-01-01T13:00:00Z)` gives `2026-01-02T12:00:00Z` (13th OR Friday)
- `nextRun("0 0 * * 7", 2026-01-01T00:00:00Z)` gives `2026-01-04T00:00:00Z`
- `nextRun("5 4 * * *", 2026-01-01T04:05:00Z)` gives `2026-01-02T04:05:00Z`
- `nextRun("0 0 1 JAN,JUL *", 2026-02-01T00:00:00Z)` gives `2026-07-01T00:00:00Z`
- `parseCron("1-10/3 * * * *").minutes` gives `[1, 4, 7, 10]`

## 3. `src/jsonpath.ts`: `export function query(doc: unknown, path: string): unknown[]`

**Syntax:** `$` root, `.key`, `['key']` and `["key"]`, `[n]` (negative counts from the end), `[*]` and `.*` (all children: array items, or object values in key order), `..key` (recursive descent, pre-order document order), `[start:end]` slices (either side optional, negatives allowed), and filters `[?(EXPR)]`.

**Filter expressions:**
- Operands are `@.path` (dot paths only) and literals: numbers, `'str'`, `"str"`, `true`, `false`, `null`.
- Comparisons: `==`, `!=`, `<`, `<=`, `>`, `>=`.
- `&&` binds tighter than `||`, and parentheses are allowed.
- A bare `@.x` tests that `x` exists.
- A comparison with a missing operand is false.

**Results and errors:**
- Results come in document order, and a missing path gives `[]`.
- A syntax error throws `Error("Invalid JSONPath at <i>")`, where `i` is the 0-based index of the offending character.

**Examples** with this document:
```js
const store = { store: {
  book: [
    { category: "reference", author: "Nigel Rees", title: "Sayings", price: 8.95 },
    { category: "fiction", author: "Evelyn Waugh", title: "Sword", price: 12.99 },
    { category: "fiction", author: "Herman Melville", title: "Moby Dick", isbn: "0-553", price: 8.99 },
    { category: "fiction", author: "J. R. R. Tolkien", title: "LOTR", isbn: "0-395", price: 22.99 } ],
  bicycle: { color: "red", price: 19.95 } } };
```
- `$.store.book[*].author` and `$..author` both give the four authors in order
- `$..price` gives `[8.95, 12.99, 8.99, 22.99, 19.95]`
- `$..book[2].title` gives `["Moby Dick"]`
- `$..book[-1].title` gives `["LOTR"]`
- `$..book[0:2].title` gives `["Sayings", "Sword"]`
- `$..book[?(@.isbn)].title` gives `["Moby Dick", "LOTR"]`
- `$..book[?(@.price < 10)].title` gives `["Sayings", "Moby Dick"]`
- `$..book[?(@.category == 'fiction' && @.price > 20)].title` gives `["LOTR"]`
- `$.store['bicycle'].color` gives `["red"]`
- `$.nope` gives `[]`
- `$.store[` throws an error matching `/^Invalid JSONPath at \d+$/`

## 4. `src/diff.ts`

```ts
export type DiffOp = { type: "equal" | "insert" | "delete"; line: string };
export function diffLines(a: string, b: string): DiffOp[];
export function unifiedDiff(a: string, b: string, opts?: { context?: number; fromFile?: string; toFile?: string }): string;
```

**Line splitting:** text splits on `\n`. A single trailing `\n` doesn't create an extra empty line, and `""` has zero lines.

**`diffLines`:** returns a **minimal** edit script, with the fewest insert plus delete operations (Myers). Within a changed region, deletes come before inserts.
- `diffLines("a\nb\nc", "a\nc\nd")` gives equal a, delete b, equal c, insert d.

**`unifiedDiff`:**
- Defaults: `context = 3`, `fromFile = "a"`, `toFile = "b"`.
- Returns `""` when the inputs are equal.
- Otherwise it is `--- a\n+++ b\n` followed by hunks. Each hunk is `@@ -L,S +L,S @@` (always include both counts), then its lines prefixed with `" "`, `"-"` or `"+"`.
- Changes closer than `2 * context` lines apart share a hunk.
- Every line ends with `\n`, including the last.
- Example: from lines `1` to `10` to the same with `5` replaced by `five`:
```
--- a
+++ b
@@ -2,7 +2,7 @@
 2
 3
 4
-5
+five
 6
 7
 8
```

## 5. `src/template.ts`: `export function render(template: string, view: unknown, partials?: Record<string, string>): string`

A Mustache subset.

**Tags:**
- `{{name}}` is HTML-escaped: `&`, `<`, `>`, `"` and `'` become `&amp;`, `&lt;`, `&gt;`, `&quot;` and `&#39;`.
- `{{{name}}}` and `{{& name}}` output raw.
- `{{a.b.c}}` reads dotted names.
- `{{.}}` is the current context.
- `{{! comment}}` outputs nothing.
- `{{> partial}}` renders that partial with the current context.
- Whitespace inside tags is ignored. There is no special handling of standalone lines.

**Lookup:** name lookup walks the context stack from innermost to outermost. A missing value renders `""`. Numbers render with `String(n)`, so `0` renders `"0"`.

**Sections:**
- `{{#k}}...{{/k}}`:
  - false, null, undefined, `""`, `0` or an empty list: skip it.
  - a non-empty list: render once per item, with the item as the context.
  - any other truthy value: render once, with the value pushed as context if it's an object.
- `{{^k}}...{{/k}}` (inverted): render only when `k` is falsy or an empty list.
- An unclosed section throws `Error("Unclosed section: k")`.

**Examples:**
- `render("Hi {{name}}!", { name: "<Ada>" })` gives `"Hi &lt;Ada&gt;!"`
- `render("{{{h}}}{{& h}}", { h: "<b>" })` gives `"<b><b>"`
- `render("{{#items}}[{{.}}]{{/items}}", { items: [1, 2, 3] })` gives `"[1][2][3]"`
- `render("{{#people}}{{name}}@{{org}} {{/people}}", { org: "X", people: [{ name: "Ada" }, { name: "Bob" }] })` gives `"Ada@X Bob@X "`
- `render("{{^items}}none{{/items}}", { items: [] })` gives `"none"`
- `render("{{q}}", { q: "\"it's\"" })` gives `"&quot;it&#39;s&quot;"`
- `render("{{> user}}", { name: "A" }, { user: "<b>{{name}}</b>" })` gives `"<b>A</b>"`

## 6. `src/expr.ts`: `export function evaluate(src: string, vars?: Record<string, number>): number`

**Language:**
- Numbers: integer, decimal, and exponent forms (`1.5e2`).
- Binary operators: `+ - * / %` and `^`.
- Precedence, low to high: `+ -`, then `* / %`, then unary `-` and `+`, then `^`.
  - `^` is right-associative.
  - `^` binds tighter than unary minus: `-2^2 = -4`, and `2^-1 = 0.5` works.
- Parentheses.
- Variables come from `vars`. The constants `pi` and `e` are built in.
- Functions: `min` and `max` (variadic, at least 1 argument), `abs`, `round` (`Math.round`), `floor`, `ceil`, `sqrt`.
- Whitespace is ignored.

**Errors (exact messages, 0-based positions):**
- `Unexpected token '<tok>' at <pos>`
- `Unexpected end of input`
- `Unknown variable: <name>`
- `Unknown function: <name>`
- `Division by zero` (for both `/` and `%`)

**Examples:**
- `"1 + 2 * 3"` gives `7`
- `"(1 + 2) * 3"` gives `9`
- `"2 ^ 3 ^ 2"` gives `512`
- `"-2 ^ 2"` gives `-4`
- `"2 ^ -1"` gives `0.5`
- `"10 % 4"` gives `2`
- `"1.5e2 / 3"` gives `50`
- `"--3"` gives `3`
- `"min(3, 1, 2) + max(4, 5)"` gives `6`
- `"round(2.5) + floor(-1.5) + ceil(1.2)"` gives `3`
- `"x * y"` with `{ x: 2, y: 3 }` gives `6`
- `"2 + * 3"` throws `Unexpected token '*' at 4`
- `"2 * (3"` throws `Unexpected end of input`
- `"foo(1)"` throws `Unknown function: foo`
- `"z + 1"` throws `Unknown variable: z`
- `"1 / 0"` throws `Division by zero`
