import Link from "next/link";
import { Logo } from "@/components/ui/icons";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-zinc-200/80 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <Logo className="size-6" />
          <span className="text-sm font-semibold tracking-tight">LendLoop</span>
        </Link>
        <p className="text-sm text-zinc-500">
          A neighborhood tool-lending board. Borrow what you need, lend what you
          don&apos;t.
        </p>
      </div>
    </footer>
  );
}
