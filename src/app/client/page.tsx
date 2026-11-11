import * as React from "react";
import { requireRolePage } from "@/lib/auth-helpers";
import { Role } from "@prisma/client";
import { logoutAction } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Briefcase, LogOut, User, CheckCircle2 } from "lucide-react";
import ClientLoading from "./loading";

async function ClientContent() {
  const user = await requireRolePage(Role.CLIENT);

  return (
    <div className="min-h-screen bg-[var(--color-bg)] px-4 py-8 md:py-12">
      <div className="mx-auto max-w-screen-md space-y-6">
        {/* Top bar with Role Badge and Logout */}
        <header className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-md bg-[var(--color-accent)] text-[var(--color-accent-fg)]">
              <Briefcase className="size-4" />
            </span>
            <div>
              <span className="text-xs font-medium text-[var(--color-muted)] uppercase tracking-wide">
                Student VA-Hub
              </span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-[var(--color-text)]">
                  Client Portal
                </span>
                <Badge variant="secondary" className="text-xs">
                  Client
                </Badge>
              </div>
            </div>
          </div>

          <form action={logoutAction}>
            <Button
              type="submit"
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs font-medium cursor-pointer"
            >
              <LogOut className="size-3.5" />
              <span>Log out</span>
            </Button>
          </form>
        </header>

        {/* User Welcome Card */}
        <Card className="border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-md bg-[var(--color-accent)] text-[var(--color-accent-fg)]">
                <User className="size-4" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold text-[var(--color-text)]">
                  {user.name ?? "Client"}
                </CardTitle>
                <CardDescription className="text-xs text-[var(--color-muted)]">
                  {user.email}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] p-4 flex items-start gap-3">
              <CheckCircle2 className="size-4 text-[var(--color-work)] shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-medium text-[var(--color-muted)] uppercase tracking-wide block mb-1">
                  Client Account Verified
                </span>
                <p className="text-xs text-[var(--color-muted)]">
                  Authenticated as <span className="font-medium text-[var(--color-text)]">{user.name}</span> with role{" "}
                  <span className="font-medium text-[var(--color-text)]">CLIENT</span>.
                  Linking student VAs, calendar inspection, and task assignment will be connected in steps 3–5.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function ClientPage() {
  return (
    <React.Suspense fallback={<ClientLoading />}>
      <ClientContent />
    </React.Suspense>
  );
}
