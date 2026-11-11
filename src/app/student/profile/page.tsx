import * as React from "react";
import { requireRolePage } from "@/lib/auth-helpers";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getStudentInviteDetails } from "@/lib/services/invite-service";
import { StudentProfileForm } from "@/components/student/student-profile-form";
import { InviteCodeCard } from "@/components/student/invite-code-card";

async function StudentProfileContent() {
  const user = await requireRolePage(Role.STUDENT);

  const profile = await prisma.studentProfile.findUnique({
    where: { userId: user.id },
  });

  const inviteDetails = await getStudentInviteDetails(user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-[var(--color-text)]">
          Profile & Settings
        </h1>
        <p className="text-xs text-[var(--color-muted)]">
          I-manage ang iyong personal details, academic information, at invite code.
        </p>
      </div>

      {/* Invite Code & Linked Client Section */}
      <InviteCodeCard
        initialCode={inviteDetails.currentCode}
        initialLinkedClient={inviteDetails.linkedClient}
        initialLink={inviteDetails.link}
      />

      {/* Student Profile & Password Form */}
      <StudentProfileForm
        initialData={{
          id: user.id,
          name: user.name ?? "",
          email: user.email ?? "",
          school: profile?.school ?? "",
          course: profile?.course ?? "",
          year: profile?.year ?? 1,
          maxHoursPerDay: profile?.maxHoursPerDay ?? 4,
        }}
      />
    </div>
  );
}

export default function StudentProfilePage() {
  return (
    <React.Suspense
      fallback={
        <div className="space-y-4 animate-pulse">
          <div className="h-6 w-44 rounded bg-[var(--color-border)]" />
          <div className="h-52 rounded-md bg-[var(--color-surface)]" />
          <div className="h-64 rounded-md bg-[var(--color-surface)]" />
        </div>
      }
    >
      <StudentProfileContent />
    </React.Suspense>
  );
}

