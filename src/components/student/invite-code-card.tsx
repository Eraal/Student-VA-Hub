"use client";

import * as React from "react";
import { generateStudentInviteCodeAction } from "@/lib/actions/invite-code";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { toast } from "@/components/ui/toast";
import { toUserErrorMessage } from "@/lib/errors";
import { Copy, Share2, Loader2, AlertCircle } from "lucide-react";

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

export function formatInviteCode(code: string): string {
  const clean = code.replace(/\s+/g, "");
  if (clean.length === 8) {
    return `${clean.slice(0, 4)} ${clean.slice(4)}`;
  }
  return clean;
}

export function InviteCodeCard({
  initialCode,
  initialLinkedClient,
  initialLink,
}: InviteCodeCardProps) {
  const [currentCode, setCurrentCode] = React.useState(initialCode);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [canShare, setCanShare] = React.useState(false);

  React.useEffect(() => {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      setCanShare(true);
    }
  }, []);

  const hasActiveLink = initialLink && initialLink.status === "ACTIVE";
  const hasUnusedCode = currentCode && !currentCode.usedByClientId;

  const handleCopy = async () => {
    if (!currentCode?.code) return;
    try {
      await navigator.clipboard.writeText(currentCode.code);
      toast.success("Code copied");
    } catch (err) {
      console.error("Failed to copy code:", err);
    }
  };

  const handleShare = async () => {
    if (!currentCode?.code || !navigator.share) return;
    try {
      await navigator.share({
        title: "VAwise Invite Code",
        text: `Link with me on VAwise using my invite code: ${currentCode.code}`,
      });
    } catch {
      // User cancelled share dialog or unsupported, ignore
    }
  };

  const handleGenerate = async () => {
    setErrorMessage(null);
    setIsGenerating(true);

    try {
      const res = await generateStudentInviteCodeAction();
      if (!res.success || !res.data) {
        setErrorMessage(
          toUserErrorMessage(res.error ?? "Failed to generate invite code.")
        );
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
      toast.success("Invite code generated");
      setIsGenerating(false);
    } catch (err) {
      setErrorMessage(toUserErrorMessage(err));
      setIsGenerating(false);
    }
  };

  return (
    <Card className="border-[1.5px] border-[#0F172A] bg-white shadow-[3px_3px_0px_0px_#0F172A] rounded-2xl">
      <CardHeader className="px-5 py-4 sm:px-6 sm:py-4 border-b border-[#E5DFD5]">
        <CardTitle className="font-display text-lg font-bold text-[#0F172A]">
          Invite code
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm text-slate-600">
          Share your code to link with your client.
        </CardDescription>
      </CardHeader>

      <CardContent className="p-5 sm:p-6">
        {errorMessage && (
          <div
            role="alert"
            aria-live="polite"
            className="flex items-start gap-2.5 rounded-lg border-[1.5px] border-[#DC2626] bg-[#FEF2F2] p-3 text-xs sm:text-sm text-[#991B1B] mb-4"
          >
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* State 1: Active link exists */}
        {hasActiveLink ? (
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Your invite code was used. You&apos;re linked with{" "}
            <span className="font-bold text-[#0F172A]">
              {initialLinkedClient?.name ?? "your client"}
            </span>
            .
          </p>
        ) : hasUnusedCode ? (
          /* State 2: No active link and an unused code exists */
          <div className="space-y-4">
            <div
              data-testid="invite-code-value"
              className="font-mono text-2xl sm:text-3xl font-extrabold tracking-widest text-[#0F172A] select-all py-1"
            >
              {formatInviteCode(currentCode.code)}
            </div>

            <p className="text-xs sm:text-sm text-slate-600">
              Your client enters this code to link with you.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
              <Button
                type="button"
                data-testid="invite-code-copy"
                onClick={handleCopy}
                className="w-full sm:w-auto min-h-[40px] font-bold"
              >
                <Copy className="size-4" />
                <span>Copy code</span>
              </Button>

              {canShare && (
                <Button
                  type="button"
                  variant="outline"
                  data-testid="invite-code-share"
                  onClick={handleShare}
                  className="w-full sm:w-auto min-h-[40px] font-bold"
                >
                  <Share2 className="size-4" />
                  <span>Share</span>
                </Button>
              )}
            </div>
          </div>
        ) : (
          /* State 3: No active link and no unused code */
          <div className="space-y-4">
            <p className="text-xs sm:text-sm text-slate-600">
              Generate an 8-character invite code to share with your client.
            </p>

            <Button
              type="button"
              data-testid="invite-code-generate"
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full sm:w-auto min-h-[40px] font-bold disabled:opacity-40"
            >
              {isGenerating ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" />
                  <span>Generating code...</span>
                </span>
              ) : (
                <span>Generate invite code</span>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
