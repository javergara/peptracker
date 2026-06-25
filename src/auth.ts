import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { authConfig } from "@/auth.config";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const email = parsed.data.email.toLowerCase();

        const account = await prisma.account.findUnique({ where: { email } });
        if (!account) return null;

        const ok = await bcrypt.compare(
          parsed.data.password,
          account.passwordHash,
        );
        if (!ok) return null;

        return {
          id: account.id,
          email: account.email,
          name: account.name ?? undefined,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    jwt({ token, user }) {
      // On sign-in the authorized account is the JWT subject; carry its id.
      if (user?.id) token.accountId = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.accountId) session.user.accountId = token.accountId as string;
      return session;
    },
  },
});
