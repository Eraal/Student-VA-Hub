"use client";

import * as React from "react";
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
import { toast } from "@/components/ui/toast";
import { Eye, EyeOff, Loader2, AlertCircle, KeyRound } from "lucide-react";
import { toUserErrorMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";

interface PasswordCardProps {
  onUpdatePassword: (
    currentPassword: string,
    newPassword: string,
    confirmPassword: string
  ) => Promise<{
    success: boolean;
    error?: string;
    fieldErrors?: Record<string, string>;
  }>;
  defaultExpanded?: boolean;
}

export function PasswordCard({
  onUpdatePassword,
  defaultExpanded = false,
}: PasswordCardProps) {
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded);

  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");

  const [showCurrent, setShowCurrent] = React.useState(false);
  const [showNew, setShowNew] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [generalError, setGeneralError] = React.useState<string | null>(null);

  // Real-time mismatch check
  const passwordsMismatch =
    confirmPassword.length > 0 &&
    newPassword.length > 0 &&
    newPassword !== confirmPassword;

  const resetForm = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setShowCurrent(false);
    setShowNew(false);
    setShowConfirm(false);
    setFieldErrors({});
    setGeneralError(null);
  };

  const handleCancel = () => {
    resetForm();
    setIsExpanded(false);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setGeneralError(null);
    setFieldErrors({});

    const errors: Record<string, string> = {};
    if (!currentPassword) {
      errors.currentPassword = "Current password is required";
    }
    if (!newPassword) {
      errors.newPassword = "New password is required";
    } else if (newPassword.length < 8) {
      errors.newPassword = "New password must be at least 8 characters";
    }
    if (!confirmPassword) {
      errors.confirmPassword = "Confirm password is required";
    } else if (newPassword !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await onUpdatePassword(
        currentPassword,
        newPassword,
        confirmPassword
      );

      if (!res.success) {
        if (res.fieldErrors) {
          setFieldErrors(res.fieldErrors);
        }
        setGeneralError(
          toUserErrorMessage(res.error ?? "Failed to update password.")
        );
        setIsSubmitting(false);
        return;
      }

      toast.success("Password updated");
      resetForm();
      setIsSubmitting(false);
      setIsExpanded(false);
    } catch (err) {
      setGeneralError(toUserErrorMessage(err));
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border-[1.5px] border-[#0F172A] bg-white shadow-[3px_3px_0px_0px_#0F172A] rounded-2xl">
      <CardHeader className="px-5 py-4 sm:px-6 sm:py-4 border-b border-[#E5DFD5]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="font-display text-lg font-bold text-[#0F172A]">
              Password
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm text-slate-600">
              Use at least 8 characters.
            </CardDescription>
          </div>
          {!isExpanded && (
            <Button
              type="button"
              variant="outline"
              aria-expanded={isExpanded}
              onClick={() => setIsExpanded(true)}
              className="h-9 px-3 text-xs sm:text-sm font-bold border-[1.5px] border-[#0F172A] text-[#0F172A] bg-white hover:bg-[#FAF7F2] shadow-[2px_2px_0px_0px_#0F172A]"
            >
              <KeyRound className="size-3.5" />
              <span>Change password</span>
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-5 sm:p-6">
        {!isExpanded && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-sm text-slate-600">
            <span>Keep your account safe by using a strong, unique password.</span>
            <Button
              type="button"
              variant="outline"
              aria-expanded={isExpanded}
              onClick={() => setIsExpanded(true)}
              className="sm:hidden w-full font-bold h-10 border-[1.5px] border-[#0F172A] text-[#0F172A] bg-white hover:bg-[#FAF7F2] shadow-[2px_2px_0px_0px_#0F172A]"
            >
              <KeyRound className="size-4" />
              <span>Change password</span>
            </Button>
          </div>
        )}

        <form
          data-testid="password-form"
          onSubmit={handleSubmit}
          className={cn("space-y-4 sm:space-y-5", !isExpanded && "hidden")}
        >
          {generalError && (
            <div
              role="alert"
              aria-live="polite"
              className="flex items-start gap-2.5 rounded-lg border-[1.5px] border-[#DC2626] bg-[#FEF2F2] p-3 text-xs sm:text-sm text-[#991B1B]"
            >
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <span>{generalError}</span>
            </div>
          )}

          {/* Current Password Field */}
          <div className="space-y-1.5 w-full">
            <Label
              htmlFor="currentPassword"
              className="text-xs sm:text-sm font-bold text-[#0F172A]"
            >
              Current password
            </Label>
            <div className="relative w-full">
              <Input
                id="currentPassword"
                name="currentPassword"
                type={showCurrent ? "text" : "password"}
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => {
                  setCurrentPassword(e.target.value);
                  if (fieldErrors.currentPassword) {
                    setFieldErrors((prev) => ({ ...prev, currentPassword: "" }));
                  }
                }}
                disabled={isSubmitting}
                className="w-full pr-10"
                aria-invalid={!!fieldErrors.currentPassword}
              />
              <button
                type="button"
                aria-label={
                  showCurrent ? "Hide current password" : "Show current password"
                }
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-[#0F172A] p-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F172A] rounded"
              >
                {showCurrent ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>
            {fieldErrors.currentPassword && (
              <p
                role="alert"
                aria-live="polite"
                className="text-xs text-[#DC2626] font-medium"
              >
                {fieldErrors.currentPassword}
              </p>
            )}
          </div>

          {/* New Password Field */}
          <div className="space-y-1.5 w-full">
            <Label
              htmlFor="newPassword"
              className="text-xs sm:text-sm font-bold text-[#0F172A]"
            >
              New password
            </Label>
            <div className="relative w-full">
              <Input
                id="newPassword"
                name="newPassword"
                type={showNew ? "text" : "password"}
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  if (fieldErrors.newPassword) {
                    setFieldErrors((prev) => ({ ...prev, newPassword: "" }));
                  }
                }}
                disabled={isSubmitting}
                className="w-full pr-10"
                aria-invalid={!!fieldErrors.newPassword}
              />
              <button
                type="button"
                aria-label={
                  showNew ? "Hide new password" : "Show new password"
                }
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-[#0F172A] p-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F172A] rounded"
              >
                {showNew ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>
            {fieldErrors.newPassword && (
              <p
                role="alert"
                aria-live="polite"
                className="text-xs text-[#DC2626] font-medium"
              >
                {fieldErrors.newPassword}
              </p>
            )}
          </div>

          {/* Confirm New Password Field */}
          <div className="space-y-1.5 w-full">
            <Label
              htmlFor="confirmPassword"
              className="text-xs sm:text-sm font-bold text-[#0F172A]"
            >
              Confirm new password
            </Label>
            <div className="relative w-full">
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirm ? "text" : "password"}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (fieldErrors.confirmPassword) {
                    setFieldErrors((prev) => ({ ...prev, confirmPassword: "" }));
                  }
                }}
                disabled={isSubmitting}
                className="w-full pr-10"
                aria-invalid={!!fieldErrors.confirmPassword || passwordsMismatch}
              />
              <button
                type="button"
                aria-label={
                  showConfirm ? "Hide confirm password" : "Show confirm password"
                }
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-[#0F172A] p-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F172A] rounded"
              >
                {showConfirm ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>
            {passwordsMismatch && (
              <p
                role="alert"
                aria-live="polite"
                className="text-xs text-[#DC2626] font-medium"
              >
                Passwords do not match
              </p>
            )}
            {fieldErrors.confirmPassword && !passwordsMismatch && (
              <p
                role="alert"
                aria-live="polite"
                className="text-xs text-[#DC2626] font-medium"
              >
                {fieldErrors.confirmPassword}
              </p>
            )}
          </div>

          <div className="pt-2 border-t border-[#E5DFD5] flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={handleCancel}
              className="w-full sm:w-auto min-h-[40px] font-bold"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              data-testid="password-submit"
              disabled={
                isSubmitting ||
                !currentPassword ||
                !newPassword ||
                !confirmPassword ||
                passwordsMismatch
              }
              className="w-full sm:w-auto min-h-[40px] font-bold disabled:opacity-40"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" />
                  <span>Updating password...</span>
                </span>
              ) : (
                <span>Update password</span>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
