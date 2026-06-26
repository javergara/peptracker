import type { Metadata, Viewport } from "next";
import { Space_Grotesk, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";

import { auth } from "@/auth";
import { AppShell } from "@/components/app-shell";
import { AccountMenu } from "@/components/auth/account-menu";
import { ProfileSwitcher } from "@/components/profiles/profile-switcher";
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";

import "./globals.css";

// Display (headings, wordmark): geometric. Body: humanist sans. Mono: numbers.
const fontDisplay = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const fontSans = IBM_Plex_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const fontMono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

// Absolute base for icons/manifest/OG URLs. Prefer the configured auth URL, fall
// back to the Vercel-provided deployment URL, then localhost in dev.
const siteUrl =
  process.env.AUTH_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined) ??
  "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: "Peptra",
  title: {
    default: "Peptra",
    template: "%s · Peptra",
  },
  description:
    "Precision for every protocol — track peptides, cycles, dosing, and outcomes with a cited knowledge base, stacks, and rule-based suggestions. Educational use only.",
  manifest: "/manifest.webmanifest",
  // iOS standalone "Add to Home Screen" behavior (Safari ignores most of the
  // web manifest and reads these instead).
  appleWebApp: {
    capable: true,
    title: "Peptra",
    statusBarStyle: "default",
  },
  // Next emits the modern `mobile-web-app-capable`; add the legacy Apple tag too
  // so older iOS also launches the home-screen app in standalone (no Safari UI).
  other: { "apple-mobile-web-app-capable": "yes" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#16102E" },
    { media: "(prefers-color-scheme: light)", color: "#7C3AED" },
  ],
  width: "device-width",
  initialScale: 1,
  // Let content extend under the notch/home indicator so safe-area insets work.
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Auth pages (login/signup) render bare; the app chrome only appears once the
  // user is signed in. Middleware guarantees unauthenticated users only ever see
  // those auth pages, so this also keeps the sidebar off them.
  const session = await auth();

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${fontDisplay.variable} ${fontSans.variable} ${fontMono.variable} h-full antialiased`}
    >
      <body className="bg-background text-foreground min-h-full">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {session?.user ? (
            <AppShell
              profileSlot={
                <div className="space-y-2">
                  <ProfileSwitcher />
                  <AccountMenu email={session.user.email ?? ""} />
                </div>
              }
            >
              {children}
            </AppShell>
          ) : (
            children
          )}
          <Toaster richColors position="top-right" />
          <ServiceWorkerRegister />
        </ThemeProvider>
      </body>
    </html>
  );
}
