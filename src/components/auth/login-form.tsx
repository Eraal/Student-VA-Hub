"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Role } from "@prisma/client";
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { displayFontClass } from "@/components/landing/fonts";
import { loginSchema } from "@/lib/validations/auth";
import { loginAction } from "@/lib/actions/auth";
import { toUserErrorMessage } from "@/lib/errors";

/**
 * Validates and sanitizes a callbackUrl to protect against open redirects.
 * Only relative paths starting with a single '/' are accepted.
 * Rejects absolute URLs, protocol-relative ('//'), backslash traversal ('/\'), and scheme prefixes.
 */
export function getSafeCallbackUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.startsWith("/\\")) {
    return null;
  }
  if (trimmed.includes("://")) {
    return null;
  }
  return trimmed;
}

// Dev-only demo credentials helper. Completely pruned in production bundles.
const DevDemoCredentials =
  process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_SHOW_DEMO_LOGINS === "true"
    ? dynamic(
        () => import("./dev-demo-credentials").then((mod) => mod.DevDemoCredentials),
        { ssr: false }
      )
    : null;

export function LoginForm() {
  const searchParams = useSearchParams();
  const registeredParam = searchParams.get("registered");
  const emailParam = searchParams.get("email");
  const errorParam = searchParams.get("error");
  const rawCallbackUrl = searchParams.get("callbackUrl");

  const [email, setEmail] = React.useState(emailParam ?? "");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);

  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [formError, setFormError] = React.useState<string | null>(
    errorParam === "CredentialsSignin" ? "Email or password is incorrect." : null
  );
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const emailInputRef = React.useRef<HTMLInputElement | null>(null);

  // Auto-focus email field only on desktop
  React.useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches) {
      if (!emailParam) {
        emailInputRef.current?.focus();
      }
    }
  }, [emailParam]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
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
        // Unified error message for wrong email vs wrong password
        if (
          res.error === "Invalid email or password. Please try again." ||
          res.error === "Please provide a valid email and password."
        ) {
          setFormError("Email or password is incorrect.");
        } else {
          setFormError(res.error ? toUserErrorMessage(res.error) : "Email or password is incorrect.");
        }
        setIsSubmitting(false);
        return;
      }

      // Safe redirect determination
      const safeCallback = getSafeCallbackUrl(rawCallbackUrl);
      const defaultDashboard = res.data?.role === Role.STUDENT ? "/student" : "/client";
      const destination = safeCallback || res.data?.redirectUrl || defaultDashboard;

      window.location.href = destination;
    } catch (err: unknown) {
      // Normal Next.js redirect thrown by server action
      if (err && typeof err === "object" && "digest" in err) {
        return;
      }
      setFormError(toUserErrorMessage(err));
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div>
        <h1 className={`${displayFontClass} text-xl font-semibold tracking-tight text-[#0F172A]`}>
          Log in to your account
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Enter your email and password below.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {/* Registration Success Banner */}
        {registeredParam && (
          <div
            role="status"
            className="flex items-start gap-2.5 rounded-md border border-[#16A34A]/30 bg-[#F0FDF4] p-2.5 text-xs text-[#166534]"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0 text-[#16A34A] mt-0.5" />
            <span>Account created successfully. Please enter your password to log in.</span>
          </div>
        )}

        {/* Dev Demo Credentials (development only, eliminated in production) */}
        {DevDemoCredentials && (
          <DevDemoCredentials
            onSelectEmail={(demoEmail) => {
              setEmail(demoEmail);
              setFormError(null);
              setFieldErrors({});
            }}
          />
        )}

        {/* Email field */}
        <div>
          <label
            htmlFor="login-email"
            className="block text-xs font-medium text-slate-700 mb-1.5"
          >
            Email address
          </label>
          <input
            ref={emailInputRef}
            id="login-email"
            data-testid="login-email"
            type="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (fieldErrors.email) {
                setFieldErrors((prev) => {
                  const next = { ...prev };
                  delete next.email;
                  return next;
                });
              }
            }}
            disabled={isSubmitting}
            autoComplete="username"
            className="h-9 w-full rounded-md border border-[#E5DFD5] bg-white px-3 py-1.5 text-sm text-[#0F172A] shadow-2xs transition-colors placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#0F172A] focus-visible:border-[#0F172A] disabled:opacity-50"
          />
          {fieldErrors.email && (
            <p role="alert" className="text-xs text-[#DC2626] mt-1 font-medium">
              {fieldErrors.email}
            </p>
          )}
        </div>

        {/* Password field */}
        <div>
          <label
            htmlFor="login-password"
            className="block text-xs font-medium text-slate-700 mb-1.5"
          >
            Password
          </label>
          <div className="relative">
            <input
              id="login-password"
              data-testid="login-password"
              type={showPassword ? "text" : "password"}
              placeholder="Your password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (fieldErrors.password) {
                  setFieldErrors((prev) => {
                    const next = { ...prev };
                    delete next.password;
                    return next;
                  });
                }
              }}
              disabled={isSubmitting}
              autoComplete="current-password"
              className="h-9 w-full rounded-md border border-[#E5DFD5] bg-white pl-3 pr-9 py-1.5 text-sm text-[#0F172A] shadow-2xs transition-colors placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#0F172A] focus-visible:border-[#0F172A] disabled:opacity-50"
            />
            <button
              type="button"
              data-testid="login-password-toggle"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-0 top-0 h-9 w-9 flex items-center justify-center text-slate-400 hover:text-[#0F172A] cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#0F172A] rounded-r-md transition-colors"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {fieldErrors.password && (
            <p role="alert" className="text-xs text-[#DC2626] mt-1 font-medium">
              {fieldErrors.password}
            </p>
          )}
        </div>

        {/* Form-level Error Alert */}
        {formError && (
          <div
            role="alert"
            data-testid="login-error"
            className="flex items-center gap-2 rounded-md border border-[#DC2626]/30 bg-[#FEF2F2] p-2.5 text-xs text-[#991B1B] font-medium"
          >
            <AlertCircle className="h-4 w-4 shrink-0 text-[#DC2626]" />
            <span>{formError}</span>
          </div>
        )}

        {/* Primary Submit Button */}
        <div className="pt-1">
          <button
            type="submit"
            data-testid="login-submit"
            disabled={isSubmitting}
            className="w-full h-9 rounded-md bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-medium shadow-2xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
                <span>Logging in...</span>
              </>
            ) : (
              <span>Log in</span>
            )}
          </button>
        </div>

        {/* Link to Register */}
        <p className="text-center text-xs text-slate-500 pt-1">
          New here?{" "}
          <Link
            href="/register"
            className="font-medium text-[#0F172A] underline underline-offset-4 hover:text-slate-700 transition-colors"
          >
            Create an account
          </Link>
        </p>
      </form>
    </div>
  );
}
