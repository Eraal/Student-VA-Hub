"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { loginSchema } from "@/lib/validations/auth";
import { loginAction } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { AlertCircle, CheckCircle2, Loader2, LogIn, KeyRound } from "lucide-react";

export function LoginForm() {
  const searchParams = useSearchParams();
  const registeredParam = searchParams.get("registered");
  const emailParam = searchParams.get("email");
  const errorParam = searchParams.get("error");

  const [email, setEmail] = React.useState(emailParam ?? "");
  const [password, setPassword] = React.useState("");

  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [serverError, setServerError] = React.useState<string | null>(
    errorParam === "CredentialsSignin"
      ? "Invalid email or password. Please try again."
      : null,
  );
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setServerError(null);
    setFieldErrors({});

    const formData = {
      email,
      password,
    };

    // Client-side Zod validation
    const clientValidation = loginSchema.safeParse(formData);
    if (!clientValidation.success) {
      const errors: Record<string, string> = {};
      for (const issue of clientValidation.error.issues) {
        const field = issue.path[0];
        if (field && typeof field === "string" && !errors[field]) {
          errors[field] = issue.message;
        }
      }
      setFieldErrors(errors);
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await loginAction(formData);

      if (!res.success) {
        if (res.fieldErrors) {
          setFieldErrors(res.fieldErrors);
        }
        setServerError(res.error ?? "Invalid email or password. Please try again.");
        setIsSubmitting(false);
        return;
      }

      // If redirect did not trigger automatically inside action, manual fallback:
      if (res.data?.redirectUrl) {
        window.location.href = res.data.redirectUrl;
      }
    } catch (err: unknown) {
      // Check if it's a Next.js redirect (which throws NEXT_REDIRECT)
      if (err && typeof err === "object" && "digest" in err) {
        // Normal Next.js redirect thrown by server action
        return;
      }
      console.error(err);
      setServerError("An error occurred while signing in. Please check your credentials.");
      setIsSubmitting(false);
    }
  };

  const handleFillDemo = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword("demo1234");
    setServerError(null);
    setFieldErrors({});
  };

  return (
    <Card className="w-full max-w-md border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
      <CardHeader className="space-y-1 pb-4">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-md bg-[var(--color-accent)] text-[var(--color-accent-fg)]">
            <LogIn className="size-4" />
          </span>
          <div>
            <CardTitle className="text-xl font-semibold tracking-tight text-[var(--color-text)]">
              Sign in to Student VA-Hub
            </CardTitle>
            <CardDescription className="text-xs text-[var(--color-muted)]">
              Enter your email and password to access your portal
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {/* Registration Success Banner */}
          {registeredParam && (
            <div
              role="status"
              className="flex items-start gap-2.5 rounded-md border border-[var(--color-work)] bg-[var(--color-work-bg)] p-3 text-xs text-[var(--color-work)]"
            >
              <CheckCircle2 className="size-4 shrink-0 mt-0.5" />
              <span>
                Account created successfully. Please enter your password to sign in.
              </span>
            </div>
          )}

          {/* Server Error Alert */}
          {serverError && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-md border border-[var(--color-conflict)] bg-[var(--color-conflict-bg)] p-3 text-xs text-[var(--color-conflict)]"
            >
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <span>{serverError}</span>
            </div>
          )}

          {/* Email field */}
          <div className="space-y-1.5">
            <Label htmlFor="login-email" className="text-xs font-medium text-[var(--color-text)]">
              Email Address
            </Label>
            <Input
              id="login-email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
              className="bg-[var(--color-bg)] text-xs"
              autoComplete="email"
            />
            {fieldErrors.email && (
              <p className="text-[11px] text-[var(--color-conflict)]">{fieldErrors.email}</p>
            )}
          </div>

          {/* Password field */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label
                htmlFor="login-password"
                className="text-xs font-medium text-[var(--color-text)]"
              >
                Password
              </Label>
            </div>
            <Input
              id="login-password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSubmitting}
              className="bg-[var(--color-bg)] text-xs"
              autoComplete="current-password"
            />
            {fieldErrors.password && (
              <p className="text-[11px] text-[var(--color-conflict)]">{fieldErrors.password}</p>
            )}
          </div>

          {/* Quick Demo Accounts Helper */}
          <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] p-3 space-y-2">
            <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-[var(--color-muted)]">
              <KeyRound className="size-3.5" />
              <span>Dev Demo Credentials</span>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleFillDemo("juan@example.com")}
                className="rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-[11px] font-medium text-[var(--color-text)] hover:border-[var(--color-accent)] transition-colors cursor-pointer"
              >
                Student: juan@example.com
              </button>
              <button
                type="button"
                onClick={() => handleFillDemo("maria@example.com")}
                className="rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-[11px] font-medium text-[var(--color-text)] hover:border-[var(--color-accent)] transition-colors cursor-pointer"
              >
                Client: maria@example.com
              </button>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3 pt-2">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[var(--color-accent)] text-[var(--color-accent-fg)] hover:bg-[var(--color-accent-hover)] cursor-pointer text-xs font-medium h-9"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="size-3.5 animate-spin" />
                <span>Signing in...</span>
              </span>
            ) : (
              <span>Sign in</span>
            )}
          </Button>

          <p className="text-center text-xs text-[var(--color-muted)]">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="font-medium text-[var(--color-accent)] underline-offset-4 hover:underline"
            >
              Create an account
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}

