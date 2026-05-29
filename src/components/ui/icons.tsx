type IconProps = { className?: string; active?: boolean };

const base = "h-5 w-5";

export function IconHome({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      className={className ?? base}
      aria-hidden
    >
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" strokeLinejoin="round" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

export function IconCapture({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      className={className ?? base}
      aria-hidden
    >
      <line x1={12} y1={5} x2={12} y2={19} />
      <line x1={5} y1={12} x2={19} y2={12} />
    </svg>
  );
}

export function IconNutrition({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      className={className ?? base}
      aria-hidden
    >
      <path d="M12 3c-1.5 2-4 4-4 7a4 4 0 108 0c0-3-2.5-5-4-7z" strokeLinejoin="round" />
      <path d="M8 21h8" strokeLinecap="round" />
    </svg>
  );
}

export function IconActivity({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      className={className ?? base}
      aria-hidden
    >
      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
      <rect x={9} y={3} width={6} height={4} rx={1} />
      <line x1={9} y1={12} x2={15} y2={12} />
      <line x1={9} y1={16} x2={13} y2={16} />
    </svg>
  );
}

export function IconBack({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className={className ?? "h-4 w-4"}
      aria-hidden
    >
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

export function IconVault({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      className={className ?? base}
      aria-hidden
    >
      <path
        d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Finder-style column browser */
export function IconBrowse({ className, active }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? 2 : 1.6}
      className={className ?? "h-4 w-4"}
      aria-hidden
    >
      <rect x={4} y={6} width={4} height={12} rx={0.75} />
      <rect x={10} y={6} width={4} height={12} rx={0.75} />
      <rect x={16} y={6} width={3} height={12} rx={0.75} opacity={0.45} />
    </svg>
  );
}

export function IconInbox({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      className={className ?? base}
      aria-hidden
    >
      <path d="M22 12h-6l-2 3H10l-2-3H2" strokeLinejoin="round" />
      <path
        d="M5.45 5.11 2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconCalendar({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      className={className ?? base}
      aria-hidden
    >
      <rect x={3} y={4} width={18} height={18} rx={2} />
      <line x1={16} y1={2} x2={16} y2={6} />
      <line x1={8} y1={2} x2={8} y2={6} />
      <line x1={3} y1={10} x2={21} y2={10} />
    </svg>
  );
}

export function IconCheck({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className={className ?? "h-4 w-4"}
      aria-hidden
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
