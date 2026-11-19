/** The hstack face: a round body with two slanted eyes, like the logo. */
export function Face({ size = 40, color = "#f4f4f2", eye = "#0a0a0b", className }: { size?: number; color?: string; eye?: string; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" className={className} aria-hidden>
      <ellipse cx="20" cy="20.5" rx="18" ry="17" fill={color} />
      <path d="M19.2 13.8 L22.4 19.4" stroke={eye} strokeWidth="3.4" strokeLinecap="round" />
      <path d="M24.6 11.6 L28 17.2" stroke={eye} strokeWidth="3.4" strokeLinecap="round" />
    </svg>
  );
}
