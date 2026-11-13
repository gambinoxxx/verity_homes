// Admin glyphs copied from the <symbol> set in design/admin.html (stroke only, currentColor).
import type { AdminIcon as AdminIconName } from "@/lib/admin-nav";

const PATHS: Record<
  AdminIconName | "menu" | "close" | "ext" | "plus" | "eye" | "trash" | "x" | "up" | "down",
  React.ReactNode
> = {
  dash: (
    <>
      <rect x="3" y="3" width="8" height="8" rx="2" />
      <rect x="13" y="3" width="8" height="5" rx="2" />
      <rect x="13" y="10" width="8" height="11" rx="2" />
      <rect x="3" y="13" width="8" height="8" rx="2" />
    </>
  ),
  home: (
    <>
      <path d="M4 11l8-6 8 6v9H4z" strokeLinejoin="round" />
      <path d="M10 20v-5h4v5" strokeLinejoin="round" />
    </>
  ),
  chart: <path d="M3 17l6-6 4 4 8-8M15 7h6v6" strokeLinecap="round" strokeLinejoin="round" />,
  pen: <path d="M4 20h4L19 9l-4-4L4 16zM14 6l4 4" strokeLinejoin="round" />,
  quote: <path d="M5 17V12c0-3 2-5 5-5M14 17v-5c0-3 2-5 5-5M5 17h4v-5H5M14 17h4v-5h-4" />,
  hand: <path d="M3 12l4-4 5 2 3-2 6 5-5 5-4-2-3 2z" strokeLinecap="round" />,
  inbox: (
    <>
      <path d="M3 13l3-8h12l3 8v6H3z" strokeLinejoin="round" />
      <path d="M3 13h5l1 3h6l1-3h5" strokeLinejoin="round" />
    </>
  ),
  gear: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" strokeWidth="2" strokeLinecap="round" />,
  close: <path d="M6 6l12 12M18 6 6 18" strokeWidth="2" strokeLinecap="round" />,
  plus: <path d="M12 5v14M5 12h14" strokeWidth="2" strokeLinecap="round" />,
  eye: (
    <>
      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  trash: <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" strokeLinejoin="round" />,
  x: <path d="M6 6l12 12M18 6 6 18" strokeWidth="2" strokeLinecap="round" />,
  up: <path d="M12 19V5M6 11l6-6 6 6" strokeWidth="2" strokeLinecap="round" />,
  down: <path d="M12 5v14M6 13l6 6 6-6" strokeWidth="2" strokeLinecap="round" />,
  ext: <path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6" strokeLinecap="round" strokeLinejoin="round" />,
};

export function AdminIcon({ name, className }: { name: keyof typeof PATHS; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}
