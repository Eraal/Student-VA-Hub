import * as React from "react";
import { requireRolePage } from "@/lib/auth-helpers";
import { Role } from "@prisma/client";
import {
  getClientLinkedStudent,
  serializeClientProfileLink,
} from "@/lib/services/invite-service";
import { ClientProfileView } from "@/components/client/client-profile-view";
import { ProfileSkeleton } from "@/components/profile/profile-skeleton";

async function ClientProfileContent() {
  const user = await requireRolePage(Role.CLIENT);
  const rawLink = await getClientLinkedStudent(user.id);
  const link = serializeClientProfileLink(rawLink);

  return (
    <ClientProfileView
      initialUser={{
        id: user.id,
        name: user.name ?? "",
        email: user.email ?? "",
        role: Role.CLIENT,
      }}
      initialLink={link}
    />
  );
}

export default function ClientProfilePage() {
  return (
    <React.Suspense fallback={<ProfileSkeleton />}>
      <ClientProfileContent />
    </React.Suspense>
  );
}
