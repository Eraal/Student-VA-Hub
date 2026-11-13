"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { StudentScheduleData } from "@/lib/services/schedule-service";
import { ClassesTab } from "./classes-tab";
import { AvailabilityTab } from "./availability-tab";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { CalendarDays, ShieldCheck, Plus } from "lucide-react";

interface ScheduleViewProps {
  initialData: StudentScheduleData;
}

export function ScheduleView({ initialData }: ScheduleViewProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = React.useState<"classes" | "availability">("classes");
  const [isAddClassOpen, setIsAddClassOpen] = React.useState(false);
  const [prefillAddClass, setPrefillAddClass] = React.useState<
    { dayOfWeek?: number; startTime?: string } | undefined
  >(undefined);

  const [isAddWindowOpen, setIsAddWindowOpen] = React.useState(false);
  const [prefillAddWindow, setPrefillAddWindow] = React.useState<
    { dayOfWeek?: number; startTime?: string } | undefined
  >(undefined);

  const handleRefresh = () => {
    router.refresh();
  };

  const totalClasses = initialData.classes.length;
  const totalWindows = initialData.availabilities.length;

  const handleHeaderAddClass = () => {
    setActiveTab("classes");
    setPrefillAddClass(undefined);
    setIsAddClassOpen(true);
  };

  const handleHeaderAddWindow = () => {
    setActiveTab("availability");
    setPrefillAddWindow(undefined);
    setIsAddWindowOpen(true);
  };

  return (
    <PageContainer>
      {/* Page Header */}
      <PageHeader
        title="Schedule"
        subtitle="Your classes are blocked off, so clients can't assign tasks during them."
        actions={
          activeTab === "classes" ? (
            <Button
              type="button"
              data-testid="schedule-add-class"
              onClick={handleHeaderAddClass}
              className="bg-[#0F172A] text-white font-bold border-[1.5px] border-[#0F172A] shadow-[2px_2px_0px_0px_#0F172A] hover:bg-slate-800 hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_#0F172A] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none min-h-[40px] px-4 rounded-lg text-xs gap-1.5 cursor-pointer"
            >
              <Plus className="size-4" />
              <span>Add class</span>
            </Button>
          ) : (
            <Button
              type="button"
              data-testid="availability-add-window"
              onClick={handleHeaderAddWindow}
              className="bg-[#0F172A] text-white font-bold border-[1.5px] border-[#0F172A] shadow-[2px_2px_0px_0px_#0F172A] hover:bg-slate-800 hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_#0F172A] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none min-h-[40px] px-4 rounded-lg text-xs gap-1.5 cursor-pointer"
            >
              <Plus className="size-4" />
              <span>Add free window</span>
            </Button>
          )
        }
      />

      {/* Tabs navigation: Classes & Availability */}
      <div className="flex items-center gap-1.5 rounded-xl border-[1.5px] border-[#0F172A] bg-[#FAF7F2] p-1 shadow-[2px_2px_0px_0px_#0F172A] w-fit">
        <button
          type="button"
          onClick={() => setActiveTab("classes")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
            activeTab === "classes"
              ? "bg-[#0F172A] text-white shadow-[1px_1px_0px_0px_#0F172A]"
              : "text-slate-600 hover:text-[#0F172A] hover:bg-white/60"
          }`}
        >
          <CalendarDays className="size-3.5" />
          <span>Classes</span>
          <span
            className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
              activeTab === "classes"
                ? "bg-white/20 text-white"
                : "bg-white border border-[#0F172A]/20 text-slate-700"
            }`}
          >
            {totalClasses}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("availability")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
            activeTab === "availability"
              ? "bg-[#0F172A] text-white shadow-[1px_1px_0px_0px_#0F172A]"
              : "text-slate-600 hover:text-[#0F172A] hover:bg-white/60"
          }`}
        >
          <ShieldCheck className="size-3.5" />
          <span>Availability</span>
          <span
            className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
              activeTab === "availability"
                ? "bg-white/20 text-white"
                : "bg-white border border-[#0F172A]/20 text-slate-700"
            }`}
          >
            {totalWindows}
          </span>
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === "classes" ? (
        <ClassesTab
          initialClasses={initialData.classes}
          onRefresh={handleRefresh}
          isAddClassOpen={isAddClassOpen}
          setIsAddClassOpen={setIsAddClassOpen}
          prefillAdd={prefillAddClass}
          setPrefillAdd={setPrefillAddClass}
        />
      ) : (
        <AvailabilityTab
          initialAvailabilities={initialData.availabilities}
          classes={initialData.classes}
          initialMaxHours={initialData.maxHoursPerDay}
          initialBlockedDates={initialData.blockedDates}
          onRefresh={handleRefresh}
          isAddWindowOpen={isAddWindowOpen}
          setIsAddWindowOpen={setIsAddWindowOpen}
          prefillAddWindow={prefillAddWindow}
          setPrefillAddWindow={setPrefillAddWindow}
        />
      )}
    </PageContainer>
  );
}
