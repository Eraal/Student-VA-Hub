import { prisma } from "../prisma";
import { toManilaTimeComponents } from "../conflict";
import { DAYS_MAP, minutesToTimeString } from "../schedule-utils";
import type { TaskStatus } from "@prisma/client";

export interface CalendarEventItem {
  id: string;
  type: "CLASS" | "AVAILABILITY" | "TASK";
  title: string;
  dayOfWeek: number;
  startMinutes: number;
  endMinutes: number;
  startTimeFormatted: string;
  endTimeFormatted: string;
  dateKey?: string; // YYYY-MM-DD for tasks
  taskId?: string;
  taskStatus?: TaskStatus;
  estHours?: number;
}

export interface CalendarDayData {
  dayOfWeek: number; // 0 = Sun, 1 = Mon ... 6 = Sat
  dayName: string;
  shortDayName: string;
  dateKey: string; // YYYY-MM-DD
  formattedDate: string; // e.g. "Nov 11"
  isToday: boolean;
  isBlocked: boolean;
  blockedReason?: string | null;
  classes: CalendarEventItem[];
  availabilities: CalendarEventItem[];
  tasks: CalendarEventItem[];
}

export interface ClientCalendarData {
  linked: boolean;
  student?: {
    id: string;
    name: string;
    email: string;
    school: string;
    course: string;
    year: number;
    hourlyRate: number;
    maxHoursPerDay: number;
  };
  weekStartKey: string; // YYYY-MM-DD (Monday)
  weekEndKey: string;   // YYYY-MM-DD (Sunday)
  weekLabel: string;    // e.g. "Nov 9 – Nov 15, 2026"
  prevWeekKey: string;  // YYYY-MM-DD of previous Monday
  nextWeekKey: string;  // YYYY-MM-DD of next Monday
  days: CalendarDayData[];
}

const MANILA_TIMEZONE_OFFSET_MS = 8 * 60 * 60 * 1000;

/**
 * Calculates academic week dates (Monday through Sunday) in Asia/Manila.
 */
export function getManilaWeekDates(anchorDateInput: Date | string = new Date()): {
  weekDays: { dateKey: string; dayOfWeek: number; formattedDate: string; manilaDate: Date }[];
  weekStartKey: string;
  weekEndKey: string;
  prevWeekKey: string;
  nextWeekKey: string;
  weekStartUtc: Date;
  weekEndUtc: Date;
  todayKey: string;
} {
  const { manilaDate, dayOfWeek } = toManilaTimeComponents(anchorDateInput);

  // Today in Manila
  const todayComponents = toManilaTimeComponents(new Date());
  const todayKey = todayComponents.dateKey;

  // Determine Monday of this week:
  // In JS, dayOfWeek is 0 for Sunday, 1 for Monday... 6 for Saturday.
  // Academic week runs Monday (1) to Sunday (0).
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  // Compute Monday date in Manila
  const mondayUtcTime = manilaDate.getTime() - daysSinceMonday * 24 * 60 * 60 * 1000;
  const mondayDate = new Date(mondayUtcTime);

  const weekDays: {
    dateKey: string;
    dayOfWeek: number;
    formattedDate: string;
    manilaDate: Date;
  }[] = [];

  const MONTHS_SHORT = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];

  for (let i = 0; i < 7; i++) {
    const currentDayTime = mondayDate.getTime() + i * 24 * 60 * 60 * 1000;
    const currentDay = new Date(currentDayTime);
    const y = currentDay.getUTCFullYear();
    const m = currentDay.getUTCMonth();
    const d = currentDay.getUTCDate();
    const dow = currentDay.getUTCDay();

    const dateKey = `${y}-${(m + 1).toString().padStart(2, "0")}-${d
      .toString()
      .padStart(2, "0")}`;
    const formattedDate = `${MONTHS_SHORT[m]} ${d}`;

    weekDays.push({
      dateKey,
      dayOfWeek: dow,
      formattedDate,
      manilaDate: currentDay,
    });
  }

  const weekStartKey = weekDays[0].dateKey;
  const weekEndKey = weekDays[6].dateKey;

  // Calculate previous Monday and next Monday
  const prevMondayTime = mondayDate.getTime() - 7 * 24 * 60 * 60 * 1000;
  const prevMonday = new Date(prevMondayTime);
  const prevWeekKey = `${prevMonday.getUTCFullYear()}-${(prevMonday.getUTCMonth() + 1)
    .toString()
    .padStart(2, "0")}-${prevMonday.getUTCDate().toString().padStart(2, "0")}`;

  const nextMondayTime = mondayDate.getTime() + 7 * 24 * 60 * 60 * 1000;
  const nextMonday = new Date(nextMondayTime);
  const nextWeekKey = `${nextMonday.getUTCFullYear()}-${(nextMonday.getUTCMonth() + 1)
    .toString()
    .padStart(2, "0")}-${nextMonday.getUTCDate().toString().padStart(2, "0")}`;

  // Week start and end in UTC DateTime for database range query
  // Monday 00:00:00 Manila = Monday - 8 hours UTC
  const [startY, startM, startD] = weekStartKey.split("-").map(Number);
  const weekStartUtc = new Date(Date.UTC(startY, startM - 1, startD, 0, 0, 0) - MANILA_TIMEZONE_OFFSET_MS);

  // Sunday 23:59:59.999 Manila
  const [endY, endM, endD] = weekEndKey.split("-").map(Number);
  const weekEndUtc = new Date(Date.UTC(endY, endM - 1, endD, 23, 59, 59, 999) - MANILA_TIMEZONE_OFFSET_MS);

  return {
    weekDays,
    weekStartKey,
    weekEndKey,
    prevWeekKey,
    nextWeekKey,
    weekStartUtc,
    weekEndUtc,
    todayKey,
  };
}

/**
 * Retrieves client calendar schedule data for their linked student.
 * CRITICAL PRIVACY: Class schedules NEVER expose subject names, strictly returning "In class".
 */
export async function getClientCalendarData(
  clientId: string,
  anchorDateInput?: Date | string
): Promise<ClientCalendarData> {
  const link = await prisma.clientStudentLink.findFirst({
    where: { clientId, status: "ACTIVE" },
    include: {
      student: {
        include: {
          studentProfile: true,
        },
      },
    },
  });

  if (!link || !link.student) {
    return {
      linked: false,
      weekStartKey: "",
      weekEndKey: "",
      weekLabel: "",
      prevWeekKey: "",
      nextWeekKey: "",
      days: [],
    };
  }

  const student = link.student;
  const studentProfile = student.studentProfile;

  const {
    weekDays,
    weekStartKey,
    weekEndKey,
    prevWeekKey,
    nextWeekKey,
    weekStartUtc,
    weekEndUtc,
    todayKey,
  } = getManilaWeekDates(anchorDateInput);

  // Fetch classes, availabilities, blocked dates, and tasks concurrently
  const [classesRaw, availabilitiesRaw, blockedDatesRaw, tasksRaw] = await Promise.all([
    // Student classes - Privacy: do not query subject or replace it strictly
    prisma.classSchedule.findMany({
      where: { studentId: student.id },
      select: {
        id: true,
        dayOfWeek: true,
        startMinutes: true,
        endMinutes: true,
      },
      orderBy: { startMinutes: "asc" },
    }),
    prisma.availability.findMany({
      where: { studentId: student.id },
      select: {
        id: true,
        dayOfWeek: true,
        startMinutes: true,
        endMinutes: true,
      },
      orderBy: { startMinutes: "asc" },
    }),
    prisma.blockedDate.findMany({
      where: {
        studentId: student.id,
        dateStart: { lte: weekEndUtc },
        dateEnd: { gte: weekStartUtc },
      },
    }),
    prisma.task.findMany({
      where: {
        studentId: student.id,
        startAt: { lte: weekEndUtc },
        dueAt: { gte: weekStartUtc },
      },
      select: {
        id: true,
        clientId: true,
        title: true,
        startAt: true,
        dueAt: true,
        estHours: true,
        status: true,
      },
      orderBy: { startAt: "asc" },
    }),
  ]);

  // Construct week label (e.g. "Nov 9 – Nov 15, 2026")
  const firstDayFormatted = weekDays[0].formattedDate;
  const lastDayFormatted = weekDays[6].formattedDate;
  const [endYear] = weekEndKey.split("-");
  const weekLabel = `${firstDayFormatted} – ${lastDayFormatted}, ${endYear}`;

  // Assemble the 7 days of the academic week (Monday to Sunday)
  const days: CalendarDayData[] = weekDays.map((dayInfo) => {
    const dayOfWeek = dayInfo.dayOfWeek;
    const dayNameInfo = DAYS_MAP[dayOfWeek] ?? { name: "Day", shortName: "Day" };
    const dateKey = dayInfo.dateKey;
    const isToday = dateKey === todayKey;

    // Check if this date is blocked
    const dayStartUtc = new Date(`${dateKey}T00:00:00.000Z`);
    const dayEndUtc = new Date(`${dateKey}T23:59:59.999Z`);
    const matchedBlocked = blockedDatesRaw.find(
      (b) => b.dateStart <= dayEndUtc && b.dateEnd >= dayStartUtc
    );

    // Classes for this day of week (strictly "In class")
    const dayClasses: CalendarEventItem[] = classesRaw
      .filter((c) => c.dayOfWeek === dayOfWeek)
      .map((c) => ({
        id: c.id,
        type: "CLASS",
        title: "In class", // SPEC §6, §10 Scenario 6: Strictly redacted
        dayOfWeek: c.dayOfWeek,
        startMinutes: c.startMinutes,
        endMinutes: c.endMinutes,
        startTimeFormatted: minutesToTimeString(c.startMinutes),
        endTimeFormatted: minutesToTimeString(c.endMinutes),
      }));

    // Availability windows for this day of week
    const dayAvailabilities: CalendarEventItem[] = availabilitiesRaw
      .filter((a) => a.dayOfWeek === dayOfWeek)
      .map((a) => ({
        id: a.id,
        type: "AVAILABILITY",
        title: "Available for VA work",
        dayOfWeek: a.dayOfWeek,
        startMinutes: a.startMinutes,
        endMinutes: a.endMinutes,
        startTimeFormatted: minutesToTimeString(a.startMinutes),
        endTimeFormatted: minutesToTimeString(a.endMinutes),
      }));

    // Tasks for this specific date
    const dayTasks: CalendarEventItem[] = tasksRaw
      .filter((t) => {
        const startComponents = toManilaTimeComponents(t.startAt);
        return startComponents.dateKey === dateKey;
      })
      .map((t) => {
        const startComp = toManilaTimeComponents(t.startAt);
        const dueComp = toManilaTimeComponents(t.dueAt);
        return {
          id: t.id,
          type: "TASK",
          title: t.clientId === clientId ? t.title : "Other VA Task",
          dayOfWeek,
          startMinutes: startComp.minutesFromMidnight,
          endMinutes: dueComp.minutesFromMidnight,
          startTimeFormatted: minutesToTimeString(startComp.minutesFromMidnight),
          endTimeFormatted: minutesToTimeString(dueComp.minutesFromMidnight),
          dateKey,
          taskId: t.id,
          taskStatus: t.status,
          estHours: t.estHours,
        };
      });

    return {
      dayOfWeek,
      dayName: dayNameInfo.name,
      shortDayName: dayNameInfo.shortName,
      dateKey,
      formattedDate: dayInfo.formattedDate,
      isToday,
      isBlocked: !!matchedBlocked,
      blockedReason: matchedBlocked ? (matchedBlocked.reason ?? "Unavailable") : null,
      classes: dayClasses,
      availabilities: dayAvailabilities,
      tasks: dayTasks,
    };
  });

  return {
    linked: true,
    student: {
      id: student.id,
      name: student.name,
      email: student.email,
      school: studentProfile?.school ?? "Student",
      course: studentProfile?.course ?? "VA",
      year: studentProfile?.year ?? 1,
      hourlyRate: link.hourlyRate,
      maxHoursPerDay: studentProfile?.maxHoursPerDay ?? 4,
    },
    weekStartKey,
    weekEndKey,
    weekLabel,
    prevWeekKey,
    nextWeekKey,
    days,
  };
}
