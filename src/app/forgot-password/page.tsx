"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GraduationCap, ArrowLeft, Mail, CheckCircle2, Loader2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = React.useState("");
  const [isSubmitted, setIsSubmitted] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      setError("Mangyaring maglagay ng wastong email address.");
      return;
    }

    setIsLoading(true);
    setError(null);

    // Simulate password reset email dispatch (in MVP, confirm message shown)
    setTimeout(() => {
      setIsLoading(false);
      setIsSubmitted(true);
    }, 600);
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex size-10 items-center justify-center rounded-md bg-[var(--color-accent)] text-[var(--color-accent-fg)] shadow-xs">
            <GraduationCap className="size-5" />
          </div>
          <h1 className="text-lg font-bold tracking-tight text-[var(--color-text)]">
            Student VA-Hub
          </h1>
        </div>

        <Card className="border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs">
          <CardHeader className="pb-3 text-center">
            <CardTitle className="text-base font-semibold text-[var(--color-text)]">
              {isSubmitted ? "Tingnan ang iyong Email" : "Nakalimutan ang Password?"}
            </CardTitle>
            <CardDescription className="text-xs text-[var(--color-muted)]">
              {isSubmitted
                ? `Nagpadala kami ng password reset link sa ${email}.`
                : "Ilagay ang iyong email address upang makatanggap ng instructions para i-reset ang iyong password."}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 pt-1">
            {isSubmitted ? (
              <div className="space-y-4 text-center">
                <div className="flex size-12 mx-auto items-center justify-center rounded-full bg-[var(--color-work-bg)] text-[var(--color-work)]">
                  <CheckCircle2 className="size-6" />
                </div>
                <p className="text-xs text-[var(--color-muted)]">
                  Kung may account na nakarehistro gamit ang email na ito, makakatanggap ka ng email sa loob ng ilang minuto.
                </p>
                <Link href="/login" className="block w-full">
                  <Button variant="outline" size="sm" className="w-full text-xs cursor-pointer">
                    Bumalik sa Login
                  </Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="p-2.5 rounded-md border border-[var(--color-conflict)]/40 bg-[var(--color-conflict-bg)] text-xs text-[var(--color-conflict)]">
                    {error}
                  </div>
                )}

                <div className="space-y-1.5 text-left">
                  <Label htmlFor="email" className="text-xs font-medium text-[var(--color-text)]">
                    Email address
                  </Label>
                  <div className="relative">
                    <Input
                      id="email"
                      type="email"
                      placeholder="pangalan@halimbawa.com"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setError(null);
                      }}
                      className="pl-8 text-xs h-9 bg-[var(--color-bg)]"
                      required
                    />
                    <Mail className="size-3.5 absolute left-2.5 top-3 text-[var(--color-muted)]" />
                  </div>
                </div>

                <Button
                  type="submit"
                  size="sm"
                  disabled={isLoading}
                  className="w-full text-xs h-9 cursor-pointer bg-[var(--color-accent)] text-[var(--color-accent-fg)] hover:opacity-90"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="size-3.5 animate-spin" />
                      <span>Nagpapadala...</span>
                    </span>
                  ) : (
                    "Ipadala ang Reset Link"
                  )}
                </Button>

                <div className="text-center pt-1">
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-1 text-xs text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors"
                  >
                    <ArrowLeft className="size-3" />
                    <span>Bumalik sa Login</span>
                  </Link>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

