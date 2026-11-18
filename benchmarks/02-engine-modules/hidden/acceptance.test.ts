// Hidden acceptance suite for benchmark 2. Copied into a finished run as test/acceptance.test.ts.
import { describe, expect, it } from "vitest";
import { renderMarkdown } from "../src/markdown";
import { nextRun, parseCron } from "../src/cron";
import { query } from "../src/jsonpath";
import { diffLines, unifiedDiff } from "../src/diff";
import { render } from "../src/template";
import { evaluate } from "../src/expr";

describe("markdown", () => {
  it.each([
    ["# Hi", "<h1>Hi</h1>"],
    ["###### Six", "<h6>Six</h6>"],
    ["Hello *world* and **bold** with `a<b`", "<p>Hello <em>world</em> and <strong>bold</strong> with <code>a&lt;b</code></p>"],
    ["_under_", "<p><em>under</em></p>"],
    ["[x](https://e.com?a=1&b=2)", '<p><a href="https://e.com?a=1&amp;b=2">x</a></p>'],
    ["[x](javascript:alert(1))", "<p>x</p>"],
    ["[x](JavaScript:alert(1))", "<p>x</p>"],
    ["> quote\n> more", "<blockquote>\n<p>quote\nmore</p>\n</blockquote>"],
    ["# T\n\npara\n\n---", "<h1>T</h1>\n<p>para</p>\n<hr>"],
    ["\\*not em\\* & <b>", "<p>*not em* &amp; &lt;b&gt;</p>"],
    ["```ts\nconst a = 1 < 2;\n```", '<pre><code class="language-ts">const a = 1 &lt; 2;\n</code></pre>'],
    ["```\n*raw*\n```", "<pre><code>*raw*\n</code></pre>"],
    ["- a\n- b\n  - c\n- d", "<ul>\n<li>a</li>\n<li>b\n<ul>\n<li>c</li>\n</ul>\n</li>\n<li>d</li>\n</ul>"],
    ["3. x\n4. y", '<ol start="3">\n<li>x</li>\n<li>y</li>\n</ol>'],
    ["1. one\n2. **two**", "<ol>\n<li>one</li>\n<li><strong>two</strong></li>\n</ol>"],
    ["a\nb", "<p>a\nb</p>"],
  ])("%j", (src, html) => {
    expect(renderMarkdown(src)).toBe(html);
  });
});

describe("cron", () => {
  const at = (iso: string) => new Date(iso);
  it.each([
    ["*/15 * * * *", "2026-01-01T10:07:30Z", "2026-01-01T10:15:00.000Z"],
    ["0 9 * * MON-FRI", "2026-01-02T09:00:00Z", "2026-01-05T09:00:00.000Z"],
    ["0 0 1 * *", "2026-01-31T12:00:00Z", "2026-02-01T00:00:00.000Z"],
    ["30 2 29 2 *", "2026-03-01T00:00:00Z", "2028-02-29T02:30:00.000Z"],
    ["0 12 13 * 5", "2026-01-01T13:00:00Z", "2026-01-02T12:00:00.000Z"],
    ["0 0 * * 7", "2026-01-01T00:00:00Z", "2026-01-04T00:00:00.000Z"],
    ["5 4 * * *", "2026-01-01T04:05:00Z", "2026-01-02T04:05:00.000Z"],
    ["0 0 1 JAN,JUL *", "2026-02-01T00:00:00Z", "2026-07-01T00:00:00.000Z"],
    ["0 0 * * sun", "2026-01-01T00:00:00Z", "2026-01-04T00:00:00.000Z"],
  ])("nextRun(%s, %s)", (expr, after, out) => {
    expect(nextRun(expr, at(after)).toISOString()).toBe(out);
  });
  it("parses steps, lists and normalises weekday 7", () => {
    expect(parseCron("1-10/3 * * * *").minutes).toEqual([1, 4, 7, 10]);
    expect(parseCron("0 0 * * 0,7").weekdays).toEqual([0]);
    expect(parseCron("0 0 * * *").domRestricted).toBe(false);
  });
  it.each(["60 * * * *", "* * * *", "*/0 * * * *", "5-1 * * * *", "* * * FOO *"])("rejects %s", (bad) => {
    expect(() => parseCron(bad)).toThrow(/^Invalid cron expression/);
  });
});

describe("jsonpath", () => {
  const doc = { store: {
    book: [
      { category: "reference", author: "Nigel Rees", title: "Sayings", price: 8.95 },
      { category: "fiction", author: "Evelyn Waugh", title: "Sword", price: 12.99 },
      { category: "fiction", author: "Herman Melville", title: "Moby Dick", isbn: "0-553", price: 8.99 },
      { category: "fiction", author: "J. R. R. Tolkien", title: "LOTR", isbn: "0-395", price: 22.99 } ],
    bicycle: { color: "red", price: 19.95 } } };
  const authors = ["Nigel Rees", "Evelyn Waugh", "Herman Melville", "J. R. R. Tolkien"];
  it.each([
    ["$.store.book[*].author", authors],
    ["$..author", authors],
    ["$..price", [8.95, 12.99, 8.99, 22.99, 19.95]],
    ["$..book[2].title", ["Moby Dick"]],
    ["$..book[-1].title", ["LOTR"]],
    ["$..book[0:2].title", ["Sayings", "Sword"]],
    ["$..book[-2:].title", ["Moby Dick", "LOTR"]],
    ["$..book[?(@.isbn)].title", ["Moby Dick", "LOTR"]],
    ["$..book[?(@.price < 10)].title", ["Sayings", "Moby Dick"]],
    ["$..book[?(@.category == 'fiction' && @.price > 20)].title", ["LOTR"]],
    ["$..book[?(@.price > 20 || @.category == \"reference\")].title", ["Sayings", "LOTR"]],
    ["$.store['bicycle'].color", ["red"]],
    ["$.store.bicycle.*", ["red", 19.95]],
    ["$.nope", []],
  ])("%s", (path, out) => {
    expect(query(doc, path)).toEqual(out);
  });
  it("throws on syntax errors with a position", () => {
    expect(() => query(doc, "$.store[")).toThrow(/^Invalid JSONPath at \d+$/);
  });
});

describe("diff", () => {
  it("produces a minimal script with deletes before inserts", () => {
    expect(diffLines("a\nb\nc", "a\nc\nd")).toEqual([
      { type: "equal", line: "a" }, { type: "delete", line: "b" },
      { type: "equal", line: "c" }, { type: "insert", line: "d" },
    ]);
    const ops = diffLines("a\nb\nc\nd", "b\nc\nd\ne");
    expect(ops.filter((o) => o.type !== "equal")).toHaveLength(2);
    expect(diffLines("x\ny", "z")).toEqual([
      { type: "delete", line: "x" }, { type: "delete", line: "y" }, { type: "insert", line: "z" },
    ]);
    expect(diffLines("", "x")).toEqual([{ type: "insert", line: "x" }]);
    expect(diffLines("a\n", "a")).toEqual([{ type: "equal", line: "a" }]);
  });
  it("renders unified hunks", () => {
    const a = Array.from({ length: 10 }, (_, i) => String(i + 1)).join("\n");
    const b = a.replace("\n5\n", "\nfive\n");
    expect(unifiedDiff(a, b)).toBe("--- a\n+++ b\n@@ -2,7 +2,7 @@\n 2\n 3\n 4\n-5\n+five\n 6\n 7\n 8\n");
    expect(unifiedDiff(a, a)).toBe("");
  });
  it("splits distant changes into separate hunks", () => {
    const lines = Array.from({ length: 20 }, (_, i) => `l${i + 1}`);
    const changed = [...lines]; changed[1] = "X"; changed[17] = "Y";
    const out = unifiedDiff(lines.join("\n"), changed.join("\n"), { fromFile: "old", toFile: "new" });
    expect(out.startsWith("--- old\n+++ new\n")).toBe(true);
    expect(out).toContain("@@ -1,5 +1,5 @@\n");
    expect(out).toContain("@@ -15,6 +15,6 @@\n");
    expect(out.match(/^@@/gm)).toHaveLength(2);
  });
});

describe("template", () => {
  it.each([
    ["Hi {{name}}!", { name: "<Ada>" }, "Hi &lt;Ada&gt;!"],
    ["{{{h}}}{{& h}}", { h: "<b>" }, "<b><b>"],
    ["{{ a.b.c }}", { a: { b: { c: "x" } } }, "x"],
    ["{{#items}}[{{.}}]{{/items}}", { items: [1, 2, 3] }, "[1][2][3]"],
    ["{{#people}}{{name}}@{{org}} {{/people}}", { org: "X", people: [{ name: "Ada" }, { name: "Bob" }] }, "Ada@X Bob@X "],
    ["{{^items}}none{{/items}}", { items: [] }, "none"],
    ["{{^items}}none{{/items}}", { items: [1] }, ""],
    ["{{#show}}x{{/show}}", { show: false }, ""],
    ["{{#a}}{{b}}{{/a}}", { a: { b: "y" } }, "y"],
    ["{{q}}", { q: "\"it's\"" }, "&quot;it&#39;s&quot;"],
    ["a{{! nope }}b", {}, "ab"],
    ["[{{missing}}]", {}, "[]"],
    ["{{n}}", { n: 0 }, "0"],
  ])("%j", (tpl, view, out) => {
    expect(render(tpl, view)).toBe(out);
  });
  it("renders partials with the current context", () => {
    expect(render("{{> user}}", { name: "A" }, { user: "<b>{{name}}</b>" })).toBe("<b>A</b>");
  });
  it("throws on unclosed sections", () => {
    expect(() => render("{{#items}}x", { items: [1] })).toThrow("Unclosed section: items");
  });
});

describe("expr", () => {
  it.each([
    ["1 + 2 * 3", 7], ["(1 + 2) * 3", 9], ["2 ^ 3 ^ 2", 512], ["-2 ^ 2", -4], ["2 ^ -1", 0.5],
    ["10 % 4", 2], ["1.5e2 / 3", 50], ["--3", 3], ["min(3, 1, 2) + max(4, 5)", 6],
    ["round(2.5) + floor(-1.5) + ceil(1.2)", 3], ["sqrt(16) + abs(-3)", 7],
  ])("%s = %d", (src, out) => {
    expect(evaluate(src)).toBe(out);
  });
  it("uses variables and constants", () => {
    expect(evaluate("x * y", { x: 2, y: 3 })).toBe(6);
    expect(evaluate("pi")).toBeCloseTo(Math.PI);
    expect(evaluate("e")).toBeCloseTo(Math.E);
  });
  it.each([
    ["2 + * 3", "Unexpected token '*' at 4"],
    ["2 * (3", "Unexpected end of input"],
    ["foo(1)", "Unknown function: foo"],
    ["z + 1", "Unknown variable: z"],
    ["1 / 0", "Division by zero"],
    ["5 % 0", "Division by zero"],
  ])("%s throws %s", (src, msg) => {
    expect(() => evaluate(src)).toThrow(msg);
  });
});
