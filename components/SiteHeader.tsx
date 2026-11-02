"use client";

import { SignInButton, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCurrentUser } from "@/components/providers/CurrentUserProvider";

const NAV_LINKS = [
  { href: "/tools", label: "Browse tools" },
  { href: "/listings", label: "My listings" },
  { href: "/requests", label: "My requests" },
  { href: "/incoming", label: "Incoming" },
] as const;

export function SiteHeader() {
  const pathname = usePathname();
  const { isLoading, isAuthenticated, user } = useCurrentUser();

  const links =
    user?.role === "admin"
      ? [...NAV_LINKS, { href: "/admin", label: "Admin" }]
      : NAV_LINKS;

  return (
    <header className="border-b border-stone-200 bg-white">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3">
        <Link href="/" className="text-lg font-semibold tracking-tight text-emerald-700">
          LendLoop
        </Link>

        {user && (
          <nav aria-label="Main" className="order-3 w-full sm:order-none sm:w-auto">
            <ul className="flex flex-wrap gap-1">
              {links.map((link) => {
                const active = pathname.startsWith(link.href);
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      aria-current={active ? "page" : undefined}
                      className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                        active
                          ? "bg-emerald-50 font-medium text-emerald-800"
                          : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
                      }`}
                    >
                      {link.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        )}

        <div className="ml-auto flex items-center">
          {isLoading ? (
            <div
              className="h-8 w-8 animate-pulse rounded-full bg-stone-200"
              aria-hidden
            />
          ) : isAuthenticated ? (
            <UserButton />
          ) : (
            <SignInButton mode="modal">
              <button type="button" className="btn-primary">
                Sign in to lend or borrow
              </button>
            </SignInButton>
          )}
        </div>
      </div>
    </header>
  );
}
