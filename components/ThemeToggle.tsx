"use client";

import { useSyncExternalStore } from "react";
import { MonitorIcon, MoonIcon, SunIcon } from "@/components/ui/icons";
import {
  readThemePreference,
  setThemePreference,
  subscribeToTheme,
  type ThemePreference,
} from "@/lib/theme";

const OPTIONS: { value: ThemePreference; label: string; Icon: typeof SunIcon }[] = [
  { value: "light", label: "Light", Icon: SunIcon },
  { value: "dark", label: "Dark", Icon: MoonIcon },
  { value: "system", label: "System", Icon: MonitorIcon },
];

export function ThemeToggle() {
  // null during SSR and hydration, so nothing is highlighted until the choice is known.
  const current = useSyncExternalStore(subscribeToTheme, readThemePreference, () => null);

  return (
    <div
      role="radiogroup"
      aria-label="Color theme"
      className="flex items-center gap-0.5 rounded-full border border-zinc-200 bg-zinc-50 p-0.5"
    >
      {OPTIONS.map(({ value, label, Icon }) => {
        const selected = current === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={label}
            title={label}
            onClick={() => setThemePreference(value)}
            className={`flex size-7 items-center justify-center rounded-full transition-all ${
              selected
                ? "shadow-card bg-white text-zinc-900 ring-1 ring-zinc-200"
                : "text-zinc-400 hover:text-zinc-700"
            }`}
          >
            <Icon className="size-3.5" />
          </button>
        );
      })}
    </div>
  );
}
