"use server";

import { AuthError } from "next-auth";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { signIn, signOut } from "@/auth";
import { requireAccountId } from "@/lib/active-user";

const PROFILE_COLOR = "#7C3AED";

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

/**
 * Change the signed-in account's password. Requires the current password
 * (defense-in-depth against a hijacked session) and an 8+ char new one. Throws
 * on failure so the ActionForm surfaces the message as a toast.
 */
export async function changePasswordAction(formData: FormData) {
  const accountId = await requireAccountId();
  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (newPassword.length < 8) {
    throw new Error("New password must be at least 8 characters.");
  }
  if (newPassword !== confirmPassword) {
    throw new Error("New password and confirmation don't match.");
  }

  const account = await prisma.account.findUnique({
    where: { id: accountId },
    select: { passwordHash: true },
  });
  if (!account) throw new Error("Account not found.");

  const ok = await bcrypt.compare(currentPassword, account.passwordHash);
  if (!ok) throw new Error("Current password is incorrect.");

  if (await bcrypt.compare(newPassword, account.passwordHash)) {
    throw new Error("New password must be different from the current one.");
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.account.update({
    where: { id: accountId },
    data: { passwordHash },
  });
}
