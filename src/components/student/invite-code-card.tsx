"use client";

import * as React from "react";
import { generateStudentInviteCodeAction } from "@/lib/actions/invite-code";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Key,
  Copy,
  Check,
  RefreshCw,
  AlertCircle,
  Briefcase,
  Users,
} from "lucide-react";

interface InviteCodeCardProps {
  initialCode: {
    id: string;
    code: string;
    usedByClientId: string | null;
    createdAt: Date | string;
    usedByClient?: {
      id: string;
      name: string;
      email: string;
    } | null;
  } | null;
  initialLinkedClient: {
    id: string;
    name: string;
    email: string;
  } | null;
  initialLink: {
    id: string;
    hourlyRate: number;
    status: string;
  } | null;
}

export function InviteCodeCard({
  initialCode,
  initialLinkedClient,
  initialLink,
}: InviteCodeCardProps) {
  const [currentCode, setCurrentCode] = React.useState(initialCode);
  const [linkedClient] = React.useState(initialLinkedClient);
  const [link] = React.useState(initialLink);

  const [copied, setCopied] = React.useState(false);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const handleCopy = async () => {
    if (!currentCode?.code) return;
    try {
      await navigator.clipboard.writeText(currentCode.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy code:", err);
    }
  };

  const handleGenerate = async () => {
    setErrorMessage(null);
    setIsGenerating(true);

    try {
      const res = await generateStudentInviteCodeAction();
      if (!res.success || !res.data) {
        setErrorMessage(res.error ?? "Failed to generate invite code.");
        setIsGenerating(false);
        return;
      }

      setCurrentCode({
        id: "new",
        code: res.data.code,
        usedByClientId: null,
        createdAt: new Date(),
        usedByClient: null,
      });
      setIsGenerating(false);
    } catch (err) {
      console.error(err);
      setErrorMessage("An unexpected error occurred. Please try again.");
      setIsGenerating(false);
    }
  };

  const isUsed = !!currentCode?.usedByClientId;

  return (
    <div className="space-y-4">
      {/* Linked Client Card */}
      <Card className="border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-md bg-[var(--color-accent)] text-[var(--color-accent-fg)]">
              <Briefcase className="size-4" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold text-[var(--color-text)]">
                Linked Client
              </CardTitle>
              <CardDescription className="text-xs text-[var(--color-muted)]">
                Your assigned client and agreed hourly rate
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {linkedClient && link ? (
            <div className="flex items-center justify-between rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] p-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-[var(--color-text)]">
                    {linkedClient.name}
                  </span>
                  <Badge variant="secondary" className="text-[10px]">
                    {link.status}
                  </Badge>
                </div>
                <span className="text-xs text-[var(--color-muted)] block">
                  {linkedClient.email}
                </span>
              </div>

              <div className="text-right">
                <span className="text-xs text-[var(--color-muted)] block">Rate</span>
                <span className="text-sm font-semibold text-[var(--color-text)]">
                  ₱{link.hourlyRate}/hr
                </span>
              </div>
            </div>
          ) : (
            <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] p-4 text-left space-y-1">
              <div className="flex items-center gap-2 text-xs font-medium text-[var(--color-text)]">
                <Users className="size-3.5 text-[var(--color-muted)]" />
                <span>Wala pang naka-link na client</span>
              </div>
              <p className="text-xs text-[var(--color-muted)]">
                Ibahagi ang iyong active invite code sa ibaba sa iyong client para ma-link ang kanilang account.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invite Code Generator Card */}
      <Card className="border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-md bg-[var(--color-accent)] text-[var(--color-accent-fg)]">
                <Key className="size-4" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold text-[var(--color-text)]">
                  Invite Code
                </CardTitle>
                <CardDescription className="text-xs text-[var(--color-muted)]">
                  Share this 8-character code with your client
                </CardDescription>
              </div>
            </div>

            {isUsed ? (
              <Badge
                variant="outline"
                className="text-[10px] text-[var(--color-muted)] border-[var(--color-border)]"
              >
                Used
              </Badge>
            ) : (
              <Badge
                variant="secondary"
                className="text-[10px] text-[var(--color-work)] bg-[var(--color-work-bg)] border-[var(--color-work)]"
              >
                Ready to share
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pt-0">
          {errorMessage && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-md border border-[var(--color-conflict)] bg-[var(--color-conflict-bg)] p-3 text-xs text-[var(--color-conflict)]"
            >
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Code Display Box */}
          <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-muted)] block mb-1">
                {isUsed ? "Previous Code (Used)" : "Active Code"}
              </span>
              <span className="font-mono text-xl font-bold tracking-widest text-[var(--color-text)] select-all">
                {currentCode?.code ?? "No code generated"}
              </span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopy}
                disabled={!currentCode?.code || isUsed}
                className="gap-1.5 text-xs font-medium cursor-pointer w-full sm:w-auto"
              >
                {copied ? (
                  <>
                    <Check className="size-3.5 text-[var(--color-work)]" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="size-3.5" />
                    <span>Copy code</span>
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleGenerate}
                disabled={isGenerating}
                className="gap-1.5 text-xs font-medium cursor-pointer w-full sm:w-auto"
              >
                <RefreshCw
                  className={`size-3.5 ${isGenerating ? "animate-spin" : ""}`}
                />
                <span>Generate new code</span>
              </Button>
            </div>
          </div>

          <p className="text-[11px] text-[var(--color-muted)] leading-relaxed">
            {isUsed
              ? "This code has already been used to link your client and cannot be reused. Generate a new code if you need to provide one to another client."
              : "Each code is valid for one-time linking. Once your client enters this code, it will be marked as used automatically."}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
