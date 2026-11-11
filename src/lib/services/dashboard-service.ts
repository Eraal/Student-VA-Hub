import { prisma } from "../prisma";
import { toManilaTimeComponents } from "../conflict";
import { minutesToTimeString, DAYS_MAP } from "../schedule-utils";
import { TaskStatus, TimeLogStatus } from "@prisma/client";

const MANILA_TIMEZONE_OFFSET_MS = 8 * 60 * 60 * 1000;

export interface StudentDashboardClass {
  id: string;
  subject: string;
  startMinutes: number;
  endMinutes: number;
  startTimeFormatted: string;
  endTimeFormatted: string;
  status: "UPCOMING" | "ONGOING" | "COMPLETED";
}

export interface StudentDashboardData {
  student: {
    id: string;
    name: string;
    email: string;
    school: string;
    course: string;
    year: number;
    maxHoursPerDay: number;
  };
  linkedClient: {
    id: string;
    name: string;
    email: string;
    hourlyRate: number;
  } | null;
  todayInfo: {
    dateKey: string;
    dayOfWeek: number;
    dayName: string;
    formattedDate: string;
  };
  capacity: {
    hoursToday: number;
    maxHoursPerDay: number;
    capacityPercentage: number;
    remainingHoursToday: number;
    isAtCapacity: boolean;
  };
  classesToday: StudentDashboardClass[];
  nextClass: StudentDashboardClass | null;
  activeTimer: {
    id: string;
    taskId: string;
    taskTitle: string;
    timeIn: Date;
  } | null;
  tasksSummary: {
    todoCount: number;
    doingCount: number;
    nextTask: {
      id: string;
      title: string;
      dueAt: Date;
      estHours: number;
      status: TaskStatus;
    } | null;
  };
  weeklyEarnings: {
    hoursThisWeek: number;
    estimatedAmount: number;
    hourlyRate: number;
  };
}

export interface ClientDashboardData {
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
  studentStatus: {
    state: "IN_CLASS" | "AVAILABLE" | "OFF";
    label: string;
    description: string;
  };
  tasksSummary: {
    todoCount: number;
    doingCount: number;
    doneCount: number;
    activeTasks: {
      id: string;
      title: string;
      dueAt: Date;
      estHours: number;
      status: TaskStatus;
      loggedHours: number;
    }[];
  };
  pendingApproval: {
    logCount: number;
    totalHours: number;
    totalAmount: number;
  };
}

/**
 * Determines current student live status (IN_CLASS, AVAILABLE, OFF) based on Manila local time.
 */
export function determineStudentLiveStatus(
  classesToday: { startMinutes: number; endMinutes: number }[],
  availabilitiesToday: { startMinutes: number; endMinutes: number }[],
  currentMinutes: number
): {
  state: "IN_CLASS" | "AVAILABLE" | "OFF";
  label: string;
  description: string;
} {
  // 1. Check if currently in class
  const activeClass = classesToday.find(
    (c) => currentMinutes >= c.startMinutes && currentMinutes < c.endMinutes
  );
  if (activeClass) {
    return {
      state: "IN_CLASS",
      label: "Currently in class",
      description: `Class ends at ${minutesToTimeString(activeClass.endMinutes)}`,
    };
  }

  // 2. Check if currently in availability window
  const activeAvail = availabilitiesToday.find(
    (a) => currentMinutes >= a.startMinutes && currentMinutes < a.endMinutes
  );
  if (activeAvail) {
    return {
      state: "AVAILABLE",
      label: "Available for VA work",
      description: `Available until ${minutesToTimeString(activeAvail.endMinutes)}`,
    };
  }

  // 3. Otherwise off schedule
  const nextAvail = availabilitiesToday.find((a) => a.startMinutes > currentMinutes);
  return {
    state: "OFF",
    label: "Off schedule",
    description: nextAvail
      ? `Next available at ${minutesToTimeString(nextAvail.startMinutes)}`
      : "No more availability slots today",
  };
}

/**
 * Retrieves student dashboard data for /student.
 */
export async function getStudentDashboardData(studentId: string): Promise<StudentDashboardData> {
  const [user, profile, link, classes, availabilities, activeTimeLog, allTimeLogs, tasks] =
    await Promise.all([
      prisma.user.findUniqueOrThrow({
        where: { id: studentId },
        select: { id: true, name: true, email: true },
      }),
      prisma.studentProfile.findUnique({
        where: { userId: studentId },
      }),
      prisma.clientStudentLink.findFirst({
        where: { studentId, status: "ACTIVE" },
        include: {
          client: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
      prisma.classSchedule.findMany({
        where: { studentId },
        orderBy: { startMinutes: "asc" },
      }),
      prisma.availability.findMany({
        where: { studentId },
        orderBy: { startMinutes: "asc" },
      }),
      prisma.timeLog.findFirst({
        where: { studentId, status: TimeLogStatus.OPEN },
        include: { task: { select: { title: true } } },
      }),
      prisma.timeLog.findMany({
        where: { studentId, status: { in: [TimeLogStatus.CLOSED, TimeLogStatus.APPROVED] } },
        orderBy: { timeIn: "desc" },
      }),
      prisma.task.findMany({
        where: { studentId },
        orderBy: { dueAt: "asc" },
      }),
    ]);

  const maxHoursPerDay = profile?.maxHoursPerDay ?? 4;
  const hourlyRate = link?.hourlyRate ?? 0;

  // Manila local date/time components
  const now = new Date();
  const manilaNow = toManilaTimeComponents(now);
  const currentMinutes = manilaNow.minutesFromMidnight;
  const dayOfWeek = manilaNow.dayOfWeek;
  const dateKey = manilaNow.dateKey;

  const dayInfo = DAYS_MAP[dayOfWeek] ?? { name: "Today", shortName: "Today" };
  const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  const formattedDate = `${dayInfo.name}, ${MONTHS[manilaNow.month]} ${manilaNow.day}`;

  // Today's classes with status relative to current time
  const classesToday: StudentDashboardClass[] = classes
    .filter((c) => c.dayOfWeek === dayOfWeek)
    .map((c) => {
      let status: "UPCOMING" | "ONGOING" | "COMPLETED" = "UPCOMING";
      if (currentMinutes >= c.endMinutes) {
        status = "COMPLETED";
      } else if (currentMinutes >= c.startMinutes) {
        status = "ONGOING";
      }

      return {
        id: c.id,
        subject: c.subject,
        startMinutes: c.startMinutes,
        endMinutes: c.endMinutes,
        startTimeFormatted: minutesToTimeString(c.startMinutes),
        endTimeFormatted: minutesToTimeString(c.endMinutes),
        status,
      };
    });

  // Next upcoming or ongoing class
  const nextClass = classesToday.find((c) => c.status !== "COMPLETED") || null;

  // Calculate hours worked today and this week in Manila
  const oneWeekAgoMs = now.getTime() - 7 * 24 * 60 * 60 * 1000;
  let hoursToday = 0;
  let hoursThisWeek = 0;

  for (const log of allTimeLogs) {
    if (log.totalHours && log.totalHours > 0) {
      const logManila = toManilaTimeComponents(log.timeIn);
      if (logManila.dateKey === dateKey) {
        hoursToday += log.totalHours;
      }
      if (log.timeIn.getTime() >= oneWeekAgoMs) {
        hoursThisWeek += log.totalHours;
      }
    }
  }

  hoursToday = Math.round(hoursToday * 100) / 100;
  hoursThisWeek = Math.round(hoursThisWeek * 100) / 100;

  const capacityPercentage = Math.min(100, Math.round((hoursToday / maxHoursPerDay) * 100));
  const remainingHoursToday = Math.max(0, Math.round((maxHoursPerDay - hoursToday) * 100) / 100);
  const isAtCapacity = hoursToday >= maxHoursPerDay;

  // Tasks summary
  const todoCount = tasks.filter((t) => t.status === TaskStatus.TODO).length;
  const doingCount = tasks.filter((t) => t.status === TaskStatus.DOING).length;

  const nextTaskRaw = tasks.find(
    (t) => (t.status === TaskStatus.TODO || t.status === TaskStatus.DOING) && t.dueAt >= now
  );

  const nextTask = nextTaskRaw
    ? {
        id: nextTaskRaw.id,
        title: nextTaskRaw.title,
        dueAt: nextTaskRaw.dueAt,
        estHours: nextTaskRaw.estHours,
        status: nextTaskRaw.status,
      }
    : null;

  return {
    student: {
      id: user.id,
      name: user.name,
      email: user.email,
      school: profile?.school ?? "Student",
      course: profile?.course ?? "VA",
      year: profile?.year ?? 1,
      maxHoursPerDay,
    },
    linkedClient: link
      ? {
          id: link.client.id,
          name: link.client.name,
          email: link.client.email,
          hourlyRate: link.hourlyRate,
        }
      : null,
    todayInfo: {
      dateKey,
      dayOfWeek,
      dayName: dayInfo.name,
      formattedDate,
    },
    capacity: {
      hoursToday,
      maxHoursPerDay,
      capacityPercentage,
      remainingHoursToday,
      isAtCapacity,
    },
    classesToday,
    nextClass,
    activeTimer: activeTimeLog
      ? {
          id: activeTimeLog.id,
          taskId: activeTimeLog.taskId,
          taskTitle: activeTimeLog.task.title,
          timeIn: activeTimeLog.timeIn,
        }
      : null,
    tasksSummary: {
      todoCount,
      doingCount,
      nextTask,
    },
    weeklyEarnings: {
      hoursThisWeek,
      estimatedAmount: Math.round(hoursThisWeek * hourlyRate * 100) / 100,
      hourlyRate,
    },
  };
}

/**
 * Retrieves client dashboard data for /client.
 */
export async function getClientDashboardData(clientId: string): Promise<ClientDashboardData> {
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
      studentStatus: {
        state: "OFF",
        label: "No linked student",
        description: "Link a student VA to see live status and tasks.",
      },
      tasksSummary: {
        todoCount: 0,
        doingCount: 0,
        doneCount: 0,
        activeTasks: [],
      },
      pendingApproval: {
        logCount: 0,
        totalHours: 0,
        totalAmount: 0,
      },
    };
  }

  const student = link.student;
  const studentProfile = student.studentProfile;
  const hourlyRate = link.hourlyRate;

  // Manila local time
  const now = new Date();
  const manilaNow = toManilaTimeComponents(now);
  const currentMinutes = manilaNow.minutesFromMidnight;
  const dayOfWeek = manilaNow.dayOfWeek;

  // Concurrently fetch today's student classes, availabilities, client's tasks, and pending time logs
  const [classesTodayRaw, availabilitiesTodayRaw, tasks, pendingLogs] = await Promise.all([
    prisma.classSchedule.findMany({
      where: { studentId: student.id, dayOfWeek },
      select: { startMinutes: true, endMinutes: true },
    }),
    prisma.availability.findMany({
      where: { studentId: student.id, dayOfWeek },
      select: { startMinutes: true, endMinutes: true },
    }),
    prisma.task.findMany({
      where: { clientId, studentId: student.id },
      include: {
        timeLogs: {
          select: { totalHours: true },
        },
      },
      orderBy: { dueAt: "asc" },
    }),
    prisma.timeLog.findMany({
      where: {
        studentId: student.id,
        status: TimeLogStatus.CLOSED, // Closed but not yet approved
        task: { clientId },
      },
      select: {
        id: true,
        totalHours: true,
      },
    }),
  ]);

  // Determine student live status
  const studentStatus = determineStudentLiveStatus(
    classesTodayRaw,
    availabilitiesTodayRaw,
    currentMinutes
  );

  // Task statistics
  const todoCount = tasks.filter((t) => t.status === TaskStatus.TODO).length;
  const doingCount = tasks.filter((t) => t.status === TaskStatus.DOING).length;
  const doneCount = tasks.filter((t) => t.status === TaskStatus.DONE).length;

  const activeTasks = tasks
    .filter((t) => t.status === TaskStatus.DOING || t.status === TaskStatus.TODO)
    .slice(0, 5)
    .map((t) => {
      const loggedHours = t.timeLogs.reduce((acc, l) => acc + (l.totalHours ?? 0), 0);
      return {
        id: t.id,
        title: t.title,
        dueAt: t.dueAt,
        estHours: t.estHours,
        status: t.status,
        loggedHours: Math.round(loggedHours * 100) / 100,
      };
    });

  // Pending approval timesheet calculations
  const pendingHoursTotal = pendingLogs.reduce((acc, l) => acc + (l.totalHours ?? 0), 0);
  const pendingApproval = {
    logCount: pendingLogs.length,
    totalHours: Math.round(pendingHoursTotal * 100) / 100,
    totalAmount: Math.round(pendingHoursTotal * hourlyRate * 100) / 100,
  };

  return {
    linked: true,
    student: {
      id: student.id,
      name: student.name,
      email: student.email,
      school: studentProfile?.school ?? "Student",
      course: studentProfile?.course ?? "VA",
      year: studentProfile?.year ?? 1,
      hourlyRate,
      maxHoursPerDay: studentProfile?.maxHoursPerDay ?? 4,
    },
    studentStatus,
    tasksSummary: {
      todoCount,
      doingCount,
      doneCount,
      activeTasks,
    },
    pendingApproval,
  };
}

