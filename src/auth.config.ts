import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe Auth.js config (no Prisma / bcrypt imports), shared by the full
 * server config in `src/auth.ts` and the middleware in `src/middleware.ts`.
 * The `authorized` callback drives route protection when `auth` runs as
 * middleware: signed-out users are bounced to /login; signed-in users on an
 * auth page are bounced to the dashboard.
 */
const AUTH_PAGES = new Set(["/login", "/signup"]);

export const authConfig = {
  pages: { signIn: "/login" },
  // Providers are added in src/auth.ts (Credentials needs Node-only deps).
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isAuthPage = AUTH_PAGES.has(nextUrl.pathname);
      if (isAuthPage) {
        if (isLoggedIn) return Response.redirect(new URL("/", nextUrl));
        return true;
      }
      return isLoggedIn;
    },
  },
} satisfies NextAuthConfig;
