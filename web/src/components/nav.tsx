"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { GITHUB, INSTALL_CMD } from "@/lib/site";
import { CopyButton } from "./copy-button";

const links = [
  { href: "#benchmark", label: "Benchmark" },
  { href: "#how", label: "How it works" },
  { href: "#skills", label: "Skills" },
];

export function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`gutter sticky top-0 z-50 border-b bg-bg/75 backdrop-blur-xl transition-colors duration-300 ${scrolled ? "border-line" : "border-transparent"}`}
    >
      <nav className="mx-auto flex h-14 max-w-[1240px] items-center justify-between gap-6" aria-label="Main">
        <a href="#" className="flex items-center gap-2 text-ink" aria-label="hstack home">
          <Image src="/logo-256.png" alt="" width={22} height={22} priority />
          <span className="text-base font-medium tracking-[-0.025em]">hstack</span>
        </a>
        <div className="flex items-center gap-1 sm:gap-2">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="hidden px-2.5 text-[13px] text-ink-2 transition-colors hover:text-ink md:block">
              {l.label}
            </a>
          ))}
          <a href={GITHUB} target="_blank" rel="noreferrer" className="flex h-9 items-center gap-2 px-2.5 text-[13px] text-ink-2 transition-colors hover:text-ink">
            <GitHubMark size={14} />
            <span>GitHub</span>
          </a>
          <CopyButton
            text={INSTALL_CMD}
            label="Copy the install command"
            className="h-8 rounded-lg bg-frontier px-3.5 text-[13px] font-semibold text-white transition-[background,transform] hover:-translate-y-px hover:bg-frontier-hover"
          >
            Install
          </CopyButton>
        </div>
      </nav>
    </header>
  );
}

export function GitHubMark({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 .5C5.65.5.5 5.65.5 12a11.5 11.5 0 0 0 7.86 10.93c.58.1.79-.25.79-.56v-2c-3.2.69-3.88-1.37-3.88-1.37-.52-1.33-1.27-1.69-1.27-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.75 1.18 1.75 1.18 1.02 1.75 2.68 1.25 3.34.95.1-.74.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.68 0-1.25.45-2.28 1.18-3.08-.12-.29-.51-1.46.11-3.04 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.62 1.58.23 2.75.11 3.04.74.8 1.18 1.83 1.18 3.08 0 4.41-2.69 5.39-5.25 5.67.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  );
}
