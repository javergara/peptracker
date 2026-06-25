import Link from "next/link";
import type { Metadata } from "next";

import { AuthForm } from "@/components/auth/auth-form";
import { PeptraLogo } from "@/components/brand/peptra-logo";
import { Disclaimer } from "@/components/disclaimer";
import { signupAction } from "@/lib/actions/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = { title: "Sign up" };

export default function SignupPage() {
  return (
    <main className="bg-background flex min-h-dvh items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex justify-center">
          <PeptraLogo markClassName="size-9" wordClassName="text-2xl" />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Create your account</CardTitle>
            <CardDescription>
              You can add more profiles (e.g. a partner) after signing in.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AuthForm mode="signup" action={signupAction} />
            <p className="text-muted-foreground mt-4 text-center text-sm">
              Already have an account?{" "}
              <Link href="/login" className="text-primary font-medium">
                Log in
              </Link>
            </p>
          </CardContent>
        </Card>
        <Disclaimer />
      </div>
    </main>
  );
}
