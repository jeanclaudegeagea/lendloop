"use client";

import { SignInButton, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCurrentUser } from "@/components/providers/CurrentUserProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  BoxIcon,
  GridIcon,
  InboxIcon,
  Logo,
  SendIcon,
  ShieldIcon,
} from "@/components/ui/icons";

const NAV_LINKS = [
  { href: "/tools", label: "Browse", Icon: GridIcon },
  { href: "/listings", label: "My listings", Icon: BoxIcon },
  { href: "/requests", label: "My requests", Icon: SendIcon },
  { href: "/incoming", label: "Incoming", Icon: InboxIcon },
] as const;

const ADMIN_LINK = { href: "/admin", label: "Admin", Icon: ShieldIcon } as const;

export function SiteHeader() {
  const pathname = usePathname();
  const { isLoading, isAuthenticated, user } = useCurrentUser();

  const links = user?.role === "admin" ? [...NAV_LINKS, ADMIN_LINK] : NAV_LINKS;

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200/70 bg-white/80 backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <Logo />
          <span className="text-[17px] font-semibold tracking-tight">LendLoop</span>
        </Link>

        {user && (
          <nav aria-label="Main" className="hidden md:block">
            <ul className="flex items-center gap-0.5">
              {links.map((link) => (
                <li key={link.href}>
                  <NavLink {...link} active={pathname.startsWith(link.href)} />
                </li>
              ))}
            </ul>
          </nav>
        )}

        <div className="ml-auto flex items-center gap-3">
          <ThemeToggle />
          {isLoading ? (
            <div className="size-8 animate-pulse rounded-full bg-zinc-200" aria-hidden />
          ) : isAuthenticated ? (
            <UserButton appearance={{ elements: { avatarBox: "size-8" } }} />
          ) : (
            <SignInButton mode="modal">
              <button type="button" className="btn-primary">
                Sign in
              </button>
            </SignInButton>
          )}
        </div>
      </div>

      {/* Mobile: a scrollable tab bar under the header. */}
      {user && (
        <nav aria-label="Main (mobile)" className="border-t border-zinc-100 md:hidden">
          <ul className="flex [scrollbar-width:none] gap-1 overflow-x-auto px-3 py-2">
            {links.map((link) => (
              <li key={link.href} className="shrink-0">
                <NavLink {...link} active={pathname.startsWith(link.href)} />
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}

function NavLink({
  href,
  label,
  Icon,
  active,
}: {
  href: string;
  label: string;
  Icon: (typeof NAV_LINKS)[number]["Icon"];
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
        active
          ? "bg-zinc-900/[0.06] text-zinc-900"
          : "text-zinc-500 hover:bg-zinc-900/[0.04] hover:text-zinc-900"
      }`}
    >
      <Icon className={`size-4 ${active ? "text-brand-700" : ""}`} />
      {label}
    </Link>
  );
}
