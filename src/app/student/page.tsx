import * as React from "react";
import { requireRolePage } from "@/lib/auth-helpers";
import { Role } from "@prisma/client";
import { getStudentDashboardData } from "@/lib/services/dashboard-service";
import { StudentDashboardView } from "@/components/student/dashboard/student-dashboard-view";
import StudentLoading from "./loading";

async function StudentDashboardContent() {
  const user = await requireRolePage(Role.STUDENT);
  const data = await getStudentDashboardData(user.id);

  return <StudentDashboardView data={data} />;
}

export default function StudentPage() {
  return (
    <React.Suspense fallback={<StudentLoading />}>
      <StudentDashboardContent />
    </React.Suspense>
  );
}
