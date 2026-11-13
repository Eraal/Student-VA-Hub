import * as React from "react";
import { requireRolePage } from "@/lib/auth-helpers";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getStudentInviteDetails } from "@/lib/services/invite-service";
import { StudentProfileView } from "@/components/student/student-profile-view";
import { ProfileSkeleton } from "@/components/profile/profile-skeleton";

async function StudentProfileContent() {
  const user = await requireRolePage(Role.STUDENT);

  const profile = await prisma.studentProfile.findUnique({
    where: { userId: user.id },
  });

  const inviteDetails = await getStudentInviteDetails(user.id);

  return (
    <StudentProfileView
      initialUser={{
        id: user.id,
        name: user.name ?? "",
        email: user.email ?? "",
        role: Role.STUDENT,
      }}
      initialProfile={{
        school: profile?.school ?? "",
        course: profile?.course ?? "",
        year: profile?.year ?? 1,
        maxHoursPerDay: profile?.maxHoursPerDay ?? 4,
      }}
      inviteDetails={{
        currentCode: inviteDetails.currentCode,
        linkedClient: inviteDetails.linkedClient,
        link: inviteDetails.link,
      }}
    />
  );
}

export default function StudentProfilePage() {
  return (
    <React.Suspense fallback={<ProfileSkeleton />}>
      <StudentProfileContent />
    </React.Suspense>
  );
}
