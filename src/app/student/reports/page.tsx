import * as React from "react";
import { requireRolePage } from "@/lib/auth-helpers";
import { Role } from "@prisma/client";
import { getStudentReportData } from "@/lib/services/report-service";
import { ReportView } from "@/components/reports/report-view";
import type { ReportRangePreset } from "@/lib/reports";
import StudentReportsLoading from "./loading";

interface StudentReportsPageProps {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}

async function StudentReportsContent({ searchParams }: StudentReportsPageProps) {
  const user = await requireRolePage(Role.STUDENT);
  const data = await getStudentReportData(user.id);
  const resolved = await searchParams;

  const validPreset: ReportRangePreset =
    resolved.range === "this-week" ||
    resolved.range === "this-month" ||
    resolved.range === "custom"
      ? (resolved.range as ReportRangePreset)
      : "this-month";

  return (
    <ReportView
      initialData={data}
      initialPreset={validPreset}
      initialFrom={resolved.from}
      initialTo={resolved.to}
    />
  );
}

export default function StudentReportsPage(props: StudentReportsPageProps) {
  return (
    <React.Suspense fallback={<StudentReportsLoading />}>
      <StudentReportsContent {...props} />
    </React.Suspense>
  );
}

