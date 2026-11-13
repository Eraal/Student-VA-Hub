"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Role } from "@prisma/client";
import { registerSchema } from "@/lib/validations/auth";
import { registerAction } from "@/lib/actions/auth";
import { toUserErrorMessage } from "@/lib/errors";
import { displayFontClass } from "@/components/landing/fonts";
import { cn } from "@/lib/utils";
import {
  GraduationCap,
  Briefcase,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  Info,
} from "lucide-react";
import { AuthLayout } from "@/components/auth/auth-layout";

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Preselect from ?role=STUDENT or ?role=CLIENT; default to STUDENT on missing or invalid
  const getInitialRole = React.useCallback((): Role => {
    const param = searchParams.get("role")?.toUpperCase();
    if (param === "CLIENT") return Role.CLIENT;
    return Role.STUDENT;
  }, [searchParams]);

  const [role, setRole] = React.useState<Role>(getInitialRole);
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [school, setSchool] = React.useState("");
  const [course, setCourse] = React.useState("");
  const [year, setYear] = React.useState<number | string>(1);

  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Sync role if ?role query param updates externally
  React.useEffect(() => {
    const param = searchParams.get("role")?.toUpperCase();
    if (param === "CLIENT" && role !== Role.CLIENT) {
      setRole(Role.CLIENT);
    } else if (param === "STUDENT" && role !== Role.STUDENT) {
      setRole(Role.STUDENT);
    }
  }, [searchParams, role]);

  // Auto-focus the first empty field only on desktop (1024px and up)
  React.useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth >= 1024) {
      const fieldOrder = ["name", "email", "password", "school", "course"];
      for (const id of fieldOrder) {
        const el = document.getElementById(id) as HTMLInputElement | null;
        if (el && !el.value) {
          el.focus();
          break;
        }
      }
    }
  }, []);

  // Move focus to the first invalid field
  const focusFirstInvalidField = (errors: Record<string, string>) => {
    const fieldOrder = ["name", "email", "password", "school", "course", "year"];
    for (const field of fieldOrder) {
      if (errors[field]) {
        const el = document.getElementById(field);
        if (el) {
          el.focus();
          break;
        }
      }
    }
  };

  const handleRoleChange = (newRole: Role) => {
    setRole(newRole);
    setServerError(null);

    // If switching to CLIENT, remove student-specific field errors
    if (newRole === Role.CLIENT) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.school;
        delete next.course;
        delete next.year;
        return next;
      });
    }

    // Keep typed values intact in state (name, email, password, school, course, year)
    // Update URL query string with router.replace without scrolling
    const params = new URLSearchParams(searchParams.toString());
    params.set("role", newRole);
    router.replace(`/register?${params.toString()}`, { scroll: false });
  };

  // Keyboard accessibility for role radiogroup (arrow keys & space/enter)
  const handleRadioKeyDown = (e: React.KeyboardEvent, currentRole: Role) => {
    if (
      e.key === "ArrowRight" ||
      e.key === "ArrowDown" ||
      e.key === "ArrowLeft" ||
      e.key === "ArrowUp"
    ) {
      e.preventDefault();
      const nextRole = currentRole === Role.STUDENT ? Role.CLIENT : Role.STUDENT;
      handleRoleChange(nextRole);
      const nextEl = document.querySelector<HTMLElement>(
        nextRole === Role.STUDENT
          ? '[data-testid="auth-role-student"]'
          : '[data-testid="auth-role-client"]'
      );
      nextEl?.focus();
    } else if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      handleRoleChange(currentRole);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting) return;

    setServerError(null);
    setFieldErrors({});

    // Student-only fields are NOT sent for clients
    const formData =
      role === Role.STUDENT
        ? {
            role: "STUDENT" as const,
            name,
            email,
            password,
            school,
            course,
            year: Number(year),
          }
        : {
            role: "CLIENT" as const,
            name,
            email,
            password,
          };

    // Client-side Zod validation
    const clientValidation = registerSchema.safeParse(formData);
    if (!clientValidation.success) {
      const errors: Record<string, string> = {};
      for (const issue of clientValidation.error.issues) {
        const field = issue.path[0];
        if (field && typeof field === "string" && !errors[field]) {
          errors[field] = issue.message;
        }
      }
      setFieldErrors(errors);
      focusFirstInvalidField(errors);
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await registerAction(formData);

      if (!res.success) {
        if (res.fieldErrors) {
          setFieldErrors(res.fieldErrors);
          focusFirstInvalidField(res.fieldErrors);
        }
        setServerError(toUserErrorMessage(res.error));
        setIsSubmitting(false);
        return;
      }

      // Success: redirect to /login with registered flag and email
      const target = `/login?registered=1&email=${encodeURIComponent(
        res.data?.email ?? email,
      )}`;
      router.push(target);
    } catch (err) {
      console.error(err);
      setServerError(toUserErrorMessage(err));
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout role={role} mode="register">
      {/* Page Heading & Subtitle */}
      <div>
        <h1 className={`${displayFontClass} text-xl font-semibold tracking-tight text-[#0F172A]`}>
          Create your account
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Choose your role to get started.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {/* Form-level server error with assertive announcement */}
        {serverError && (
          <div
            role="alert"
            aria-live="assertive"
            data-testid="auth-error"
            className="flex items-start gap-2 rounded-md border border-[#DC2626]/30 bg-[#FEF2F2] p-2.5 text-xs text-[#991B1B] font-medium"
          >
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-[#DC2626]" />
            <span>{serverError}</span>
          </div>
        )}

        {/* Segmented Role Switcher: Uses system subtle surface (#FAF7F2) and border (#E5DFD5) */}
        <div>
          <span className="block text-xs font-medium text-slate-700 mb-1.5">
            I want to register as
          </span>
          <div
            role="radiogroup"
            aria-label="Account type"
            className="grid grid-cols-2 p-1 bg-[#FAF7F2] rounded-lg border border-[#E5DFD5]"
          >
            {/* Student Option */}
            <button
              type="button"
              role="radio"
              aria-checked={role === Role.STUDENT}
              tabIndex={role === Role.STUDENT ? 0 : -1}
              data-testid="auth-role-student"
              onClick={() => handleRoleChange(Role.STUDENT)}
              onKeyDown={(e) => handleRadioKeyDown(e, Role.STUDENT)}
              className={cn(
                "flex items-center justify-center gap-2 py-1.5 px-3 rounded-md text-xs font-medium transition-all cursor-pointer",
                role === Role.STUDENT
                  ? "bg-white text-[#0F172A] shadow-2xs border border-[#E5DFD5]"
                  : "text-slate-600 hover:text-[#0F172A] border border-transparent"
              )}
            >
              <GraduationCap className="h-4 w-4" />
              <span>Student VA</span>
            </button>

            {/* Client Option */}
            <button
              type="button"
              role="radio"
              aria-checked={role === Role.CLIENT}
              tabIndex={role === Role.CLIENT ? 0 : -1}
              data-testid="auth-role-client"
              onClick={() => handleRoleChange(Role.CLIENT)}
              onKeyDown={(e) => handleRadioKeyDown(e, Role.CLIENT)}
              className={cn(
                "flex items-center justify-center gap-2 py-1.5 px-3 rounded-md text-xs font-medium transition-all cursor-pointer",
                role === Role.CLIENT
                  ? "bg-white text-[#0F172A] shadow-2xs border border-[#E5DFD5]"
                  : "text-slate-600 hover:text-[#0F172A] border border-transparent"
              )}
            >
              <Briefcase className="h-4 w-4" />
              <span>Client</span>
            </button>
          </div>

          {/* Role Helper Note */}
          <div className="flex items-center gap-2 text-[11px] text-slate-600 bg-[#FAF7F2] border border-[#E5DFD5] rounded-md px-2.5 py-1.5 mt-2">
            <Info className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span>
              {role === Role.STUDENT
                ? "You'll get an invite code after signup to share with your client."
                : "You'll link your student account using their invite code after signup."}
            </span>
          </div>
        </div>

        {/* Account Fields */}
        <div className="space-y-3.5">
          {/* Full Name */}
          <div>
            <label htmlFor="name" className="block text-xs font-medium text-slate-700 mb-1.5">
              Full name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              placeholder={role === Role.STUDENT ? "Juan Dela Cruz" : "Maria Santos"}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (fieldErrors.name) {
                  setFieldErrors((prev) => {
                    const next = { ...prev };
                    delete next.name;
                    return next;
                  });
                }
              }}
              disabled={isSubmitting}
              aria-invalid={!!fieldErrors.name}
              aria-describedby={fieldErrors.name ? "name-error" : undefined}
              data-testid="auth-name"
              className="h-9 w-full rounded-md border border-[#E5DFD5] bg-white px-3 py-1.5 text-sm text-[#0F172A] shadow-2xs transition-colors placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#0F172A] focus-visible:border-[#0F172A] disabled:opacity-50"
            />
            {fieldErrors.name && (
              <p id="name-error" role="alert" className="text-xs text-[#DC2626] mt-1 font-medium">
                {fieldErrors.name}
              </p>
            )}
          </div>

          {/* Email Address */}
          <div>
            <label htmlFor="email" className="block text-xs font-medium text-slate-700 mb-1.5">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
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
              aria-invalid={!!fieldErrors.email}
              aria-describedby={fieldErrors.email ? "email-error" : undefined}
              data-testid="auth-email"
              className="h-9 w-full rounded-md border border-[#E5DFD5] bg-white px-3 py-1.5 text-sm text-[#0F172A] shadow-2xs transition-colors placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#0F172A] focus-visible:border-[#0F172A] disabled:opacity-50"
            />
            {fieldErrors.email && (
              <p id="email-error" role="alert" className="text-xs text-[#DC2626] mt-1 font-medium">
                {fieldErrors.email}
              </p>
            )}
          </div>

          {/* Password with Eye/EyeOff toggle & 8-character requirement */}
          <div>
            <label htmlFor="password" className="block text-xs font-medium text-slate-700 mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="At least 8 characters"
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
                aria-invalid={!!fieldErrors.password}
                aria-describedby={fieldErrors.password ? "password-error" : undefined}
                data-testid="auth-password"
                className="h-9 w-full rounded-md border border-[#E5DFD5] bg-white pl-3 pr-9 py-1.5 text-sm text-[#0F172A] shadow-2xs transition-colors placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#0F172A] focus-visible:border-[#0F172A] disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                data-testid="auth-password-toggle"
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-0 top-0 h-9 w-9 flex items-center justify-center text-slate-400 hover:text-[#0F172A] cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#0F172A] rounded-r-md transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {fieldErrors.password && (
              <p id="password-error" role="alert" className="text-xs text-[#DC2626] mt-1 font-medium">
                {fieldErrors.password}
              </p>
            )}
          </div>
        </div>

        {/* Student Academic Fields (Only visible when role === STUDENT) */}
        {role === Role.STUDENT && (
          <div className="space-y-3.5 pt-1">
            {/* Subtle section divider: uses #E5DFD5 */}
            <div className="relative py-1">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-[#E5DFD5]" />
              </div>
              <div className="relative flex justify-start">
                <span className="bg-white pr-2 text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                  Academic Details
                </span>
              </div>
            </div>

            {/* School or University */}
            <div>
              <label htmlFor="school" className="block text-xs font-medium text-slate-700 mb-1.5">
                School or university
              </label>
              <input
                id="school"
                name="school"
                type="text"
                autoComplete="organization"
                placeholder="e.g. UP Diliman, UST, DLSU"
                value={school}
                onChange={(e) => {
                  setSchool(e.target.value);
                  if (fieldErrors.school) {
                    setFieldErrors((prev) => {
                      const next = { ...prev };
                      delete next.school;
                      return next;
                    });
                  }
                }}
                disabled={isSubmitting}
                aria-invalid={!!fieldErrors.school}
                aria-describedby={fieldErrors.school ? "school-error" : undefined}
                data-testid="auth-school"
                className="h-9 w-full rounded-md border border-[#E5DFD5] bg-white px-3 py-1.5 text-sm text-[#0F172A] shadow-2xs transition-colors placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#0F172A] focus-visible:border-[#0F172A] disabled:opacity-50"
              />
              {fieldErrors.school && (
                <p id="school-error" role="alert" className="text-xs text-[#DC2626] mt-1 font-medium">
                  {fieldErrors.school}
                </p>
              )}
            </div>

            {/* Course and Year: 2-column row */}
            <div className="grid grid-cols-12 gap-3">
              {/* Course or Degree */}
              <div className="col-span-7">
                <label htmlFor="course" className="block text-xs font-medium text-slate-700 mb-1.5">
                  Course or degree
                </label>
                <input
                  id="course"
                  name="course"
                  type="text"
                  placeholder="e.g. BS Information Technology"
                  value={course}
                  onChange={(e) => {
                    setCourse(e.target.value);
                    if (fieldErrors.course) {
                      setFieldErrors((prev) => {
                        const next = { ...prev };
                        delete next.course;
                        return next;
                      });
                    }
                  }}
                  disabled={isSubmitting}
                  aria-invalid={!!fieldErrors.course}
                  aria-describedby={fieldErrors.course ? "course-error" : undefined}
                  data-testid="auth-course"
                  className="h-9 w-full rounded-md border border-[#E5DFD5] bg-white px-3 py-1.5 text-sm text-[#0F172A] shadow-2xs transition-colors placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#0F172A] focus-visible:border-[#0F172A] disabled:opacity-50"
                />
                {fieldErrors.course && (
                  <p id="course-error" role="alert" className="text-xs text-[#DC2626] mt-1 font-medium">
                    {fieldErrors.course}
                  </p>
                )}
              </div>

              {/* Year Level */}
              <div className="col-span-5">
                <label htmlFor="year" className="block text-xs font-medium text-slate-700 mb-1.5">
                  Year level
                </label>
                <select
                  id="year"
                  data-testid="auth-year"
                  value={String(year)}
                  onChange={(e) => {
                    setYear(Number(e.target.value));
                    if (fieldErrors.year) {
                      setFieldErrors((prev) => {
                        const next = { ...prev };
                        delete next.year;
                        return next;
                      });
                    }
                  }}
                  disabled={isSubmitting}
                  aria-invalid={!!fieldErrors.year}
                  aria-describedby={fieldErrors.year ? "year-error" : undefined}
                  className="h-9 w-full rounded-md border border-[#E5DFD5] bg-white px-3 py-1.5 text-sm text-[#0F172A] shadow-2xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#0F172A] focus-visible:border-[#0F172A] disabled:opacity-50 cursor-pointer"
                >
                  <option value="1">1st Year</option>
                  <option value="2">2nd Year</option>
                  <option value="3">3rd Year</option>
                  <option value="4">4th Year</option>
                  <option value="5">5th Year</option>
                </select>
                {fieldErrors.year && (
                  <p id="year-error" role="alert" className="text-xs text-[#DC2626] mt-1 font-medium">
                    {fieldErrors.year}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Primary Submit Button */}
        <div className="pt-1">
          <button
            type="submit"
            disabled={isSubmitting}
            data-testid="auth-submit"
            className="w-full h-9 rounded-md bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-medium shadow-2xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
                <span>Creating account...</span>
              </>
            ) : (
              <span>
                {role === Role.STUDENT
                  ? "Create student account"
                  : "Create client account"}
              </span>
            )}
          </button>
        </div>

        {/* Link to Login */}
        <p className="text-center text-xs text-slate-500 pt-1">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-[#0F172A] underline underline-offset-4 hover:text-slate-700 transition-colors"
          >
            Log in
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
