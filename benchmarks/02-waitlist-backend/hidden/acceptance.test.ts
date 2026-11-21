// Hidden acceptance suite for benchmark 2. Copied into a finished run as test/acceptance.test.ts.
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createApp, type Email } from "../src/app";

const ADMIN = "admin-secret-token-123";
const BASE = "https://wait.example";
let t = Date.UTC(2026, 0, 1);
let apps: { close(): void }[] = [];

function make(extra: Partial<Parameters<typeof createApp>[0]> = {}) {
  const sent: Email[] = [];
  const app = createApp({
    adminToken: ADMIN, baseUrl: BASE, now: () => t,
    sendEmail: async (e) => { sent.push(e); },
    rateLimit: { max: 1000, windowMs: 60_000 },
    ...extra,
  });
  apps.push(app);
  return { app, sent };
}
afterEach(() => { apps.forEach((a) => a.close()); apps = []; t = Date.UTC(2026, 0, 1); });

const req = (path: string, init: RequestInit & { json?: unknown; ip?: string; admin?: string } = {}) => {
  const headers = new Headers(init.headers);
  if (init.json !== undefined) headers.set("content-type", "application/json");
  if (init.ip) headers.set("x-forwarded-for", init.ip);
  if (init.admin) headers.set("authorization", `Bearer ${init.admin}`);
  return new Request(BASE + path, { ...init, headers, body: init.json !== undefined ? JSON.stringify(init.json) : init.body });
};
type App = ReturnType<typeof make>["app"];
const signup = (app: App, body: Record<string, unknown>) => app.fetch(req("/api/waitlist", { method: "POST", json: body }));
const token = (e: Email, kind: "confirm" | "unsubscribe") =>
  (kind === "confirm" ? /\/api\/waitlist\/confirm\?token=([A-Za-z0-9_-]+)/ : /\/unsubscribe\?token=([A-Za-z0-9_-]+)/).exec(e.text)?.[1] ?? "";
async function errCode(res: Response) { return ((await res.json()) as { error: { code: string } }).error.code; }

describe("health and routing", () => {
  it("health", async () => {
    const { app } = make();
    const r = await app.fetch(req("/healthz"));
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ ok: true });
  });
  it("unknown path 404 and wrong method 405 with Allow", async () => {
    const { app } = make();
    const r = await app.fetch(req("/nope"));
    expect(r.status).toBe(404);
    expect(await errCode(r)).toBe("not_found");
    const m = await app.fetch(req("/api/waitlist", { method: "GET" }));
    expect(m.status).toBe(405);
    expect(await errCode(m)).toBe("method_not_allowed");
    expect(m.headers.get("allow") ?? "").toMatch(/POST/);
  });
});

describe("signup", () => {
  it("creates a pending entry and sends the confirmation email", async () => {
    const { app, sent } = make();
    const r = await signup(app, { email: "  Ada@Example.COM ", name: " Ada " });
    expect(r.status).toBe(201);
    expect(r.headers.get("content-type") ?? "").toMatch(/^application\/json/);
    const b = await r.json();
    expect(b).toMatchObject({ email: "ada@example.com", status: "pending", emailSent: true });
    expect(typeof b.id).toBe("string");
    expect(b.referralCode).toMatch(/^[a-z0-9]{8}$/);
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe("ada@example.com");
    expect(sent[0].subject).toBe("Confirm your spot on the waitlist");
    expect(sent[0].text).toContain(`${BASE}/api/waitlist/confirm?token=`);
    expect(sent[0].text).toContain(`${BASE}/unsubscribe?token=`);
    expect(token(sent[0], "confirm").length).toBeGreaterThanOrEqual(32);
    expect(token(sent[0], "unsubscribe").length).toBeGreaterThanOrEqual(32);
  });
  it.each([
    [{ email: "not-an-email" }, 400, "invalid_email"],
    [{ email: "a@b.c" }, 400, "invalid_email"],
    [{ email: "a@b.co", name: "   " }, 400, "invalid_name"],
    [{ email: "a@b.co", name: "x".repeat(101) }, 400, "invalid_name"],
    [{ email: "a@b.co", referralCode: "zzzzzzzz" }, 400, "invalid_referral_code"],
  ])("rejects %j", async (body, status, code) => {
    const { app, sent } = make();
    const r = await signup(app, body);
    expect(r.status).toBe(status);
    expect(await errCode(r)).toBe(code);
    expect(sent).toHaveLength(0);
  });
  it("415, 413 and invalid_json", async () => {
    const { app } = make();
    const a = await app.fetch(req("/api/waitlist", { method: "POST", headers: { "content-type": "text/plain" }, body: "x" }));
    expect(a.status).toBe(415);
    expect(await errCode(a)).toBe("unsupported_media_type");
    const big = await app.fetch(req("/api/waitlist", { method: "POST", json: { email: "a@b.co", name: "x".repeat(11_000) } }));
    expect(big.status).toBe(413);
    expect(await errCode(big)).toBe("payload_too_large");
    for (const body of ["[1,2]", "{bad"]) {
      const r = await app.fetch(req("/api/waitlist", { method: "POST", headers: { "content-type": "application/json" }, body }));
      expect(r.status).toBe(400);
      expect(await errCode(r)).toBe("invalid_json");
    }
  });
  it("existing pending email returns 200, resends, and rotates the confirm token", async () => {
    const { app, sent } = make();
    const first = await (await signup(app, { email: "dup@x.io" })).json();
    t += 1000;
    const r = await signup(app, { email: "DUP@x.io", name: "Other" });
    expect(r.status).toBe(200);
    const b = await r.json();
    expect(b.id).toBe(first.id);
    expect(b.emailSent).toBe(true);
    expect(sent).toHaveLength(2);
    const old = await app.fetch(req(`/api/waitlist/confirm?token=${token(sent[0], "confirm")}`));
    expect(old.status).toBe(400);
    expect(await errCode(old)).toBe("invalid_token");
    const ok = await app.fetch(req(`/api/waitlist/confirm?token=${token(sent[1], "confirm")}`));
    expect(ok.status).toBe(200);
    const again = await signup(app, { email: "dup@x.io" });
    expect(again.status).toBe(200);
    expect((await again.json()).emailSent).toBe(false);
    expect(sent).toHaveLength(2);
  });
  it("still creates the entry when email sending fails", async () => {
    const { app } = make({ sendEmail: async () => { throw new Error("smtp down"); } });
    const r = await signup(app, { email: "fail@x.io" });
    expect(r.status).toBe(201);
    expect((await r.json()).emailSent).toBe(false);
    const s = await app.fetch(req("/api/waitlist/status?email=fail@x.io"));
    expect(s.status).toBe(200);
  });
  it("rate limits per IP with Retry-After, using opts.now", async () => {
    const { app } = make({ rateLimit: { max: 2, windowMs: 10_000 } });
    const post = (ip: string, email: string) => app.fetch(req("/api/waitlist", { method: "POST", json: { email }, ip }));
    expect((await post("1.1.1.1", "r1@x.io")).status).toBe(201);
    t += 2000;
    expect((await post("1.1.1.1, 10.0.0.1", "not-valid")).status).toBe(400);
    const limited = await post("1.1.1.1", "r3@x.io");
    expect(limited.status).toBe(429);
    expect(await errCode(limited)).toBe("rate_limited");
    expect(Number(limited.headers.get("retry-after"))).toBeGreaterThanOrEqual(1);
    expect((await post("2.2.2.2", "r4@x.io")).status).toBe(201);
    t += 9000;
    expect((await post("1.1.1.1", "r5@x.io")).status).toBe(201);
  });
});

describe("confirm, status, referrals, unsubscribe", () => {
  async function confirmed(app: App, sent: Email[], email: string, extra: Record<string, unknown> = {}) {
    const b = await (await signup(app, { email, ...extra })).json();
    const r = await app.fetch(req(`/api/waitlist/confirm?token=${token(sent[sent.length - 1], "confirm")}`));
    return { entry: b, confirm: r, unsub: token(sent[sent.length - 1], "unsubscribe") };
  }
  it("confirms once, rejects unknown and expired tokens", async () => {
    const { app, sent } = make();
    const { confirm } = await confirmed(app, sent, "c@x.io");
    expect(confirm.status).toBe(200);
    expect(await confirm.json()).toEqual({ status: "confirmed", position: 1 });
    const reuse = await app.fetch(req(`/api/waitlist/confirm?token=${token(sent[0], "confirm")}`));
    expect(reuse.status).toBe(400);
    expect(await errCode(reuse)).toBe("invalid_token");
    const unknown = await app.fetch(req("/api/waitlist/confirm?token=" + "a".repeat(40)));
    expect(await errCode(unknown)).toBe("invalid_token");
    await signup(app, { email: "late@x.io" });
    t += 86_400_001;
    const exp = await app.fetch(req(`/api/waitlist/confirm?token=${token(sent[1], "confirm")}`));
    expect(exp.status).toBe(410);
    expect(await errCode(exp)).toBe("token_expired");
  });
  it("status endpoint", async () => {
    const { app } = make();
    await signup(app, { email: "s@x.io" });
    const r = await app.fetch(req("/api/waitlist/status?email=%20S@X.io"));
    expect(r.status).toBe(200);
    const b = await r.json();
    expect(b).toMatchObject({ status: "pending", position: null, referrals: 0 });
    expect(b.referralCode).toMatch(/^[a-z0-9]{8}$/);
    const nf = await app.fetch(req("/api/waitlist/status?email=nobody@x.io"));
    expect(nf.status).toBe(404);
    expect(await errCode(nf)).toBe("not_found");
  });
  it("referrals move the referrer up; unsubscribing removes the credit", async () => {
    const { app, sent } = make();
    const a = await confirmed(app, sent, "a@x.io");
    t += 1000;
    const b = await confirmed(app, sent, "b@x.io");
    t += 1000;
    const pos = async (email: string) => (await (await app.fetch(req(`/api/waitlist/status?email=${email}`))).json());
    expect((await pos("a@x.io")).position).toBe(1);
    expect((await pos("b@x.io")).position).toBe(2);
    const c = await confirmed(app, sent, "c@x.io", { referralCode: b.entry.referralCode });
    expect(c.confirm.status).toBe(200);
    expect(await pos("b@x.io")).toMatchObject({ position: 1, referrals: 1 });
    expect((await pos("a@x.io")).position).toBe(2);
    expect((await pos("c@x.io")).position).toBe(3);
    const del = await app.fetch(req(`/api/waitlist?token=${c.unsub}`, { method: "DELETE" }));
    expect(del.status).toBe(204);
    expect(await del.text()).toBe("");
    expect(await pos("b@x.io")).toMatchObject({ position: 2, referrals: 0 });
    const gone = await app.fetch(req("/api/waitlist/status?email=c@x.io"));
    expect(gone.status).toBe(404);
    const unknown = await app.fetch(req(`/api/waitlist?token=${c.unsub}`, { method: "DELETE" }));
    expect(unknown.status).toBe(404);
    const again = await signup(app, { email: "c@x.io" });
    expect(again.status).toBe(201);
    expect((await again.json()).id).not.toBe(c.entry.id);
    expect(a.confirm.status).toBe(200);
  });
});

describe("admin", () => {
  async function seed() {
    const ctx = make();
    for (const [i, email] of ["p1@x.io", "p2@x.io", "p3@x.io"].entries()) {
      t = Date.UTC(2026, 0, 1) + i * 1000;
      await signup(ctx.app, { email, name: i === 1 ? "Lovelace, Ada" : i === 2 ? "=1+1" : undefined });
    }
    return ctx;
  }
  it("requires the bearer token", async () => {
    const { app } = await seed();
    expect((await app.fetch(req("/api/admin/waitlist"))).status).toBe(401);
    const wrong = await app.fetch(req("/api/admin/waitlist", { admin: "nope" }));
    expect(wrong.status).toBe(401);
    expect(await errCode(wrong)).toBe("unauthorized");
  });
  it("lists in createdAt order with cursor pagination and validation", async () => {
    const { app } = await seed();
    const p1 = await (await app.fetch(req("/api/admin/waitlist?limit=2", { admin: ADMIN }))).json();
    expect(p1.items.map((i: { email: string }) => i.email)).toEqual(["p1@x.io", "p2@x.io"]);
    expect(p1.items[0]).toMatchObject({ status: "pending", name: null, referrals: 0, confirmedAt: null, createdAt: new Date(Date.UTC(2026, 0, 1)).toISOString() });
    expect(typeof p1.nextCursor).toBe("string");
    const p2 = await (await app.fetch(req(`/api/admin/waitlist?limit=2&cursor=${encodeURIComponent(p1.nextCursor)}`, { admin: ADMIN }))).json();
    expect(p2.items.map((i: { email: string }) => i.email)).toEqual(["p3@x.io"]);
    expect(p2.nextCursor).toBeNull();
    for (const limit of ["0", "201", "abc"]) {
      const r = await app.fetch(req(`/api/admin/waitlist?limit=${limit}`, { admin: ADMIN }));
      expect(r.status).toBe(400);
      expect(await errCode(r)).toBe("invalid_limit");
    }
    const bad = await app.fetch(req("/api/admin/waitlist?status=vip", { admin: ADMIN }));
    expect(await errCode(bad)).toBe("invalid_status");
    const pending = await (await app.fetch(req("/api/admin/waitlist?status=pending", { admin: ADMIN }))).json();
    expect(pending.items).toHaveLength(3);
  });
  it("invites only confirmed entries", async () => {
    const { app, sent } = make();
    const b = await (await signup(app, { email: "i@x.io" })).json();
    const notYet = await app.fetch(req(`/api/admin/waitlist/${b.id}/invite`, { method: "POST", admin: ADMIN }));
    expect(notYet.status).toBe(409);
    expect(await errCode(notYet)).toBe("not_confirmed");
    await app.fetch(req(`/api/waitlist/confirm?token=${token(sent[0], "confirm")}`));
    const ok = await app.fetch(req(`/api/admin/waitlist/${b.id}/invite`, { method: "POST", admin: ADMIN }));
    expect(ok.status).toBe(200);
    expect(await ok.json()).toEqual({ id: b.id, status: "invited" });
    expect(sent.at(-1)).toMatchObject({ to: "i@x.io", subject: "You're in!" });
    const twice = await app.fetch(req(`/api/admin/waitlist/${b.id}/invite`, { method: "POST", admin: ADMIN }));
    expect(await errCode(twice)).toBe("already_invited");
    const unknown = await app.fetch(req("/api/admin/waitlist/does-not-exist/invite", { method: "POST", admin: ADMIN }));
    expect(unknown.status).toBe(404);
    const s = await (await app.fetch(req("/api/waitlist/status?email=i@x.io"))).json();
    expect(s).toMatchObject({ status: "invited", position: null });
  });
  it("exports CSV with quoting and formula-injection guard", async () => {
    const { app } = await seed();
    const r = await app.fetch(req("/api/admin/waitlist.csv", { admin: ADMIN }));
    expect(r.status).toBe(200);
    expect(r.headers.get("content-type") ?? "").toMatch(/^text\/csv/);
    const text = await r.text();
    const lines = text.split("\n");
    expect(lines[0]).toBe("id,email,name,status,referrals,createdAt,confirmedAt");
    expect(lines).toHaveLength(4);
    expect(text.endsWith("\n")).toBe(false);
    expect(lines[1]).toMatch(/^[^,]+,p1@x\.io,,pending,0,2026-01-01T00:00:00\.000Z,$/);
    expect(lines[2]).toContain(',"Lovelace, Ada",');
    expect(lines[3]).toContain(",'=1+1,");
  });
});

describe("persistence", () => {
  it("survives close and reopen with the same dbPath", async () => {
    const dbPath = join(mkdtempSync(join(tmpdir(), "wl-")), "db.sqlite");
    const one = make({ dbPath });
    await signup(one.app, { email: "keep@x.io" });
    one.app.close();
    apps = apps.filter((a) => a !== one.app);
    const two = make({ dbPath });
    const r = await two.app.fetch(req("/api/waitlist/status?email=keep@x.io"));
    expect(r.status).toBe(200);
  });
});
