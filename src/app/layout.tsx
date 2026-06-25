import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { auth } from "@/auth";
import { AppShell } from "@/components/app-shell";
import { AccountMenu } from "@/components/auth/account-menu";
import { ProfileSwitcher } from "@/components/profiles/profile-switcher";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Peptides Tracker",
    template: "%s · Peptides Tracker",
  },
  description:
    "Track peptide protocols, cycles, dosing, and outcomes — with a cited knowledge base, stacks, and rule-based suggestions. Educational use only.",
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
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
