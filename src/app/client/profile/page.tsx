import * as React from "react";
import { requireRolePage } from "@/lib/auth-helpers";
import { Role } from "@prisma/client";
import { getClientLinkedStudent } from "@/lib/services/invite-service";
import { ClientProfileForm } from "@/components/client/client-profile-form";
import { LinkStudentCard } from "@/components/client/link-student-card";

async function ClientProfileContent() {
  const user = await requireRolePage(Role.CLIENT);
  const link = await getClientLinkedStudent(user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-[var(--color-text)]">
          Profile & Settings
        </h1>
        <p className="text-xs text-[var(--color-muted)]">
          Pamahalaan ang iyong account, student linking, at agreed hourly rates.
        </p>
      </div>

      {/* Link Student VA Section */}
      <LinkStudentCard initialLink={link} />

      {/* Client Profile Details Form */}
      <ClientProfileForm
        initialData={{
          id: user.id,
          name: user.name ?? "",
          email: user.email ?? "",
        }}
      />
    </div>
  );
}

export default function ClientProfilePage() {
  return (
    <React.Suspense
      fallback={
        <div className="space-y-4 animate-pulse">
          <div className="h-6 w-44 rounded bg-[var(--color-border)]" />
          <div className="h-52 rounded-md bg-[var(--color-surface)]" />
          <div className="h-44 rounded-md bg-[var(--color-surface)]" />
        </div>
      }
    >
      <ClientProfileContent />
    </React.Suspense>
  );
}

