"use client";

import * as React from "react";
import { linkStudentAction, updateHourlyRateAction } from "@/lib/actions/client-link";
import { linkStudentSchema, updateHourlyRateSchema } from "@/lib/validations/link";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StatusBadge } from "@/lib/labels";
import { formatDate, formatPeso } from "@/lib/format";
import { toUserErrorMessage } from "@/lib/errors";
import { toast } from "@/components/ui/toast";
import { getInitials } from "@/components/profile/profile-header-card";
import { Loader2, AlertCircle, Edit2 } from "lucide-react";

export interface ClientLinkedStudentData {
  id: string;
  hourlyRate: number;
  status: string;
  createdAt?: Date | string;
  student: {
    id: string;
    name: string;
    email: string;
  };
}

interface LinkStudentCardProps {
  initialLink: ClientLinkedStudentData | null;
  onLinkUpdated?: (link: ClientLinkedStudentData | null) => void;
}

export function LinkStudentCard({
  initialLink,
  onLinkUpdated,
}: LinkStudentCardProps) {
  const [link, setLink] = React.useState<ClientLinkedStudentData | null>(
    initialLink
  );

  // Link Form State (When not linked)
  const [code, setCode] = React.useState("");
  const [hourlyRate, setHourlyRate] = React.useState<number | string>(150);
  const [isLinking, setIsLinking] = React.useState(false);
  const [linkError, setLinkError] = React.useState<string | null>(null);

  // Edit Rate Dialog State (When linked)
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [rateInput, setRateInput] = React.useState<number | string>(
    initialLink?.hourlyRate ?? 150
  );
  const [isSavingRate, setIsSavingRate] = React.useState(false);
  const [dialogError, setDialogError] = React.useState<string | null>(null);

  // Strip pasted spaces and dashes, auto-uppercase, max 8 chars
  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const sanitized = raw.replace(/[\s-]/g, "").toUpperCase().slice(0, 8);
    setCode(sanitized);
    if (linkError) setLinkError(null);
  };

  const handleLinkSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLinkError(null);

    const formData = {
      code: code.trim().toUpperCase(),
      hourlyRate: Number(hourlyRate),
    };

    const parsed = linkStudentSchema.safeParse(formData);
    if (!parsed.success) {
      setLinkError(
        parsed.error.issues[0]?.message ??
          "Please enter a valid 8-character invite code and rate."
      );
      return;
    }

    setIsLinking(true);

    try {
      const res = await linkStudentAction(formData);

      if (!res.success) {
        setLinkError(
          toUserErrorMessage(res.error ?? "Failed to link student.")
        );
        setIsLinking(false);
        return;
      }

      toast.success(
        `Successfully linked with ${res.data?.studentName ?? "student"}!`
      );
      // Reload page to refresh linked student details
      window.location.reload();
    } catch (err) {
      setLinkError(toUserErrorMessage(err));
      setIsLinking(false);
    }
  };

  const handleOpenEditRate = () => {
    if (!link) return;
    setRateInput(link.hourlyRate);
    setDialogError(null);
    setIsEditDialogOpen(true);
  };

  const handleSaveRate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setDialogError(null);

    const numericRate = Number(rateInput);
    const parsed = updateHourlyRateSchema.safeParse({ hourlyRate: numericRate });
    if (!parsed.success) {
      setDialogError(
        parsed.error.issues[0]?.message ?? "Invalid hourly rate."
      );
      return;
    }

    setIsSavingRate(true);

    try {
      const res = await updateHourlyRateAction({ hourlyRate: numericRate });

      if (!res.success || !res.data) {
        setDialogError(
          toUserErrorMessage(res.error ?? "Failed to update hourly rate.")
        );
        setIsSavingRate(false);
        return;
      }

      toast.success(`Rate updated to ${formatPeso(res.data.hourlyRate)}/hr`);
      if (link) {
        const updatedLink = {
          ...link,
          hourlyRate: res.data.hourlyRate,
        };
        setLink(updatedLink);
        onLinkUpdated?.(updatedLink);
      }
      setIsSavingRate(false);
      setIsEditDialogOpen(false);
    } catch (err) {
      setDialogError(toUserErrorMessage(err));
      setIsSavingRate(false);
    }
  };

  const numericNewRate = Number(rateInput);
  const isValidNewRate = !isNaN(numericNewRate) && numericNewRate > 0;

  return (
    <>
      {link ? (
        /* ===================================================================
           STATE A: Student is linked -> Linked Student Card
           =================================================================== */
        <Card
          data-testid="linked-card"
          className="border-[1.5px] border-[#0F172A] bg-white shadow-[3px_3px_0px_0px_#0F172A] rounded-2xl"
        >
          <CardHeader className="px-5 py-4 sm:px-6 sm:py-4 border-b border-[#E5DFD5]">
            <div className="flex items-center justify-between gap-2">
              <div>
                <CardTitle className="font-display text-lg font-bold text-[#0F172A]">
                  Linked student
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm text-slate-600">
                  Your student VA and agreed hourly rate.
                </CardDescription>
              </div>
              <StatusBadge status={link.status} />
            </div>
          </CardHeader>

          <CardContent className="p-5 sm:p-6 space-y-5">
            {/* Student identity header */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <Avatar className="size-11 sm:size-12 shrink-0 border-[1.5px] border-[#0F172A] bg-[#0F172A]">
                  <AvatarFallback className="text-sm sm:text-base font-display font-bold text-white bg-[#0F172A]">
                    {getInitials(link.student.name)}
                  </AvatarFallback>
                </Avatar>

                <div className="min-w-0 space-y-0.5">
                  <p className="font-display text-base font-bold text-[#0F172A] truncate">
                    {link.student.name}
                  </p>
                  <p className="text-xs text-slate-600 truncate">
                    {link.student.email}
                  </p>
                </div>
              </div>

              {/* Rate pill & Edit button */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="inline-flex items-center rounded-full border-[1.5px] border-[#0F172A] bg-white px-3 py-1 text-xs font-bold font-display tabular-nums text-[#0F172A] shadow-[1.5px_1.5px_0px_0px_#0F172A]">
                  {`${formatPeso(link.hourlyRate)}/hr`}
                </span>

                <Button
                  type="button"
                  variant="outline"
                  data-testid="edit-rate-open"
                  onClick={handleOpenEditRate}
                  className="h-8 min-h-[32px] px-2.5 text-xs font-bold"
                >
                  <Edit2 className="size-3" />
                  <span>Edit rate</span>
                </Button>
              </div>
            </div>

            {link.createdAt && (
              <p className="text-xs text-slate-500 pt-3 border-t border-[#E5DFD5]">
                Linked since {formatDate(link.createdAt)}
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        /* ===================================================================
           STATE B: No student linked -> Link Student Card
           =================================================================== */
        <Card className="border-[1.5px] border-[#0F172A] bg-white shadow-[3px_3px_0px_0px_#0F172A] rounded-2xl">
          <CardHeader className="px-5 py-4 sm:px-6 sm:py-4 border-b border-[#E5DFD5]">
            <CardTitle className="font-display text-lg font-bold text-[#0F172A]">
              Link student
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm text-slate-600">
              Enter your student&apos;s 8-character invite code and agree on an hourly rate.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-5 sm:p-6">
            <form onSubmit={handleLinkSubmit} className="space-y-4 sm:space-y-5">
              {linkError && (
                <div
                  role="alert"
                  aria-live="polite"
                  className="flex items-start gap-2.5 rounded-lg border-[1.5px] border-[#DC2626] bg-[#FEF2F2] p-3 text-xs sm:text-sm text-[#991B1B]"
                >
                  <AlertCircle className="size-4 shrink-0 mt-0.5" />
                  <span>{linkError}</span>
                </div>
              )}

              {/* Invite Code Input */}
              <div className="space-y-1.5 w-full">
                <Label
                  htmlFor="invite-code"
                  className="text-xs sm:text-sm font-bold text-[#0F172A]"
                >
                  Invite code
                </Label>
                <Input
                  id="invite-code"
                  data-testid="link-student-code"
                  placeholder="e.g. QDFCYKAP"
                  maxLength={8}
                  value={code}
                  onChange={handleCodeChange}
                  disabled={isLinking}
                  className="w-full font-mono uppercase tracking-widest text-sm"
                />
                <p className="text-xs text-slate-500">
                  Ask your Student VA for their active 8-character code.
                </p>
              </div>

              {/* Hourly Rate Input with ₱ prefix */}
              <div className="space-y-1.5 w-full">
                <Label
                  htmlFor="hourly-rate"
                  className="text-xs sm:text-sm font-bold text-[#0F172A]"
                >
                  Hourly rate (PHP)
                </Label>
                <div className="relative w-full">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-[#0F172A] text-sm select-none font-display">
                    ₱
                  </span>
                  <Input
                    id="hourly-rate"
                    data-testid="link-student-rate"
                    type="number"
                    min={1}
                    step={1}
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(e.target.value)}
                    disabled={isLinking}
                    className="w-full pl-8 text-sm font-display tabular-nums"
                  />
                </div>
                <p className="text-xs text-slate-500">
                  Agreed rate per hour (e.g. 150 for ₱150.00/hr).
                </p>
              </div>

              <div className="pt-2 border-t border-[#E5DFD5] flex justify-end">
                <Button
                  type="submit"
                  data-testid="link-student-submit"
                  disabled={isLinking || code.length !== 8 || !hourlyRate}
                  className="w-full sm:w-auto min-h-[40px] font-bold disabled:opacity-40"
                >
                  {isLinking ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="size-4 animate-spin" />
                      <span>Linking student...</span>
                    </span>
                  ) : (
                    <span>Link student</span>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Edit Hourly Rate Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit hourly rate</DialogTitle>
            <DialogDescription>
              Update the agreed hourly rate for {link?.student.name ?? "your student"}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveRate} className="space-y-4 pt-2">
            {dialogError && (
              <div
                role="alert"
                aria-live="polite"
                className="flex items-start gap-2.5 rounded-lg border-[1.5px] border-[#DC2626] bg-[#FEF2F2] p-3 text-xs sm:text-sm text-[#991B1B]"
              >
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                <span>{dialogError}</span>
              </div>
            )}

            {/* Current rate indicator */}
            {link && (
              <div className="rounded-lg border-[1.5px] border-[#E5DFD5] bg-[#FAF7F2] p-3 text-xs sm:text-sm flex items-center justify-between">
                <span className="text-slate-600 font-medium">Current rate</span>
                <span className="font-display tabular-nums font-bold text-[#0F172A]">
                  {formatPeso(link.hourlyRate)}/hr
                </span>
              </div>
            )}

            {/* Rate Input */}
            <div className="space-y-1.5 w-full">
              <Label
                htmlFor="dialog-hourly-rate"
                className="text-xs sm:text-sm font-bold text-[#0F172A]"
              >
                New hourly rate (PHP)
              </Label>
              <div className="relative w-full">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-[#0F172A] text-sm select-none font-display">
                  ₱
                </span>
                <Input
                  id="dialog-hourly-rate"
                  type="number"
                  min={1}
                  step={1}
                  value={rateInput}
                  onChange={(e) => setRateInput(e.target.value)}
                  disabled={isSavingRate}
                  className="w-full pl-8 text-sm font-display tabular-nums"
                  autoFocus
                />
              </div>
            </div>

            {/* Live Rate Preview */}
            {link && isValidNewRate && (
              <div className="rounded-lg border-[1.5px] border-[#0F172A] bg-white p-3 text-xs sm:text-sm shadow-[1.5px_1.5px_0px_0px_#0F172A] flex items-center justify-between">
                <span className="text-slate-600 font-medium">Rate preview</span>
                <span className="font-display tabular-nums font-bold text-[#0F172A]">
                  {formatPeso(link.hourlyRate)} → {formatPeso(numericNewRate)}/hr
                </span>
              </div>
            )}

            {/* Explanatory Helper Text */}
            <p className="text-xs text-slate-500 leading-relaxed">
              Applies to all unbilled time logs (pending and approved). Existing generated invoices will keep their original rate.
            </p>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                disabled={isSavingRate}
                onClick={() => setIsEditDialogOpen(false)}
                className="w-full sm:w-auto min-h-[40px] font-bold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSavingRate || !rateInput || Number(rateInput) <= 0}
                className="w-full sm:w-auto min-h-[40px] font-bold disabled:opacity-40"
              >
                {isSavingRate ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="size-4 animate-spin" />
                    <span>Saving...</span>
                  </span>
                ) : (
                  <span>Save rate</span>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
