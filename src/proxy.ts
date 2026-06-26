import NextAuth from "next-auth";

import { authConfig } from "@/auth.config";

// Next 16 renamed the `middleware` convention to `proxy` (Node.js runtime by
// default). We run the edge-safe Auth.js config (no Credentials provider) purely
// to gate routes via the `authorized` callback, which verifies the JWT session
// cookie and redirects signed-out users to /login.
export const { auth: proxy } = NextAuth(authConfig);

export default proxy;

export const config = {
  // Protect everything except Next internals, the auth API, the cron API (which
  // self-protects with a Bearer secret), and static files.
  matcher: [
    "/((?!api/auth|api/cron|_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
