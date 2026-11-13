"use client";

import * as React from "react";
import Link from "next/link";
import { Mail, CheckCircle2, Loader2, ArrowLeft } from "lucide-react";
import { displayFontClass } from "@/components/landing/fonts";
import { AuthLayout } from "@/components/auth/auth-layout";

export default function ForgotPasswordPage() {
  const [email, setEmail] = React.useState("");
  const [isSubmitted, setIsSubmitted] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid email address.");
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
    <AuthLayout mode="forgot-password">
      <div className="w-full space-y-6">
        <div>
          <h1 className={`${displayFontClass} text-xl font-semibold tracking-tight text-[#0F172A]`}>
            {isSubmitted ? "Check your email" : "Reset your password"}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {isSubmitted
              ? `We have sent password reset instructions to ${email}.`
              : "Enter your email address and we'll send you reset instructions."}
          </p>
        </div>

        {isSubmitted ? (
          <div className="space-y-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F0FDF4] text-[#16A34A]">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              If an account exists for that email, a reset link will be sent when email sending is enabled.
            </p>
            <Link
              href="/login"
              className="w-full h-9 rounded-md border border-[#E5DFD5] bg-white hover:bg-[#FAF7F2] text-[#0F172A] text-xs font-medium shadow-2xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5 text-slate-500" />
              <span>Back to log in</span>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {error && (
              <div
                role="alert"
                className="flex items-center gap-2 rounded-md border border-[#DC2626]/30 bg-[#FEF2F2] p-2.5 text-xs text-[#991B1B] font-medium"
              >
                <span>{error}</span>
              </div>
            )}

            <div>
              <label
                htmlFor="email"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Email address
              </label>
              <div className="relative">
                <input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError(null);
                  }}
                  required
                  className="h-9 w-full rounded-md border border-[#E5DFD5] bg-white pl-9 pr-3 py-1.5 text-sm text-[#0F172A] shadow-2xs transition-colors placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#0F172A] focus-visible:border-[#0F172A] disabled:opacity-50"
                />
                <Mail className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-9 rounded-md bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-medium shadow-2xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
                  <span>Sending instructions...</span>
                </>
              ) : (
                <span>Send reset link</span>
              )}
            </button>

            <p className="text-center text-xs text-slate-500 pt-1">
              Remember your password?{" "}
              <Link
                href="/login"
                className="font-medium text-[#0F172A] underline underline-offset-4 hover:text-slate-700 transition-colors"
              >
                Log in
              </Link>
            </p>
          </form>
        )}
      </div>
    </AuthLayout>
  );
}
