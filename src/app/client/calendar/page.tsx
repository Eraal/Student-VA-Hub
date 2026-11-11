import * as React from "react";
import { requireRolePage } from "@/lib/auth-helpers";
import { Role } from "@prisma/client";
import { getClientCalendarData } from "@/lib/services/calendar-service";
import { ClientCalendarView } from "@/components/client/calendar/client-calendar-view";

interface ClientCalendarPageProps {
  searchParams: Promise<{ date?: string }>;
}

async function CalendarContent({ searchParams }: ClientCalendarPageProps) {
  const user = await requireRolePage(Role.CLIENT);
  const resolvedParams = await searchParams;
  const initialData = await getClientCalendarData(user.id, resolvedParams.date);

  return (
    <ClientCalendarView
      initialData={initialData}
      initialAnchorDate={resolvedParams.date}
    />
  );
}

export default function ClientCalendarPage(props: ClientCalendarPageProps) {
  return (
    <React.Suspense
      fallback={
        <div className="space-y-4 animate-pulse">
          <div className="h-6 w-48 rounded bg-[var(--color-border)]" />
          <div className="h-64 rounded-md bg-[var(--color-surface)]" />
        </div>
      }
    >
      <CalendarContent {...props} />
    </React.Suspense>
  );
}
