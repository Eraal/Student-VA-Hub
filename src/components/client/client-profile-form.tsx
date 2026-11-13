"use client";

import * as React from "react";
import { updateClientProfileSchema } from "@/lib/validations/profile";
import { updateClientProfileAction } from "@/lib/actions/profile";
import { toUserErrorMessage, formatZodFieldErrors } from "@/lib/errors";
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
import { Loader2, AlertCircle } from "lucide-react";

interface ClientProfileFormProps {
  initialData: {
    id: string;
    name: string;
    email: string;
  };
  onProfileSaved?: (updated: { name: string; email: string }) => void;
}

export function ClientProfileForm({
  initialData,
  onProfileSaved,
}: ClientProfileFormProps) {
  const [savedData, setSavedData] = React.useState(initialData);

  const [name, setName] = React.useState(initialData.name);
  const [email, setEmail] = React.useState(initialData.email);

  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Compute dirty state
  const isDirty = name !== savedData.name || email !== savedData.email;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setServerError(null);
    setFieldErrors({});

    const formData = {
      name: name.trim(),
      email: email.trim(),
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    };

    const parsed = updateClientProfileSchema.safeParse(formData);
    if (!parsed.success) {
      setFieldErrors(formatZodFieldErrors(parsed.error));
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await updateClientProfileAction(formData);

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
          Your account contact information.
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

          {/* Full Name */}
          <div className="space-y-1.5 w-full">
            <Label
              htmlFor="client-name"
              className="text-xs sm:text-sm font-bold text-[#0F172A]"
            >
              Full name
            </Label>
            <Input
              id="client-name"
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
              htmlFor="client-email"
              className="text-xs sm:text-sm font-bold text-[#0F172A]"
            >
              Email
            </Label>
            <Input
              id="client-email"
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
