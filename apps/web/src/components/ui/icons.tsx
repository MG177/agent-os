import {
  Apple,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Columns3,
  Folder,
  Hash,
  House,
  Inbox,
  ListChecks,
  Pencil,
  Plus,
  Send,
  Sparkles,
  X,
  type LucideIcon,
} from "lucide-react";

type IconProps = { className?: string; active?: boolean };

/**
 * App icon set, backed by lucide-react.
 * Wrapped so call sites keep the `{ className, active }` API and the
 * design-system stroke weight (1.8) regardless of lucide's default.
 */
function makeIcon(Glyph: LucideIcon, defaultClass: string) {
  return function Icon({ className }: IconProps) {
    return (
      <Glyph className={className ?? defaultClass} strokeWidth={1.8} aria-hidden />
    );
  };
}

export const IconHome = makeIcon(House, "h-5 w-5");
export const IconCapture = makeIcon(Plus, "h-5 w-5");
export const IconNutrition = makeIcon(Apple, "h-5 w-5");
/** General assistant / AI agent */
export const IconAssistant = makeIcon(Sparkles, "h-5 w-5");
export const IconActivity = makeIcon(ClipboardList, "h-5 w-5");
export const IconBack = makeIcon(ChevronLeft, "h-4 w-4");
export const IconForward = makeIcon(ChevronRight, "h-4 w-4");
export const IconVault = makeIcon(Folder, "h-5 w-5");
/** Finder-style column browser */
export const IconBrowse = makeIcon(Columns3, "h-4 w-4");
export const IconInbox = makeIcon(Inbox, "h-5 w-5");
export const IconCalendar = makeIcon(Calendar, "h-5 w-5");
export const IconCheck = makeIcon(Check, "h-4 w-4");
/** Recurring todos / task checklist */
export const IconTasks = makeIcon(ListChecks, "h-5 w-5");
export const IconClose = makeIcon(X, "h-4 w-4");
export const IconEdit = makeIcon(Pencil, "h-4 w-4");
export const IconSend = makeIcon(Send, "h-4 w-4");
export const IconHash = makeIcon(Hash, "h-4 w-4");
/** ClickUp brand logo (full-color gradient) */
export function IconClickUp({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className ?? "h-5 w-5"}
      aria-hidden
    >
      <defs>
        <linearGradient
          id="clickup-smile"
          x1="2"
          y1="20"
          x2="22"
          y2="20"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#8930FD" />
          <stop offset="1" stopColor="#49CCF9" />
        </linearGradient>
        <linearGradient
          id="clickup-arrow"
          x1="2.4"
          y1="3"
          x2="21.6"
          y2="3"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#FF02F0" />
          <stop offset="0.5" stopColor="#FF5C5C" />
          <stop offset="1" stopColor="#FFC800" />
        </linearGradient>
      </defs>
      {/* Bottom "smile" */}
      <path
        fill="url(#clickup-smile)"
        d="M2 18.439l3.69-2.828c1.961 2.56 4.044 3.739 6.363 3.739 2.307 0 4.33-1.166 6.203-3.704L22 18.405C19.315 22.067 15.95 24 12.053 24c-3.884 0-7.273-1.92-10.053-5.561z"
      />
      {/* Top chevron */}
      <path
        fill="url(#clickup-arrow)"
        d="M12.04 6.15l-6.568 5.66L2.408 8.25 12.05 0l9.557 8.258-3.078 3.547-6.49-5.655z"
      />
    </svg>
  );
}
