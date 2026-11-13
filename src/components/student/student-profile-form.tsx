"use client";

import * as React from "react";
import Link from "next/link";
import { updateStudentProfileSchema } from "@/lib/validations/profile";
import { updateStudentProfileAction } from "@/lib/actions/profile";
import { toUserErrorMessage, formatZodFieldErrors } from "@/lib/errors";
import { formatHours } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/toast";
import { Loader2, AlertCircle, ArrowUpRight } from "lucide-react";

interface StudentProfileFormProps {
  initialData: {
    id: string;
    name: string;
    email: string;
    school: string;
    course: string;
    year: number;
    maxHoursPerDay: number;
  };
  onProfileSaved?: (updated: {
    name: string;
    email: string;
    school: string;
    course: string;
    year: number;
    maxHoursPerDay: number;
  }) => void;
}

export function StudentProfileForm({
  initialData,
  onProfileSaved,
}: StudentProfileFormProps) {
  const [savedData, setSavedData] = React.useState(initialData);

  const [name, setName] = React.useState(initialData.name);
  const [email, setEmail] = React.useState(initialData.email);
  const [school, setSchool] = React.useState(initialData.school);
  const [course, setCourse] = React.useState(initialData.course);
  const [year, setYear] = React.useState(initialData.year);
  const maxHoursPerDay = initialData.maxHoursPerDay;

  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Compute dirty state
  const isDirty =
    name !== savedData.name ||
    email !== savedData.email ||
    school !== savedData.school ||
    course !== savedData.course ||
    year !== savedData.year;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setServerError(null);
    setFieldErrors({});

    const formData = {
      name: name.trim(),
      email: email.trim(),
      school: school.trim(),
      course: course.trim(),
      year: Number(year),
      maxHoursPerDay: Number(maxHoursPerDay),
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    };

    const parsed = updateStudentProfileSchema.safeParse(formData);
    if (!parsed.success) {
      setFieldErrors(formatZodFieldErrors(parsed.error));
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await updateStudentProfileAction(formData);

      if (!res.success) {
        if (res.fieldErrors) {
          setFieldErrors(res.fieldErrors);
        }
        setServerError(
          toUserErrorMessage(res.error ?? "Failed to save profile.")
        );
        setIsSubmitting(false);
        return;
      }

      toast.success("Profile saved");
      const nextSaved = {
        ...savedData,
        name: formData.name,
        email: formData.email,
        school: formData.school,
        course: formData.course,
        year: formData.year,
      };
      setSavedData(nextSaved);
      onProfileSaved?.(nextSaved);
      setIsSubmitting(false);
    } catch (err) {
      setServerError(toUserErrorMessage(err));
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border-[1.5px] border-[#0F172A] bg-white shadow-[3px_3px_0px_0px_#0F172A] rounded-2xl">
      <CardHeader className="px-5 py-4 sm:px-6 sm:py-4 border-b border-[#E5DFD5]">
        <CardTitle className="font-display text-lg font-bold text-[#0F172A]">
          Personal details
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm text-slate-600">
          Your personal and university academic information.
        </CardDescription>
      </CardHeader>

      <CardContent className="p-5 sm:p-6">
        <form
          data-testid="profile-form"
          onSubmit={handleSubmit}
          className="space-y-4 sm:space-y-5"
        >
          {serverError && (
            <div
              role="alert"
              aria-live="polite"
              className="flex items-start gap-2.5 rounded-lg border-[1.5px] border-[#DC2626] bg-[#FEF2F2] p-3 text-xs sm:text-sm text-[#991B1B]"
            >
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <span>{serverError}</span>
            </div>
          )}

          {/* Hidden input for maxHoursPerDay to satisfy server validation */}
          <input type="hidden" name="maxHoursPerDay" value={maxHoursPerDay} />

          {/* Full Name */}
          <div className="space-y-1.5 w-full">
            <Label
              htmlFor="student-name"
              className="text-xs sm:text-sm font-bold text-[#0F172A]"
            >
              Full name
            </Label>
            <Input
              id="student-name"
              name="name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (fieldErrors.name) {
                  setFieldErrors((prev) => ({ ...prev, name: "" }));
                }
              }}
              disabled={isSubmitting}
              aria-invalid={!!fieldErrors.name}
              className="w-full text-sm"
            />
            {fieldErrors.name && (
              <p
                role="alert"
                aria-live="polite"
                className="text-xs text-[#DC2626] font-medium"
              >
                {fieldErrors.name}
              </p>
            )}
          </div>

          {/* Email Address */}
          <div className="space-y-1.5 w-full">
            <Label
              htmlFor="student-email"
              className="text-xs sm:text-sm font-bold text-[#0F172A]"
            >
              Email
            </Label>
            <Input
              id="student-email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldErrors.email) {
                  setFieldErrors((prev) => ({ ...prev, email: "" }));
                }
              }}
              disabled={isSubmitting}
              aria-invalid={!!fieldErrors.email}
              className="w-full text-sm"
            />
            {fieldErrors.email && (
              <p
                role="alert"
                aria-live="polite"
                className="text-xs text-[#DC2626] font-medium"
              >
                {fieldErrors.email}
              </p>
            )}
          </div>

          {/* School */}
          <div className="space-y-1.5 w-full">
            <Label
              htmlFor="student-school"
              className="text-xs sm:text-sm font-bold text-[#0F172A]"
            >
              School
            </Label>
            <Input
              id="student-school"
              name="school"
              value={school}
              onChange={(e) => {
                setSchool(e.target.value);
                if (fieldErrors.school) {
                  setFieldErrors((prev) => ({ ...prev, school: "" }));
                }
              }}
              disabled={isSubmitting}
              aria-invalid={!!fieldErrors.school}
              className="w-full text-sm"
            />
            {fieldErrors.school && (
              <p
                role="alert"
                aria-live="polite"
                className="text-xs text-[#DC2626] font-medium"
              >
                {fieldErrors.school}
              </p>
            )}
          </div>

          {/* Course */}
          <div className="space-y-1.5 w-full">
            <Label
              htmlFor="student-course"
              className="text-xs sm:text-sm font-bold text-[#0F172A]"
            >
              Course
            </Label>
            <Input
              id="student-course"
              name="course"
              value={course}
              onChange={(e) => {
                setCourse(e.target.value);
                if (fieldErrors.course) {
                  setFieldErrors((prev) => ({ ...prev, course: "" }));
                }
              }}
              disabled={isSubmitting}
              aria-invalid={!!fieldErrors.course}
              className="w-full text-sm"
            />
            {fieldErrors.course && (
              <p
                role="alert"
                aria-live="polite"
                className="text-xs text-[#DC2626] font-medium"
              >
                {fieldErrors.course}
              </p>
            )}
          </div>

          {/* Year Level (shadcn Select) */}
          <div className="space-y-1.5 w-full">
            <Label
              htmlFor="student-year"
              className="text-xs sm:text-sm font-bold text-[#0F172A]"
            >
              Year level
            </Label>
            <Select
              value={String(year)}
              onValueChange={(val) => {
                setYear(Number(val));
                if (fieldErrors.year) {
                  setFieldErrors((prev) => ({ ...prev, year: "" }));
                }
              }}
              disabled={isSubmitting}
            >
              <SelectTrigger id="student-year" className="h-10 text-sm w-full">
                <SelectValue placeholder="Select year level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1st year</SelectItem>
                <SelectItem value="2">2nd year</SelectItem>
                <SelectItem value="3">3rd year</SelectItem>
                <SelectItem value="4">4th year</SelectItem>
                <SelectItem value="5">5th year</SelectItem>
                <SelectItem value="6">6th year</SelectItem>
              </SelectContent>
            </Select>
            {fieldErrors.year && (
              <p
                role="alert"
                aria-live="polite"
                className="text-xs text-[#DC2626] font-medium"
              >
                {fieldErrors.year}
              </p>
            )}
          </div>

          {/* Daily Hour Limit (Read-only row) */}
          <div className="space-y-1.5 w-full">
            <Label className="text-xs sm:text-sm font-bold text-[#0F172A]">
              Daily hour limit
            </Label>
            <div
              data-testid="daily-limit-readonly"
              className="flex items-center justify-between h-10 px-3 rounded-lg border-[1.5px] border-[#E5DFD5] bg-[#FAF7F2] text-xs sm:text-sm"
            >
              <span className="font-semibold text-[#0F172A] font-display tabular-nums">
                {`Daily hour limit: ${formatHours(maxHoursPerDay)}`}
              </span>
              <Link
                href="/student/schedule#availability"
                className="inline-flex items-center gap-1 font-bold text-[#0F172A] hover:underline"
              >
                <span>Change in Schedule</span>
                <ArrowUpRight className="size-3.5" />
              </Link>
            </div>
          </div>

          {/* Action Row */}
          <div className="pt-2 border-t border-[#E5DFD5] flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              {isDirty && (
                <span
                  data-testid="profile-dirty-hint"
                  className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-300 rounded-md px-2.5 py-1"
                >
                  Unsaved changes
                </span>
              )}
            </div>

            <Button
              type="submit"
              data-testid="profile-save"
              disabled={!isDirty || isSubmitting}
              className="w-full sm:w-auto min-h-[40px] font-bold disabled:opacity-40"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" />
                  <span>Saving changes...</span>
                </span>
              ) : (
                <span>Save changes</span>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
