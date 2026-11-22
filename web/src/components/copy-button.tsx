"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

/** Copies `text`; shows "Copied" for 2s, or "Copy failed" for 3s. */
export function CopyButton({
  text,
  label,
  className,
  children,
}: {
  text: string;
  label: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  async function copy() {
    if (timer.current) clearTimeout(timer.current);
    let ok = false;
    try {
      await navigator.clipboard.writeText(text);
      ok = true;
    } catch {
      ok = false;
    }
    setState(ok ? "copied" : "failed");
    timer.current = setTimeout(() => setState("idle"), ok ? 2000 : 3000);
  }

  return (
    <Button type="button" onClick={copy} aria-label={label} className={className} data-state={state}>
      {state === "copied" ? "Copied ✓" : state === "failed" ? "Copy failed" : children ?? "Copy"}
      <span role="status" className="sr-only">
        {state === "copied" ? "Copied to clipboard" : state === "failed" ? "Copy failed" : ""}
      </span>
    </Button>
  );
}
