import * as React from "react";
import { requireRolePage } from "@/lib/auth-helpers";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logoutAction } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, LogOut, User, School, BookOpen } from "lucide-react";
import StudentLoading from "./loading";

async function StudentContent() {
  const user = await requireRolePage(Role.STUDENT);

  const profile = await prisma.studentProfile.findUnique({
    where: { userId: user.id },
  });

  return (
    <div className="min-h-screen bg-[var(--color-bg)] px-4 py-8 md:py-12">
      <div className="mx-auto max-w-screen-md space-y-6">
        {/* Top bar with Role Badge and Logout */}
        <header className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-md bg-[var(--color-accent)] text-[var(--color-accent-fg)]">
              <GraduationCap className="size-4" />
            </span>
            <div>
              <span className="text-xs font-medium text-[var(--color-muted)] uppercase tracking-wide">
                Student VA-Hub
              </span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-[var(--color-text)]">
                  Student Portal
                </span>
                <Badge variant="secondary" className="text-xs">
                  Student VA
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
              <div className="flex size-7 items-center justify-center rounded-md bg-[var(--color-class-bg)] text-[var(--color-class)]">
                <User className="size-4" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold text-[var(--color-text)]">
                  {user.name ?? "Student"}
                </CardTitle>
                <CardDescription className="text-xs text-[var(--color-muted)]">
                  {user.email}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] p-4">
              <span className="text-xs font-medium text-[var(--color-muted)] uppercase tracking-wide block mb-3">
                Academic Profile
              </span>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="flex items-start gap-2">
                  <School className="size-4 text-[var(--color-muted)] shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs text-[var(--color-muted)] block">School</span>
                    <span className="text-sm font-medium text-[var(--color-text)]">
                      {profile?.school ?? "Not specified"}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <BookOpen className="size-4 text-[var(--color-muted)] shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs text-[var(--color-muted)] block">Course</span>
                    <span className="text-sm font-medium text-[var(--color-text)]">
                      {profile?.course ?? "Not specified"}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-xs text-[var(--color-muted)] block">Year Level</span>
                  <span className="text-sm font-medium text-[var(--color-text)]">
                    {profile?.year ? `Year ${profile.year}` : "Not specified"}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] p-4">
              <span className="text-xs font-medium text-[var(--color-muted)] uppercase tracking-wide block mb-1">
                Account Status
              </span>
              <p className="text-xs text-[var(--color-muted)]">
                Role verified: <span className="font-medium text-[var(--color-text)]">STUDENT</span>.
                Full student navigation, class schedule, and availability features will be connected in step 3.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function StudentPage() {
  return (
    <React.Suspense fallback={<StudentLoading />}>
      <StudentContent />
    </React.Suspense>
  );
}
