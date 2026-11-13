// Theme choice lives in localStorage; "system" (the default) follows the OS.

export type ThemePreference = "light" | "dark" | "system";

const STORAGE_KEY = "lendloop-theme";
const DARK_QUERY = "(prefers-color-scheme: dark)";

/** Runs before first paint, so there's no flash of the wrong theme. */
export const themeInitScript = `(function(){try{var p=localStorage.getItem("${STORAGE_KEY}");var d=p==="dark"||(p!=="light"&&matchMedia("${DARK_QUERY}").matches);var r=document.documentElement;r.classList.toggle("dark",d);r.style.colorScheme=d?"dark":"light"}catch(e){}})()`;

export function readThemePreference(): ThemePreference {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === "light" || value === "dark" ? value : "system";
  } catch {
    return "system";
  }
}

export function applyTheme(preference: ThemePreference) {
  const dark =
    preference === "dark" ||
    (preference === "system" && window.matchMedia(DARK_QUERY).matches);
  const root = document.documentElement;
  root.classList.toggle("dark", dark);
  root.style.colorScheme = dark ? "dark" : "light";
}

const listeners = new Set<() => void>();

export function setThemePreference(preference: ThemePreference) {
  try {
    if (preference === "system") localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, preference);
  } catch {
    // Storage blocked: the theme still applies for this page view.
  }
  applyTheme(preference);
  listeners.forEach((notify) => notify());
}

export function subscribeToTheme(notify: () => void) {
  listeners.add(notify);
  const media = window.matchMedia(DARK_QUERY);
  const onSystemChange = () => {
    if (readThemePreference() === "system") applyTheme("system");
    notify();
  };
  const onStorage = (e: StorageEvent) => {
    if (e.key !== STORAGE_KEY) return;
    applyTheme(readThemePreference());
    notify();
  };
  media.addEventListener("change", onSystemChange);
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(notify);
    media.removeEventListener("change", onSystemChange);
    window.removeEventListener("storage", onStorage);
  };
}
