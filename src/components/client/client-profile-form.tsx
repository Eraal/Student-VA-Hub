"use client";

import * as React from "react";
import { updateClientProfileSchema } from "@/lib/validations/profile";
import { updateClientProfileAction } from "@/lib/actions/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { CheckCircle2, AlertCircle, Loader2, Lock, User } from "lucide-react";

interface ClientProfileFormProps {
  initialData: {
    id: string;
    name: string;
    email: string;
  };
}

export function ClientProfileForm({ initialData }: ClientProfileFormProps) {
  const [name, setName] = React.useState(initialData.name);
  const [email, setEmail] = React.useState(initialData.email);

  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showPasswordFields, setShowPasswordFields] = React.useState(false);

  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setServerError(null);
    setSuccessMessage(null);
    setFieldErrors({});

    const formData = {
      name,
      email,
      currentPassword: showPasswordFields ? currentPassword : "",
      newPassword: showPasswordFields ? newPassword : "",
      confirmPassword: showPasswordFields ? confirmPassword : "",
    };

    // Client-side Zod validation
    const parsed = updateClientProfileSchema.safeParse(formData);
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
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
      const res = await updateClientProfileAction(formData);

      if (!res.success) {
        if (res.fieldErrors) {
          setFieldErrors(res.fieldErrors);
        }
        setServerError(res.error ?? "Failed to update profile. Please try again.");
        setIsSubmitting(false);
        return;
      }

      setSuccessMessage("Profile updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowPasswordFields(false);
      setIsSubmitting(false);
    } catch (err) {
      console.error(err);
      setServerError("An unexpected error occurred. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-md bg-[var(--color-accent)] text-[var(--color-accent-fg)]">
            <User className="size-4" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold text-[var(--color-text)]">
              Client Account Details
            </CardTitle>
            <CardDescription className="text-xs text-[var(--color-muted)]">
              Update your contact information and password
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4 pt-1">
          {successMessage && (
            <div
              role="status"
              className="flex items-start gap-2.5 rounded-md border border-[var(--color-work)] bg-[var(--color-work-bg)] p-3 text-xs text-[var(--color-work)]"
            >
              <CheckCircle2 className="size-4 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {serverError && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-md border border-[var(--color-conflict)] bg-[var(--color-conflict-bg)] p-3 text-xs text-[var(--color-conflict)]"
            >
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <span>{serverError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="client-name" className="text-xs font-medium text-[var(--color-text)]">
                Full Name
              </Label>
              <Input
                id="client-name"
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
              <Label htmlFor="client-email" className="text-xs font-medium text-[var(--color-text)]">
                Email Address
              </Label>
              <Input
                id="client-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting}
                className="bg-[var(--color-bg)] text-xs"
              />
              {fieldErrors.email && (
                <p className="text-[11px] text-[var(--color-conflict)]">{fieldErrors.email}</p>
              )}
            </div>
          </div>

          {/* Password Change Section */}
          <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-[var(--color-muted)]">
                <Lock className="size-3.5" />
                <span>Security & Password</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowPasswordFields(!showPasswordFields);
                  setCurrentPassword("");
                  setNewPassword("");
                  setConfirmPassword("");
                }}
                className="text-xs font-medium text-[var(--color-accent)] underline-offset-4 hover:underline cursor-pointer"
              >
                {showPasswordFields ? "Cancel" : "Change password"}
              </button>
            </div>

            {showPasswordFields && (
              <div className="space-y-3 pt-1">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="client-currentPassword"
                    className="text-xs font-medium text-[var(--color-text)]"
                  >
                    Current Password
                  </Label>
                  <Input
                    id="client-currentPassword"
                    type="password"
                    placeholder="Enter current password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    disabled={isSubmitting}
                    className="bg-[var(--color-surface)] text-xs"
                  />
                  {fieldErrors.currentPassword && (
                    <p className="text-[11px] text-[var(--color-conflict)]">
                      {fieldErrors.currentPassword}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="client-newPassword"
                      className="text-xs font-medium text-[var(--color-text)]"
                    >
                      New Password (min 8 chars)
                    </Label>
                    <Input
                      id="client-newPassword"
                      type="password"
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      disabled={isSubmitting}
                      className="bg-[var(--color-surface)] text-xs"
                    />
                    {fieldErrors.newPassword && (
                      <p className="text-[11px] text-[var(--color-conflict)]">
                        {fieldErrors.newPassword}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label
                      htmlFor="client-confirmPassword"
                      className="text-xs font-medium text-[var(--color-text)]"
                    >
                      Confirm New Password
                    </Label>
                    <Input
                      id="client-confirmPassword"
                      type="password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={isSubmitting}
                      className="bg-[var(--color-surface)] text-xs"
                    />
                    {fieldErrors.confirmPassword && (
                      <p className="text-[11px] text-[var(--color-conflict)]">
                        {fieldErrors.confirmPassword}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>

        <CardFooter className="pt-2 border-t border-[var(--color-border)] flex justify-end">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-[var(--color-accent)] text-[var(--color-accent-fg)] hover:bg-[var(--color-accent-hover)] text-xs font-medium h-9 cursor-pointer"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="size-3.5 animate-spin" />
                <span>Saving changes...</span>
              </span>
            ) : (
              <span>Save changes</span>
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

