import * as React from "react";
import { requireRolePage } from "@/lib/auth-helpers";
import { Role } from "@prisma/client";
import { getClientReportData } from "@/lib/services/report-service";
import { ReportView } from "@/components/reports/report-view";
import type { ReportRangePreset } from "@/lib/reports";
import ClientReportsLoading from "./loading";

interface ClientReportsPageProps {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}

async function ClientReportsContent({ searchParams }: ClientReportsPageProps) {
  const user = await requireRolePage(Role.CLIENT);
  const data = await getClientReportData(user.id);
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

export default function ClientReportsPage(props: ClientReportsPageProps) {
  return (
    <React.Suspense fallback={<ClientReportsLoading />}>
      <ClientReportsContent {...props} />
    </React.Suspense>
  );
}

