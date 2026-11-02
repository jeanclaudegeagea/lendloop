import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { ConvexClientProvider } from "@/components/providers/ConvexClientProvider";
import { CurrentUserProvider } from "@/components/providers/CurrentUserProvider";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "LendLoop",
  description: "Borrow what you need. Lend what you don't.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <ClerkProvider>
          <ConvexClientProvider>
            <CurrentUserProvider>
              <SiteHeader />
              <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
                {children}
              </main>
              <footer className="border-t border-stone-200 py-6 text-center text-xs text-stone-500">
                LendLoop: a neighborhood tool-lending board
              </footer>
            </CurrentUserProvider>
          </ConvexClientProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
