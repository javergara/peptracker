import Link from "next/link";
import type { Metadata } from "next";

import { AuthForm } from "@/components/auth/auth-form";
import { PeptraLogo } from "@/components/brand/peptra-logo";
import { Disclaimer } from "@/components/disclaimer";
import { loginAction } from "@/lib/actions/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <main className="bg-background flex min-h-dvh items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex justify-center">
          <PeptraLogo markClassName="size-9" wordClassName="text-2xl" />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Welcome back</CardTitle>
            <CardDescription>Log in to your account.</CardDescription>
          </CardHeader>
          <CardContent>
            <AuthForm mode="login" action={loginAction} />
            <p className="text-muted-foreground mt-4 text-center text-sm">
              No account?{" "}
              <Link href="/signup" className="text-primary font-medium">
                Sign up
              </Link>
            </p>
          </CardContent>
        </Card>
        <Disclaimer />
      </div>
    </main>
  );
}
