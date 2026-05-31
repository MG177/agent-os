import {
  Apple,
  Calendar,
  Check,
  ChevronLeft,
  ClipboardList,
  Columns3,
  Folder,
  House,
  Inbox,
  Plus,
  Sparkles,
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
export const IconVault = makeIcon(Folder, "h-5 w-5");
/** Finder-style column browser */
export const IconBrowse = makeIcon(Columns3, "h-4 w-4");
export const IconInbox = makeIcon(Inbox, "h-5 w-5");
export const IconCalendar = makeIcon(Calendar, "h-5 w-5");
export const IconCheck = makeIcon(Check, "h-4 w-4");
