/**
 * Open Slots Engine
 *
 * PURE FUNCTIONS ONLY. No Prisma, no database calls, no network requests.
 * Evaluates real student free time based on availability, classes, blocked dates, and existing tasks.
 * Evaluates in Asia/Manila timezone via date-fns-tz.
 *
 * One source of truth for when the student is really free.
 * Used by Client Calendar, Assign Task dialog, and Client Home.
 * Must never suggest a time that checkConflict would block or warn about.
 */

import { fromZonedTime } from "date-fns-tz";
import {
  checkConflict,
  toManilaTimeComponents,
  ClassScheduleItem,
  AvailabilityWindow,
  ExistingTaskItem,
  BlockedDateItem,
} from "./conflict";

export const TIMEZONE_MANILA = "Asia/Manila";

export interface OpenSlot {
  start: Date;
  end: Date;
  minutes: number;
}

export interface GetOpenSlotsOptions {
  from: Date | string;
  to: Date | string;
  classes: ClassScheduleItem[];
  availability: AvailabilityWindow[];
  blockedDates?: BlockedDateItem[];
  existingTasks?: ExistingTaskItem[];
  now: Date | string;
}

export interface DayCapacity {
  maxHours: number;
  assignedHours: number;
  remainingHours: number;
}

export interface GetDayCapacityOptions {
  day: Date | string;
  maxHoursPerDay: number;
  existingTasks?: ExistingTaskItem[];
}

export interface SuggestSlotsOptions extends GetOpenSlotsOptions {
  estHours: number;
  count?: number; // default = 4
  maxPerDay?: number; // default = 2
  maxHoursPerDay?: number; // default = 4
  studentName?: string;
}

export interface GetNextFreeWindowOptions {
  from?: Date | string;
  to?: Date | string;
  classes: ClassScheduleItem[];
  availability: AvailabilityWindow[];
  blockedDates?: BlockedDateItem[];
  existingTasks?: ExistingTaskItem[];
  now: Date | string;
}

interface TimeInterval {
  startMs: number;
  endMs: number;
}

/**
 * Subtracts an obstacle interval from a list of available intervals.
 * Overlap rule: start < otherEnd AND end > otherStart.
 * Touching edges do not overlap and leave no zero-length slivers.
 */
function subtractObstacleFromIntervals(
  intervals: TimeInterval[],
  obstacle: TimeInterval
): TimeInterval[] {
  const result: TimeInterval[] = [];
  const oStart = obstacle.startMs;
  const oEnd = obstacle.endMs;

  for (const interval of intervals) {
    const iStart = interval.startMs;
    const iEnd = interval.endMs;

    // Overlap check per detector: start < otherEnd AND end > otherStart
    const overlaps = iStart < oEnd && iEnd > oStart;

    if (!overlaps) {
      result.push(interval);
      continue;
    }

    // Left piece: if interval starts before obstacle
    if (iStart < oStart) {
      const leftEnd = Math.min(iEnd, oStart);
      if (leftEnd > iStart) {
        result.push({ startMs: iStart, endMs: leftEnd });
      }
    }

    // Right piece: if interval ends after obstacle
    if (iEnd > oEnd) {
      const rightStart = Math.max(iStart, oEnd);
      if (iEnd > rightStart) {
        result.push({ startMs: rightStart, endMs: iEnd });
      }
    }
  }

  return result;
}

/**
 * Calculates open slots for a student in a given date range.
 *
 * Rules:
 * - Availability windows in range, minus classes, blocked dates and existing tasks.
 * - Overlap rule is the detector's: start < otherEnd AND end > otherStart.
 * - Touching edges don't overlap and leave no zero-length slivers.
 * - Slots never cross midnight (split at midnight Asia/Manila).
 * - Anything before `now` is cut off.
 * - Sorted by start.
 */
export function getOpenSlots({
  from,
  to,
  classes,
  availability,
  blockedDates,
  existingTasks,
  now,
}: GetOpenSlotsOptions): OpenSlot[] {
  const fromDate = typeof from === "string" ? new Date(from) : from;
  const toDate = typeof to === "string" ? new Date(to) : to;
  const nowDate = typeof now === "string" ? new Date(now) : now;

  if (
    isNaN(fromDate.getTime()) ||
    isNaN(toDate.getTime()) ||
    isNaN(nowDate.getTime()) ||
    fromDate >= toDate
  ) {
    return [];
  }

  if (!availability || availability.length === 0) {
    return [];
  }

  // Determine Asia/Manila calendar date range
  const startDateKey = toManilaTimeComponents(fromDate).dateKey;
  const endDateKey = toManilaTimeComponents(toDate).dateKey;

  const startDayUtc = fromZonedTime(`${startDateKey}T00:00:00`, TIMEZONE_MANILA);
  const endDayStartUtc = fromZonedTime(`${endDateKey}T00:00:00`, TIMEZONE_MANILA);
  const endDayUtc = new Date(endDayStartUtc.getTime() + 24 * 60 * 60 * 1000);

  let currentDayStartMs = startDayUtc.getTime();
  const endDayMs = endDayUtc.getTime();

  const rawDaySlots: TimeInterval[] = [];

  while (currentDayStartMs < endDayMs) {
    const currentDayEndMs = currentDayStartMs + 24 * 60 * 60 * 1000;
    const currentDayStart = new Date(currentDayStartMs);
    const currentDayComponents = toManilaTimeComponents(currentDayStart);
    const dayOfWeek = currentDayComponents.dayOfWeek;

    // 1. Blocked Dates: A blocked date removes the whole day
    let isDayBlocked = false;
    if (blockedDates && blockedDates.length > 0) {
      for (const b of blockedDates) {
        const bStartMs = new Date(b.dateStart).getTime();
        const bEndMs = new Date(b.dateEnd).getTime();
        // If the blocked interval overlaps this Manila calendar day
        if (currentDayStartMs <= bEndMs && currentDayEndMs >= bStartMs) {
          isDayBlocked = true;
          break;
        }
      }
    }

    if (isDayBlocked) {
      currentDayStartMs = currentDayEndMs;
      continue;
    }

    // 2. Collect availability intervals on this day
    const dayAvailability: TimeInterval[] = [];

    for (const a of availability) {
      if (a.dayOfWeek === dayOfWeek) {
        if (a.startMinutes < a.endMinutes && a.endMinutes <= 1440) {
          dayAvailability.push({
            startMs: currentDayStartMs + a.startMinutes * 60 * 1000,
            endMs: currentDayStartMs + a.endMinutes * 60 * 1000,
          });
        } else if (a.startMinutes > a.endMinutes) {
          // Window crosses midnight into the next day: today portion
          dayAvailability.push({
            startMs: currentDayStartMs + a.startMinutes * 60 * 1000,
            endMs: currentDayEndMs,
          });
        } else if (a.endMinutes > 1440) {
          // Window ends after midnight: today portion
          dayAvailability.push({
            startMs: currentDayStartMs + a.startMinutes * 60 * 1000,
            endMs: currentDayEndMs,
          });
        }
      }

      // Check if yesterday had a window that crossed midnight into today
      const prevDayOfWeek = (dayOfWeek + 6) % 7;
      if (a.dayOfWeek === prevDayOfWeek) {
        if (a.startMinutes > a.endMinutes) {
          // Tomorrow portion of window crossing midnight
          dayAvailability.push({
            startMs: currentDayStartMs,
            endMs: currentDayStartMs + a.endMinutes * 60 * 1000,
          });
        } else if (a.endMinutes > 1440) {
          dayAvailability.push({
            startMs: currentDayStartMs,
            endMs: currentDayStartMs + (a.endMinutes - 1440) * 60 * 1000,
          });
        }
      }
    }

    if (dayAvailability.length === 0) {
      currentDayStartMs = currentDayEndMs;
      continue;
    }

    // Sort and merge overlapping or touching availability intervals on this day
    dayAvailability.sort((x, y) => x.startMs - y.startMs);
    const mergedAvailability: TimeInterval[] = [];
    for (const interval of dayAvailability) {
      if (mergedAvailability.length === 0) {
        mergedAvailability.push({ ...interval });
      } else {
        const last = mergedAvailability[mergedAvailability.length - 1];
        if (interval.startMs <= last.endMs) {
          last.endMs = Math.max(last.endMs, interval.endMs);
        } else {
          mergedAvailability.push({ ...interval });
        }
      }
    }

    // 3. Collect obstacles on this day (classes and existing tasks)
    const dayObstacles: TimeInterval[] = [];

    // 3a. Classes
    for (const c of classes) {
      if (c.dayOfWeek === dayOfWeek) {
        if (c.startMinutes < c.endMinutes && c.endMinutes <= 1440) {
          dayObstacles.push({
            startMs: currentDayStartMs + c.startMinutes * 60 * 1000,
            endMs: currentDayStartMs + c.endMinutes * 60 * 1000,
          });
        } else if (c.startMinutes > c.endMinutes) {
          dayObstacles.push({
            startMs: currentDayStartMs + c.startMinutes * 60 * 1000,
            endMs: currentDayEndMs,
          });
        } else if (c.endMinutes > 1440) {
          dayObstacles.push({
            startMs: currentDayStartMs + c.startMinutes * 60 * 1000,
            endMs: currentDayEndMs,
          });
        }
      }

      const prevDayOfWeek = (dayOfWeek + 6) % 7;
      if (c.dayOfWeek === prevDayOfWeek) {
        if (c.startMinutes > c.endMinutes) {
          dayObstacles.push({
            startMs: currentDayStartMs,
            endMs: currentDayStartMs + c.endMinutes * 60 * 1000,
          });
        } else if (c.endMinutes > 1440) {
          dayObstacles.push({
            startMs: currentDayStartMs,
            endMs: currentDayStartMs + (c.endMinutes - 1440) * 60 * 1000,
          });
        }
      }
    }

    // 3b. Existing tasks
    if (existingTasks && existingTasks.length > 0) {
      for (const t of existingTasks) {
        if (t.status === "DONE") continue;
        const tStartMs = new Date(t.startAt).getTime();
        const tDueMs = new Date(t.dueAt).getTime();
        if (tStartMs >= tDueMs) continue;

        if (tStartMs < currentDayEndMs && tDueMs > currentDayStartMs) {
          dayObstacles.push({
            startMs: Math.max(tStartMs, currentDayStartMs),
            endMs: Math.min(tDueMs, currentDayEndMs),
          });
        }
      }
    }

    // 4. Subtract obstacles from availability
    let remainingDayIntervals = mergedAvailability;
    for (const obstacle of dayObstacles) {
      remainingDayIntervals = subtractObstacleFromIntervals(
        remainingDayIntervals,
        obstacle
      );
    }

    for (const interval of remainingDayIntervals) {
      rawDaySlots.push(interval);
    }

    currentDayStartMs = currentDayEndMs;
  }

  // 5. Clamp to [from, to] range and cut off before now
  const effectiveStartMs = Math.max(fromDate.getTime(), nowDate.getTime());
  const effectiveEndMs = toDate.getTime();

  const openSlots: OpenSlot[] = [];

  for (const slot of rawDaySlots) {
    const startMs = Math.max(slot.startMs, effectiveStartMs);
    const endMs = Math.min(slot.endMs, effectiveEndMs);

    if (endMs > startMs) {
      const minutes = Math.round((endMs - startMs) / (60 * 1000));
      if (minutes > 0) {
        openSlots.push({
          start: new Date(startMs),
          end: new Date(endMs),
          minutes,
        });
      }
    }
  }

  // 6. Sort by start ascending
  openSlots.sort((a, b) => a.start.getTime() - b.start.getTime());

  return openSlots;
}

/**
 * Calculates remaining capacity for a student on a specific calendar day in Asia/Manila.
 */
export function getDayCapacity({
  day,
  maxHoursPerDay,
  existingTasks,
}: GetDayCapacityOptions): DayCapacity {
  const targetTime = toManilaTimeComponents(day);
  const targetDateKey = targetTime.dateKey;

  let assignedHours = 0;
  if (existingTasks && existingTasks.length > 0) {
    for (const task of existingTasks) {
      if (task.status === "DONE") continue;
      const taskTime = toManilaTimeComponents(task.startAt);
      if (taskTime.dateKey === targetDateKey) {
        assignedHours += task.estHours;
      }
    }
  }

  assignedHours = Math.round(assignedHours * 100) / 100;
  const remainingHours = Math.max(
    0,
    Math.round((maxHoursPerDay - assignedHours) * 100) / 100
  );

  return {
    maxHours: maxHoursPerDay,
    assignedHours,
    remainingHours,
  };
}

/**
 * Suggests task placement slots of estHours (rounded up to 15 minutes).
 *
 * Rules:
 * - Earliest first.
 * - Starting at an open slot's start or on a 30-minute boundary inside it.
 * - Only on days where remainingHours >= estHours.
 * - Every suggestion must pass the real checkConflict with ok === true and no warnings.
 * - Returns [] if none.
 */
export function suggestSlots({
  from,
  to,
  classes,
  availability,
  blockedDates,
  existingTasks,
  now,
  estHours,
  count = 4,
  maxPerDay = 2,
  maxHoursPerDay = 4,
  studentName,
}: SuggestSlotsOptions): OpenSlot[] {
  if (estHours <= 0 || count <= 0 || maxPerDay <= 0) {
    return [];
  }

  // Round up to nearest 15 minutes
  const durationMinutes = Math.ceil((estHours * 60) / 15) * 15;
  const slotHours = durationMinutes / 60;
  const durationMs = durationMinutes * 60 * 1000;

  const openSlots = getOpenSlots({
    from,
    to,
    classes,
    availability,
    blockedDates,
    existingTasks,
    now,
  });

  if (openSlots.length === 0) {
    return [];
  }

  const suggestions: OpenSlot[] = [];
  const suggestionsPerDay = new Map<string, number>();

  for (const slot of openSlots) {
    const slotStartMs = slot.start.getTime();
    const slotEndMs = slot.end.getTime();

    if (slotEndMs - slotStartMs < durationMs) {
      continue;
    }

    // Generate candidate start times:
    // 1. slot.start
    // 2. 30-minute boundaries inside slot
    const candidateStarts: number[] = [slotStartMs];

    const MS_30_MIN = 30 * 60 * 1000;
    let next30MinBoundary = Math.floor(slotStartMs / MS_30_MIN) * MS_30_MIN + MS_30_MIN;

    while (next30MinBoundary + durationMs <= slotEndMs) {
      if (next30MinBoundary > slotStartMs) {
        candidateStarts.push(next30MinBoundary);
      }
      next30MinBoundary += MS_30_MIN;
    }

    for (const candStartMs of candidateStarts) {
      const candEndMs = candStartMs + durationMs;
      if (candEndMs > slotEndMs) continue;

      const candStart = new Date(candStartMs);
      const candEnd = new Date(candEndMs);
      const dateKey = toManilaTimeComponents(candStart).dateKey;

      // Check maxPerDay
      const currentDayCount = suggestionsPerDay.get(dateKey) || 0;
      if (currentDayCount >= maxPerDay) {
        continue;
      }

      // Check daily remaining capacity
      const capacity = getDayCapacity({
        day: candStart,
        maxHoursPerDay,
        existingTasks,
      });

      if (capacity.remainingHours < estHours || capacity.remainingHours < slotHours) {
        continue;
      }

      // Real checkConflict as the final filter
      const conflictResult = checkConflict(
        {
          startAt: candStart,
          dueAt: candEnd,
          estHours: slotHours,
        },
        classes,
        availability,
        existingTasks ?? [],
        maxHoursPerDay,
        {
          studentName,
          blockedDates,
        }
      );

      // Must have ok === true and no warnings
      if (!conflictResult.ok || conflictResult.hasWarnings) {
        continue;
      }

      suggestions.push({
        start: candStart,
        end: candEnd,
        minutes: durationMinutes,
      });

      suggestionsPerDay.set(dateKey, currentDayCount + 1);

      if (suggestions.length >= count) {
        return suggestions;
      }
    }
  }

  return suggestions;
}

/**
 * Returns the first open slot from now, or null if none.
 */
export function getNextFreeWindow({
  from,
  to,
  classes,
  availability,
  blockedDates,
  existingTasks,
  now,
}: GetNextFreeWindowOptions): OpenSlot | null {
  const effectiveFrom = from ?? now;
  const effectiveTo =
    to ?? new Date(new Date(now).getTime() + 30 * 24 * 60 * 60 * 1000);

  const slots = getOpenSlots({
    from: effectiveFrom,
    to: effectiveTo,
    classes,
    availability,
    blockedDates,
    existingTasks,
    now,
  });

  return slots.length > 0 ? slots[0] : null;
}
