import type { Metadata } from "next";
import { Space_Grotesk, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";

import { auth } from "@/auth";
import { AppShell } from "@/components/app-shell";
import { AccountMenu } from "@/components/auth/account-menu";
import { ProfileSwitcher } from "@/components/profiles/profile-switcher";
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

export const metadata: Metadata = {
  title: {
    default: "Peptra",
    template: "%s · Peptra",
  },
  description:
    "Precision for every protocol — track peptides, cycles, dosing, and outcomes with a cited knowledge base, stacks, and rule-based suggestions. Educational use only.",
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
        </ThemeProvider>
      </body>
    </html>
  );
}
