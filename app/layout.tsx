import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ConvexClientProvider } from "@/components/providers/ConvexClientProvider";
import { CurrentUserProvider } from "@/components/providers/CurrentUserProvider";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { themeInitScript } from "@/lib/theme";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "LendLoop",
  description: "Borrow what you need. Lend what you don't.",
};

// Clerk's UI follows the app theme through CSS variables (globals.css).
const clerkAppearance = {
  variables: {
    colorPrimary: "#047857",
    colorBackground: "var(--clerk-bg)",
    colorForeground: "var(--clerk-fg)",
    colorMutedForeground: "var(--clerk-muted)",
    colorNeutral: "var(--clerk-neutral)",
    colorInput: "var(--clerk-input)",
    colorInputForeground: "var(--clerk-fg)",
    borderRadius: "0.625rem",
    fontFamily: "var(--font-geist-sans)",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      // The theme script adds the "dark" class before React hydrates.
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="flex min-h-full flex-col">
        <ClerkProvider appearance={clerkAppearance}>
          <ConvexClientProvider>
            <CurrentUserProvider>
              <SiteHeader />
              <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
                {children}
              </main>
              <SiteFooter />
            </CurrentUserProvider>
          </ConvexClientProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
