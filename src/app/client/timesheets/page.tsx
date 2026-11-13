import * as React from "react";
import { requireRolePage } from "@/lib/auth-helpers";
import { Role } from "@prisma/client";
import { getClientTimesheetData } from "@/lib/services/invoice-service";
import { ClientTimesheetsView } from "@/components/client/timesheets/client-timesheets-view";
import ClientTimesheetsLoading from "./loading";

async function ClientTimesheetsContent() {
  const user = await requireRolePage(Role.CLIENT);
  const data = await getClientTimesheetData(user.id);

  return <ClientTimesheetsView initialData={data} />;
}

export default function ClientTimesheetsPage() {
  return (
    <React.Suspense fallback={<ClientTimesheetsLoading />}>
      <ClientTimesheetsContent />
    </React.Suspense>
  );
}
