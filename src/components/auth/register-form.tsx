"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Role } from "@prisma/client";
import { registerSchema } from "@/lib/validations/auth";
import { registerAction } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { GraduationCap, Briefcase, AlertCircle, Loader2 } from "lucide-react";

export function RegisterForm() {
  const router = useRouter();

  const [role, setRole] = React.useState<Role>(Role.STUDENT);
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [school, setSchool] = React.useState("");
  const [course, setCourse] = React.useState("");
  const [year, setYear] = React.useState<number | string>(1);

  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleRoleChange = (newRole: Role) => {
    setRole(newRole);
    setFieldErrors({});
    setServerError(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setServerError(null);
    setFieldErrors({});

    const formData =
      role === Role.STUDENT
        ? {
            role: Role.STUDENT,
            name,
            email,
            password,
            school,
            course,
            year: Number(year),
          }
        : {
            role: Role.CLIENT,
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
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await registerAction(formData);

      if (!res.success) {
        if (res.fieldErrors) {
          setFieldErrors(res.fieldErrors);
        }
        setServerError(res.error ?? "Registration failed. Please try again.");
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
      setServerError("An unexpected error occurred. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-md border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
      <CardHeader className="space-y-1 pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold tracking-tight text-[var(--color-text)]">
            Create an account
          </CardTitle>
          <span className="text-xs text-[var(--color-muted)] font-medium uppercase tracking-wide">
            Step 1 of 2
          </span>
        </div>
        <CardDescription className="text-xs text-[var(--color-muted)]">
          Join Student VA-Hub as a Student VA or Client
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
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

          {/* Role Choice First (Student or Client) */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-[var(--color-text)]">
              I want to register as
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleRoleChange(Role.STUDENT)}
                disabled={isSubmitting}
                className={`flex items-center justify-center gap-2 rounded-md border p-3 text-xs font-medium transition-colors cursor-pointer ${
                  role === Role.STUDENT
                    ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-accent-fg)]"
                    : "border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] hover:bg-[var(--color-surface)]"
                }`}
              >
                <GraduationCap className="size-4" />
                <span>Student VA</span>
              </button>

              <button
                type="button"
                onClick={() => handleRoleChange(Role.CLIENT)}
                disabled={isSubmitting}
                className={`flex items-center justify-center gap-2 rounded-md border p-3 text-xs font-medium transition-colors cursor-pointer ${
                  role === Role.CLIENT
                    ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-accent-fg)]"
                    : "border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] hover:bg-[var(--color-surface)]"
                }`}
              >
                <Briefcase className="size-4" />
                <span>Client</span>
              </button>
            </div>
            <p className="text-[11px] text-[var(--color-muted)]">
              {role === Role.STUDENT
                ? "Manage your class schedule, set availability, and protect study hours."
                : "Assign tasks and hire student VAs with guaranteed conflict protection."}
            </p>
          </div>

          {/* Common Fields: Name, Email, Password */}
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-xs font-medium text-[var(--color-text)]">
              Full Name
            </Label>
            <Input
              id="name"
              type="text"
              placeholder={role === Role.STUDENT ? "Juan Dela Cruz" : "Maria Santos"}
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSubmitting}
              className="bg-[var(--color-bg)] text-xs"
            />
            {fieldErrors.name && (
              <p className="text-[11px] text-[var(--color-conflict)]">{fieldErrors.name}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-medium text-[var(--color-text)]">
              Email Address
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
              className="bg-[var(--color-bg)] text-xs"
            />
            {fieldErrors.email && (
              <p className="text-[11px] text-[var(--color-conflict)]">{fieldErrors.email}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs font-medium text-[var(--color-text)]">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSubmitting}
              className="bg-[var(--color-bg)] text-xs"
            />
            {fieldErrors.password && (
              <p className="text-[11px] text-[var(--color-conflict)]">{fieldErrors.password}</p>
            )}
          </div>

          {/* Student-only Fields: School, Course, Year */}
          {role === Role.STUDENT && (
            <div className="space-y-3 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] p-3">
              <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-muted)] block">
                Academic Information
              </span>

              <div className="space-y-1.5">
                <Label htmlFor="school" className="text-xs font-medium text-[var(--color-text)]">
                  University / School
                </Label>
                <Input
                  id="school"
                  type="text"
                  placeholder="e.g. UP Diliman, UST, DLSU"
                  value={school}
                  onChange={(e) => setSchool(e.target.value)}
                  disabled={isSubmitting}
                  className="bg-[var(--color-surface)] text-xs"
                />
                {fieldErrors.school && (
                  <p className="text-[11px] text-[var(--color-conflict)]">{fieldErrors.school}</p>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2 space-y-1.5">
                  <Label htmlFor="course" className="text-xs font-medium text-[var(--color-text)]">
                    Course / Degree
                  </Label>
                  <Input
                    id="course"
                    type="text"
                    placeholder="e.g. BS Computer Science"
                    value={course}
                    onChange={(e) => setCourse(e.target.value)}
                    disabled={isSubmitting}
                    className="bg-[var(--color-surface)] text-xs"
                  />
                  {fieldErrors.course && (
                    <p className="text-[11px] text-[var(--color-conflict)]">{fieldErrors.course}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="year" className="text-xs font-medium text-[var(--color-text)]">
                    Year Level
                  </Label>
                  <select
                    id="year"
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                    disabled={isSubmitting}
                    className="h-9 w-full rounded-md border border-input bg-[var(--color-surface)] px-2 py-1 text-xs text-[var(--color-text)] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  >
                    <option value={1}>1st Year</option>
                    <option value={2}>2nd Year</option>
                    <option value={3}>3rd Year</option>
                    <option value={4}>4th Year</option>
                    <option value={5}>5th Year</option>
                    <option value={6}>6th Year</option>
                  </select>
                  {fieldErrors.year && (
                    <p className="text-[11px] text-[var(--color-conflict)]">{fieldErrors.year}</p>
                  )}
                </div>
              </div>
            </div>
          )}
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
                <span>Creating account...</span>
              </span>
            ) : (
              <span>Create {role === Role.STUDENT ? "Student" : "Client"} Account</span>
            )}
          </Button>

          <p className="text-center text-xs text-[var(--color-muted)]">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-[var(--color-accent)] underline-offset-4 hover:underline"
            >
              Sign in
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}

