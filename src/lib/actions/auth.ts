"use server";

import { AuthError } from "next-auth";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { signIn, signOut } from "@/auth";

const PROFILE_COLOR = "#6366f1";

const signupSchema = z.object({
  name: z.string().trim().max(60).optional(),
  email: z.string().email("Enter a valid email."),
  password: z.string().min(8, "Use at least 8 characters."),
});

/**
 * useActionState-compatible. Returns an error string to display, or throws the
 * Next redirect on success (signIn with redirectTo).
 */
export async function loginAction(
  _prev: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const email = String(formData.get("email") ?? "").toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return "Enter your email and password.";

  try {
    await signIn("credentials", { email, password, redirectTo: "/" });
  } catch (err) {
    if (err instanceof AuthError) return "Invalid email or password.";
    throw err; // re-throw the redirect (and anything unexpected)
  }
  return undefined;
}

export async function signupAction(
  _prev: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const parsed = signupSchema.safeParse({
    name: String(formData.get("name") ?? "").trim() || undefined,
    email: String(formData.get("email") ?? "").toLowerCase(),
    password: String(formData.get("password") ?? ""),
  });
  if (!parsed.success) {
    return (
      parsed.error.issues[0]?.message ?? "Check your details and try again."
    );
  }
  const { name, email, password } = parsed.data;

  const existing = await prisma.account.findUnique({ where: { email } });
  if (existing) return "An account with that email already exists.";

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.account.create({
    data: {
      email,
      name: name ?? null,
      passwordHash,
      // Start every account with one default profile.
      profiles: { create: { name: name || "Me", color: PROFILE_COLOR } },
    },
  });

  try {
    await signIn("credentials", { email, password, redirectTo: "/" });
  } catch (err) {
    if (err instanceof AuthError) return "Account created — please log in.";
    throw err;
  }
  return undefined;
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}
