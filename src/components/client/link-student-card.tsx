"use client";

import * as React from "react";
import { linkStudentAction, updateHourlyRateAction } from "@/lib/actions/client-link";
import { linkStudentSchema, updateHourlyRateSchema } from "@/lib/validations/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  GraduationCap,
  Link as LinkIcon,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Edit2,
  School,
  BookOpen,
} from "lucide-react";

interface LinkStudentCardProps {
  initialLink: {
    id: string;
    hourlyRate: number;
    status: string;
    student: {
      id: string;
      name: string;
      email: string;
      studentProfile: {
        school: string;
        course: string;
        year: number;
      } | null;
    };
  } | null;
}

export function LinkStudentCard({ initialLink }: LinkStudentCardProps) {
  const [link, setLink] = React.useState(initialLink);

  // Link Form State
  const [code, setCode] = React.useState("");
  const [hourlyRate, setHourlyRate] = React.useState<number | string>(150);
  const [isLinking, setIsLinking] = React.useState(false);
  const [linkError, setLinkError] = React.useState<string | null>(null);
  const [linkSuccess, setLinkSuccess] = React.useState<string | null>(null);

  // Rate Editing State
  const [isEditingRate, setIsEditingRate] = React.useState(false);
  const [newRate, setNewRate] = React.useState<number | string>(
    initialLink?.hourlyRate ?? 150,
  );
  const [isSavingRate, setIsSavingRate] = React.useState(false);
  const [rateError, setRateError] = React.useState<string | null>(null);
  const [rateSuccess, setRateSuccess] = React.useState<string | null>(null);

  const handleLinkSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLinkError(null);
    setLinkSuccess(null);

    const formData = {
      code: code.trim().toUpperCase(),
      hourlyRate: Number(hourlyRate),
    };

    const parsed = linkStudentSchema.safeParse(formData);
    if (!parsed.success) {
      setLinkError(
        parsed.error.issues[0]?.message ??
          "Please enter a valid 8-character invite code and positive rate.",
      );
      return;
    }

    setIsLinking(true);

    try {
      const res = await linkStudentAction(formData);

      if (!res.success) {
        setLinkError(res.error ?? "Failed to link student. Please try again.");
        setIsLinking(false);
        return;
      }

      setLinkSuccess(`Successfully linked with ${res.data?.studentName}!`);
      // Reload page to refresh linked student details
      window.location.reload();
    } catch (err) {
      console.error(err);
      setLinkError("An unexpected error occurred while linking.");
      setIsLinking(false);
    }
  };

  const handleRateSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setRateError(null);
    setRateSuccess(null);

    const formData = {
      hourlyRate: Number(newRate),
    };

    const parsed = updateHourlyRateSchema.safeParse(formData);
    if (!parsed.success) {
      setRateError(parsed.error.issues[0]?.message ?? "Invalid hourly rate.");
      return;
    }

    setIsSavingRate(true);

    try {
      const res = await updateHourlyRateAction(formData);

      if (!res.success || !res.data) {
        setRateError(res.error ?? "Failed to update hourly rate.");
        setIsSavingRate(false);
        return;
      }

      setRateSuccess("Hourly rate updated successfully.");
      if (link) {
        setLink({
          ...link,
          hourlyRate: res.data.hourlyRate,
        });
      }
      setIsEditingRate(false);
      setIsSavingRate(false);
    } catch (err) {
      console.error(err);
      setRateError("An unexpected error occurred.");
      setIsSavingRate(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* If already linked, display Linked Student Card */}
      {link ? (
        <Card className="border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded-md bg-[var(--color-class-bg)] text-[var(--color-class)]">
                  <GraduationCap className="size-4" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold text-[var(--color-text)]">
                    Linked Student VA
                  </CardTitle>
                  <CardDescription className="text-xs text-[var(--color-muted)]">
                    Assigned virtual assistant details and hourly agreement
                  </CardDescription>
                </div>
              </div>
              <Badge variant="secondary" className="text-[10px]">
                {link.status}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 pt-0">
            {rateSuccess && (
              <div
                role="status"
                className="flex items-start gap-2.5 rounded-md border border-[var(--color-work)] bg-[var(--color-work-bg)] p-3 text-xs text-[var(--color-work)]"
              >
                <CheckCircle2 className="size-4 shrink-0 mt-0.5" />
                <span>{rateSuccess}</span>
              </div>
            )}

            {rateError && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-md border border-[var(--color-conflict)] bg-[var(--color-conflict-bg)] p-3 text-xs text-[var(--color-conflict)]"
              >
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                <span>{rateError}</span>
              </div>
            )}

            {/* Student Info Box */}
            <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--color-border)] pb-3">
                <div>
                  <span className="text-sm font-semibold text-[var(--color-text)] block">
                    {link.student.name}
                  </span>
                  <span className="text-xs text-[var(--color-muted)]">
                    {link.student.email}
                  </span>
                </div>

                {/* Rate Display / Inline Editor */}
                <div className="flex items-center gap-2">
                  {!isEditingRate ? (
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <span className="text-[10px] text-[var(--color-muted)] block uppercase font-medium">
                          Agreed Rate
                        </span>
                        <span className="text-sm font-bold text-[var(--color-text)]">
                          ₱{link.hourlyRate}/hr
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="xs"
                        onClick={() => {
                          setIsEditingRate(true);
                          setNewRate(link.hourlyRate);
                          setRateError(null);
                          setRateSuccess(null);
                        }}
                        className="gap-1 text-xs cursor-pointer ml-1"
                      >
                        <Edit2 className="size-3" />
                        <span>Edit</span>
                      </Button>
                    </div>
                  ) : (
                    <form
                      onSubmit={handleRateSubmit}
                      className="flex items-center gap-2"
                    >
                      <div className="w-24">
                        <Input
                          type="number"
                          step={1}
                          min={1}
                          value={newRate}
                          onChange={(e) => setNewRate(e.target.value)}
                          disabled={isSavingRate}
                          className="h-8 text-xs bg-[var(--color-surface)]"
                        />
                      </div>
                      <Button
                        type="submit"
                        size="xs"
                        disabled={isSavingRate}
                        className="h-8 bg-[var(--color-accent)] text-[var(--color-accent-fg)] text-xs cursor-pointer"
                      >
                        {isSavingRate ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          "Save"
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        disabled={isSavingRate}
                        onClick={() => setIsEditingRate(false)}
                        className="h-8 text-xs cursor-pointer"
                      >
                        Cancel
                      </Button>
                    </form>
                  )}
                </div>
              </div>

              {/* Student Profile Info */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-xs">
                <div className="flex items-center gap-1.5 text-[var(--color-muted)]">
                  <School className="size-3.5" />
                  <span>
                    School:{" "}
                    <strong className="text-[var(--color-text)] font-medium">
                      {link.student.studentProfile?.school ?? "N/A"}
                    </strong>
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-[var(--color-muted)]">
                  <BookOpen className="size-3.5" />
                  <span>
                    Course:{" "}
                    <strong className="text-[var(--color-text)] font-medium">
                      {link.student.studentProfile?.course ?? "N/A"}
                    </strong>
                  </span>
                </div>

                <div className="text-[var(--color-muted)]">
                  Year Level:{" "}
                  <strong className="text-[var(--color-text)] font-medium">
                    {link.student.studentProfile?.year
                      ? `Year ${link.student.studentProfile.year}`
                      : "N/A"}
                  </strong>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* If no student linked yet, show Link Student Form */
        <Card className="border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-md bg-[var(--color-accent)] text-[var(--color-accent-fg)]">
                <LinkIcon className="size-4" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold text-[var(--color-text)]">
                  Link Student VA
                </CardTitle>
                <CardDescription className="text-xs text-[var(--color-muted)]">
                  Enter your student&apos;s 8-character invite code and agree on an hourly rate
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <form onSubmit={handleLinkSubmit}>
            <CardContent className="space-y-4 pt-1">
              {linkSuccess && (
                <div
                  role="status"
                  className="flex items-start gap-2.5 rounded-md border border-[var(--color-work)] bg-[var(--color-work-bg)] p-3 text-xs text-[var(--color-work)]"
                >
                  <CheckCircle2 className="size-4 shrink-0 mt-0.5" />
                  <span>{linkSuccess}</span>
                </div>
              )}

              {linkError && (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 rounded-md border border-[var(--color-conflict)] bg-[var(--color-conflict-bg)] p-3 text-xs text-[var(--color-conflict)]"
                >
                  <AlertCircle className="size-4 shrink-0 mt-0.5" />
                  <span>{linkError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="invite-code"
                    className="text-xs font-medium text-[var(--color-text)]"
                  >
                    Invite Code (8 Characters)
                  </Label>
                  <Input
                    id="invite-code"
                    placeholder="e.g. EDMAXNXY"
                    maxLength={8}
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    disabled={isLinking}
                    className="font-mono uppercase tracking-wider bg-[var(--color-bg)] text-xs"
                  />
                  <p className="text-[11px] text-[var(--color-muted)]">
                    Ask your Student VA for their active code from their settings.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="hourly-rate"
                    className="text-xs font-medium text-[var(--color-text)]"
                  >
                    Hourly Rate (PHP ₱)
                  </Label>
                  <Input
                    id="hourly-rate"
                    type="number"
                    min={1}
                    step={1}
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(e.target.value)}
                    disabled={isLinking}
                    className="bg-[var(--color-bg)] text-xs"
                  />
                  <p className="text-[11px] text-[var(--color-muted)]">
                    Agreed rate per hour (e.g. 150 for ₱150/hr).
                  </p>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  disabled={isLinking || code.length !== 8}
                  className="bg-[var(--color-accent)] text-[var(--color-accent-fg)] hover:bg-[var(--color-accent-hover)] text-xs font-medium h-9 cursor-pointer"
                >
                  {isLinking ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="size-3.5 animate-spin" />
                      <span>Linking student...</span>
                    </span>
                  ) : (
                    <span>Link Student</span>
                  )}
                </Button>
              </div>
            </CardContent>
          </form>
        </Card>
      )}
    </div>
  );
}

