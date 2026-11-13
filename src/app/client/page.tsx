import * as React from "react";
import { requireRolePage } from "@/lib/auth-helpers";
import { Role } from "@prisma/client";
import { getClientDashboardData } from "@/lib/services/dashboard-service";
import { ClientDashboardView } from "@/components/client/dashboard/client-dashboard-view";
import ClientLoading from "./loading";

async function ClientDashboardContent() {
  const user = await requireRolePage(Role.CLIENT);
  const data = await getClientDashboardData(user.id);

  return <ClientDashboardView data={data} clientName={user.name ?? "Client"} />;
}

export default function ClientPage() {
  return (
    <React.Suspense fallback={<ClientLoading />}>
      <ClientDashboardContent />
    </React.Suspense>
  );
}
