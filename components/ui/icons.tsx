import type { ReactNode, SVGProps } from "react";
import type { ToolCategory } from "@/convex/lib/constants";

/** Small stroke icon set (24px grid, 1.75 stroke), inlined so there's no icon dependency. */
type IconProps = SVGProps<SVGSVGElement>;

function icon(paths: ReactNode) {
  return function Icon({ className = "size-4", ...props }: IconProps) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
        className={className}
        {...props}
      >
        {paths}
      </svg>
    );
  };
}

export const SearchIcon = icon(
  <>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </>,
);
export const PlusIcon = icon(<path d="M12 5v14M5 12h14" />);
export const ArrowRightIcon = icon(<path d="M5 12h14M13 6l6 6-6 6" />);
export const CheckIcon = icon(<path d="M20 6 9 17l-5-5" />);
export const XIcon = icon(<path d="M18 6 6 18M6 6l12 12" />);
export const CalendarIcon = icon(
  <>
    <rect x="3" y="4.5" width="18" height="16.5" rx="2.5" />
    <path d="M16 2.5v4M8 2.5v4M3 10h18" />
  </>,
);
export const ClockIcon = icon(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </>,
);
export const GridIcon = icon(
  <>
    <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
    <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
    <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
    <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
  </>,
);
export const BoxIcon = icon(
  <>
    <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
    <path d="m3.3 7 8.7 5 8.7-5M12 22V12" />
  </>,
);
export const SendIcon = icon(
  <>
    <path d="M21.5 2.5 14.5 21l-3.6-8L3 9.5Z" />
    <path d="M21.5 2.5 10.9 13" />
  </>,
);
export const InboxIcon = icon(
  <>
    <path d="M22 12h-6l-2 3h-4l-2-3H2" />
    <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z" />
  </>,
);
export const ShieldIcon = icon(
  <>
    <path d="M12 21.5s8-3.8 8-9.8V5.2L12 2.5 4 5.2v6.5c0 6 8 9.8 8 9.8Z" />
    <path d="m9 12 2 2 4-4" />
  </>,
);
export const UsersIcon = icon(
  <>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
    <path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18.5 20a6.5 6.5 0 0 0-3-5.5" />
  </>,
);
export const PencilIcon = icon(<path d="M16.9 3.6a2.1 2.1 0 0 1 3 3L8 18.5l-4 1 1-4Z" />);
export const TrashIcon = icon(
  <path d="M3.5 6h17M18.5 6v13a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2V6M9 6V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V6M10 11v5M14 11v5" />,
);
export const AlertIcon = icon(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7.5v5M12 16.2v.3" />
  </>,
);
export const RefreshIcon = icon(
  <>
    <path d="M20.5 12a8.5 8.5 0 1 1-2.8-6.3L20.5 8" />
    <path d="M20.5 3.5V8H16" />
  </>,
);
export const LockIcon = icon(
  <>
    <rect x="4" y="10.5" width="16" height="10.5" rx="2.5" />
    <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" />
  </>,
);
export const SparkleIcon = icon(
  <path d="M12 3.5 13.9 9l5.6 2-5.6 2L12 18.5 10.1 13l-5.6-2 5.6-2Z" />,
);
export const HandshakeIcon = icon(
  <>
    <path d="m11 17 2 2a1.4 1.4 0 0 0 2-2" />
    <path d="m14 14 2.5 2.5a1.4 1.4 0 0 0 2-2l-3.9-3.9a2.8 2.8 0 0 0-4 0l-.9.9a1.4 1.4 0 0 1-2-2l2.8-2.8a4.9 4.9 0 0 1 5.9-.8l.5.3a3 3 0 0 0 2.1.3L21 6" />
    <path d="m21 3 1 11h-2M3 3 2 14l6.5 6.5a1.4 1.4 0 0 0 2-2M3 4h8" />
  </>,
);

export const SunIcon = icon(
  <>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" />
  </>,
);
export const MoonIcon = icon(
  <path d="M20.5 14.1A8.5 8.5 0 1 1 9.9 3.5a6.6 6.6 0 0 0 10.6 10.6Z" />,
);
export const MonitorIcon = icon(
  <>
    <rect x="2.5" y="3.5" width="19" height="13" rx="2" />
    <path d="M8 21h8M12 16.5V21" />
  </>,
);

/* Category icons */
const ZapIcon = icon(<path d="M13 2.5 4 14h7.5l-1 7.5L20 10h-7.5Z" />);
const WrenchIcon = icon(
  <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9Z" />,
);
const LeafIcon = icon(
  <>
    <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10Z" />
    <path d="M2 21c0-3 1.9-5.4 5.1-6C9.5 14.5 12 13 13 12" />
  </>,
);
const UtensilsIcon = icon(
  <>
    <path d="M3 2v7a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V2M7 2v20" />
    <path d="M21 15V2a5 5 0 0 0-5 5v6a2 2 0 0 0 2 2h3Zm0 0v7" />
  </>,
);
const TentIcon = icon(
  <path d="M3.5 21 14 3M20.5 21 10 3M15.5 21 12 15l-3.5 6M2 21h20" />,
);
const SprayIcon = icon(
  <>
    <path d="M9.5 3h-2a1 1 0 0 0-1 1v3h4V4a1 1 0 0 0-1-1ZM6.5 7h4l1.5 3v10a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V10Z" />
    <path d="M14 5h.01M17 3h.01M17 7h.01M20 5h.01M20 9h.01" />
  </>,
);

export const CATEGORY_ICONS: Record<ToolCategory, ReturnType<typeof icon>> = {
  power_tools: ZapIcon,
  hand_tools: WrenchIcon,
  garden: LeafIcon,
  kitchen: UtensilsIcon,
  camping: TentIcon,
  cleaning: SprayIcon,
  other: BoxIcon,
};

/** Tile + text tints per category, used on tool and loan cards. */
export const CATEGORY_TINTS: Record<ToolCategory, string> = {
  power_tools: "bg-amber-50 text-amber-600 ring-amber-200/70",
  hand_tools: "bg-sky-50 text-sky-600 ring-sky-200/70",
  garden: "bg-emerald-50 text-emerald-600 ring-emerald-200/70",
  kitchen: "bg-rose-50 text-rose-600 ring-rose-200/70",
  camping: "bg-orange-50 text-orange-600 ring-orange-200/70",
  cleaning: "bg-cyan-50 text-cyan-600 ring-cyan-200/70",
  other: "bg-violet-50 text-violet-600 ring-violet-200/70",
};

export function CategoryTile({
  category,
  size = "md",
}: {
  category: ToolCategory;
  size?: "sm" | "md" | "lg";
}) {
  const Icon = CATEGORY_ICONS[category];
  const box = {
    sm: "size-8 rounded-lg",
    md: "size-10 rounded-xl",
    lg: "size-12 rounded-xl",
  }[size];
  const glyph = { sm: "size-4", md: "size-5", lg: "size-6" }[size];
  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center ring-1 ring-inset ${box} ${CATEGORY_TINTS[category]}`}
    >
      <Icon className={glyph} />
    </span>
  );
}

const AVATAR_TINTS = [
  "bg-brand-100 text-brand-800",
  "bg-sky-100 text-sky-800",
  "bg-amber-100 text-amber-800",
  "bg-rose-100 text-rose-800",
  "bg-violet-100 text-violet-800",
  "bg-teal-100 text-teal-800",
];

/** Initials avatar with a stable color per name. */
export function Avatar({
  name,
  size = "sm",
}: {
  name: string;
  size?: "xs" | "sm" | "md";
}) {
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]!.toUpperCase())
      .join("") || "?";
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  const dims = {
    xs: "size-5 text-[9px]",
    sm: "size-6 text-[10px]",
    md: "size-8 text-xs",
  }[size];
  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold ${dims} ${AVATAR_TINTS[hash % AVATAR_TINTS.length]}`}
    >
      {initials}
    </span>
  );
}

/** Brand mark: two links of a loop. */
export function Logo({ className = "size-8" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-[10px] bg-gradient-to-br from-[oklch(0.64_0.15_163)] to-[oklch(0.39_0.09_163)] text-[#fff] shadow-[inset_0_1px_0_rgb(255_255_255/0.25),0_2px_6px_-1px_rgb(4_120_87/0.4)] ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.25}
        strokeLinecap="round"
        aria-hidden
        className="size-[60%]"
      >
        <path d="M9.5 15.5a4.5 4.5 0 1 1 0-7h1" />
        <path d="M14.5 8.5a4.5 4.5 0 1 1 0 7h-1" />
      </svg>
    </span>
  );
}
