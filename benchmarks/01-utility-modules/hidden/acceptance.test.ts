 // Hidden acceptance suite. Copied into a finished run as test/acceptance.test.ts.
import { describe, expect, it } from "vitest";
import { slugify } from "../src/slug";
import { compare, parse, satisfies } from "../src/semver";
import { parseCsv, stringifyCsv } from "../src/csv";
import { slidingWindowLimiter, TokenBucket } from "../src/ratelimit";

describe("slug", () => {
  it.each([
    ["Hello, World!", undefined, "hello-world"],
    ["  --Rock & Roll--  ", undefined, "rock-and-roll"],
    ["Crème Brûlée", undefined, "creme-brulee"],
    ["Hello World", { separator: "_" }, "hello_world"],
    ["Hello World", { lowercase: false }, "Hello-World"],
    ["!!!", undefined, ""],
    ["hello big world", { maxLength: 12 }, "hello-big"],
    ["abcdefghij", { maxLength: 4 }, "abcd"],
    ["a--b__c", undefined, "a-b-c"],
  ])("slugify(%j, %j) = %j", (input, opts, out) => {
    expect(slugify(input, opts)).toBe(out);
  });
});

describe("semver", () => {
  it("parses and rejects", () => {
    expect(parse("v1.2.3-beta.1+build.5")).toEqual({ major: 1, minor: 2, patch: 3, prerelease: ["beta", "1"] });
    for (const bad of ["1.2", "01.2.3", "1.2.3-", "a.b.c", ""]) expect(parse(bad)).toBeNull();
  });
  it("orders prereleases per semver 2.0", () => {
    const order = ["1.0.0-alpha", "1.0.0-alpha.1", "1.0.0-alpha.beta", "1.0.0-beta", "1.0.0-beta.2", "1.0.0-beta.11", "1.0.0-rc.1", "1.0.0"];
    for (let i = 0; i < order.length - 1; i++) {
      expect(compare(order[i], order[i + 1])).toBe(-1);
      expect(compare(order[i + 1], order[i])).toBe(1);
    }
    expect(compare("1.2.3", "v1.2.3+meta")).toBe(0);
    expect(() => compare("x", "1.0.0")).toThrow("Invalid version: x");
  });
  it.each([
    ["1.5.0", "^1.2.3", true],
    ["2.0.0", "^1.2.3", false],
    ["0.2.9", "^0.2.3", true],
    ["0.3.0", "^0.2.3", false],
    ["0.0.3", "^0.0.3", true],
    ["0.0.4", "^0.0.3", false],
    ["1.2.9", "~1.2.3", true],
    ["1.3.0", "~1.2.3", false],
    ["1.2.4-beta", "^1.2.3", false],
    ["1.2.4-beta", ">=1.2.4-alpha", true],
    ["3.1.0", "^1.0.0 || >=3.0.0 <4", true],
    ["4.0.0", "^1.0.0 || >=3.0.0 <4", false],
    ["1.2.3", "=1.2.3", true],
    ["9.9.9", "*", true],
    ["1.0.0-rc.1", "*", false],
    ["nope", "*", false],
  ])("satisfies(%s, %s) = %s", (v, r, out) => {
    expect(satisfies(v, r)).toBe(out);
  });
});

describe("csv", () => {
  it("parses RFC 4180 quoting and line endings", () => {
    expect(parseCsv('a,"b,c","d ""q"""\r\n1,"line\nbreak",3\n')).toEqual([
      ["a", "b,c", 'd "q"'],
      ["1", "line\nbreak", "3"],
    ]);
    expect(parseCsv("")).toEqual([]);
    expect(parseCsv("x;y\n1;2", { delimiter: ";" })).toEqual([["x", "y"], ["1", "2"]]);
  });
  it("supports header rows", () => {
    expect(parseCsv("name,age\nada,36\nbob", { header: true })).toEqual([
      { name: "ada", age: "36" },
      { name: "bob", age: "" },
    ]);
    expect(() => parseCsv("a,b\n1,2,3", { header: true })).toThrow("Row 1 has 3 fields, expected 2");
  });
  it("reports unterminated quotes with the starting line", () => {
    expect(() => parseCsv('a,b\nc,"oops\nmore')).toThrow("Unterminated quote at line 2");
  });
  it("stringifies minimally and round-trips", () => {
    const rows = [["plain", "has,comma", 'has "quote"', "multi\nline", ""]];
    expect(stringifyCsv(rows)).toBe('plain,"has,comma","has ""quote""","multi\nline",');
    expect(parseCsv(stringifyCsv(rows))).toEqual(rows);
    expect(stringifyCsv([["a", "b"], ["c", "d"]])).toBe("a,b\nc,d");
  });
});

describe("ratelimit", () => {
  it("token bucket refills continuously and caps at capacity", () => {
    let now = 0;
    const b = new TokenBucket({ capacity: 5, refillPerSecond: 2, clock: () => now });
    expect(b.take(5)).toBe(true);
    expect(b.take()).toBe(false);
    expect(b.retryAfterMs()).toBe(500);
    now = 250;
    expect(b.available()).toBeCloseTo(0.5);
    expect(b.retryAfterMs(1)).toBe(250);
    now = 10_000;
    expect(b.available()).toBe(5);
    expect(b.take(2)).toBe(true);
    expect(b.available()).toBe(3);
    expect(b.take(4)).toBe(false);
    expect(b.available()).toBe(3);
    expect(b.retryAfterMs(6)).toBe(Infinity);
    expect(() => new TokenBucket({ capacity: 0, refillPerSecond: 1 })).toThrow(RangeError);
    expect(() => new TokenBucket({ capacity: 1, refillPerSecond: -1 })).toThrow(RangeError);
  });
  it("sliding window limits per key", () => {
    let now = 1000;
    const hit = slidingWindowLimiter({ limit: 2, windowMs: 1000, clock: () => now });
    expect(hit("a")).toEqual({ allowed: true, remaining: 1, resetMs: 1000 });
    now = 1400;
    expect(hit("a")).toEqual({ allowed: true, remaining: 0, resetMs: 600 });
    expect(hit("a")).toEqual({ allowed: false, remaining: 0, resetMs: 600 });
    expect(hit("b").allowed).toBe(true);
    now = 2001;
    expect(hit("a")).toEqual({ allowed: true, remaining: 0, resetMs: 399 });
  });
});
