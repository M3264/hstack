"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { GITHUB, INSTALL_CMD, INSTALL_FROM_SOURCE } from "@/lib/site";

const links = [
  { href: "#how", label: "How it works" },
  { href: "#benchmark", label: "Benchmark" },
  { href: "#skills", label: "Skills" },
  { href: GITHUB, label: "Docs" },
];

export function Nav() {
  const [open, setOpen] = useState(false); // install dropdown
  const [menu, setMenu] = useState(false); // mobile menu
  const [copied, setCopied] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); setMenu(false); } };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, []);

  const commands = { curl: INSTALL_CMD, go: INSTALL_FROM_SOURCE } as const;
  async function copy(which: keyof typeof commands) {
    try { await navigator.clipboard.writeText(commands[which]); setCopied(which); } catch { setCopied("failed"); }
    setTimeout(() => { setCopied(null); setOpen(false); }, 1500);
  }

  return (
    <header className="gutter sticky top-0 z-40 border-b border-line/60 bg-bg/80 backdrop-blur" style={{ top: "env(safe-area-inset-top, 0px)" }}>
      <nav className="mx-auto flex h-16 max-w-6xl items-center gap-6" aria-label="Main">
        <a href="#" className="flex items-center gap-2.5 font-semibold tracking-tight" aria-label="hstack home">
          <Image src="/logo-256.png" alt="" width={30} height={30} priority />
          <span className="text-lg">hstack</span>
        </a>

        <ul className="ml-4 hidden items-center gap-7 text-[15px] text-ink-2 md:flex">
          {links.map((l) => (
            <li key={l.label}>
              <a href={l.href} className="transition-colors hover:text-ink" {...(l.href.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})}>
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="ml-auto flex items-center gap-2.5">
          <a href={GITHUB} target="_blank" rel="noreferrer" className="hidden h-10 items-center rounded-full bg-surface-2 px-5 text-[15px] transition-colors hover:bg-line sm:flex">
            GitHub
          </a>
          <div ref={ref} className="relative flex h-10 items-stretch overflow-visible">
            <button type="button" onClick={() => copy("curl")} className="rounded-l-full bg-ink pl-5 pr-4 text-[15px] font-medium text-bg transition-opacity hover:opacity-90">
              {copied === "curl" ? "Copied ✓" : copied === "failed" ? "Copy failed" : "Install"}
            </button>
            <button
              type="button"
              aria-label="Choose where to install"
              aria-expanded={open}
              aria-haspopup="menu"
              onClick={() => setOpen((v) => !v)}
              className="rounded-r-full border-l border-bg/15 bg-ink px-3 text-bg transition-opacity hover:opacity-90"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden><path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            {open && (
              <div role="menu" className="absolute right-0 top-12 w-64 rounded-2xl border border-line bg-surface p-1.5 shadow-2xl">
                {(["curl", "go"] as const).map((k) => (
                  <button key={k} role="menuitem" type="button" onClick={() => copy(k)} className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm hover:bg-surface-2">
                    <span>{k === "curl" ? "One-line install" : "From source (Go)"}</span>
                    <span className="font-mono text-xs text-ink-3">{copied === k ? "copied ✓" : "copy command"}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button type="button" className="ml-1 grid h-10 w-10 place-items-center rounded-full bg-surface-2 md:hidden" aria-label="Open menu" aria-expanded={menu} onClick={() => setMenu((v) => !v)}>
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden><path d="M2 5h12M2 11h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
          </button>
        </div>
      </nav>
      {menu && (
        <ul className="mx-auto flex max-w-6xl flex-col gap-1 pb-4 md:hidden">
          {links.map((l) => (
            <li key={l.label}>
              <a href={l.href} onClick={() => setMenu(false)} className="block rounded-xl px-3 py-2.5 text-ink-2 hover:bg-surface-2 hover:text-ink">
                {l.label}
              </a>
            </li>
          ))}
        </ul>
      )}
    </header>
  );
}
