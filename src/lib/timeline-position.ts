import { minutesToTimeString } from "@/lib/schedule-utils";

export interface TimelineScheduleItem {
  id: string;
  startMinutes: number;
  endMinutes: number;
}

/**
 * Computes the insertion index for the "Now" marker among scheduled items.
 *
 * Rules:
 * - If current time is before the first item, index is 0.
 * - If current time is after an item has ended and before the next item starts,
 *   the index is positioned between them.
 * - If current time is during an ongoing item, the marker sits right after that item's slot.
 * - If current time is after all items have ended, the index is at the end (after all items).
 */
export function getTimelineIndexForNow(
  items: TimelineScheduleItem[],
  currentMinutes: number
): number {
  if (!items || items.length === 0) {
    return 0;
  }

  // Count items that have already started or ended before/at currentMinutes
  let index = 0;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (currentMinutes >= item.startMinutes) {
      index = i + 1;
    } else {
      break;
    }
  }

  return index;
}

export interface FreeWindow {
  startMinutes: number;
  endMinutes: number;
  startTimeFormatted: string;
  endTimeFormatted: string;
}

/**
 * Calculates any free window enclosing the current time between 7 AM (420m) and 10 PM (1320m).
 */
export function getCurrentFreeWindow(
  items: TimelineScheduleItem[],
  currentMinutes: number,
  dayStartMinutes = 420, // 7:00 AM
  dayEndMinutes = 1320   // 10:00 PM
): FreeWindow | null {
  if (currentMinutes < dayStartMinutes || currentMinutes > dayEndMinutes) {
    return null;
  }

  // Check if currentMinutes is inside any scheduled item
  const isInsideItem = items.some(
    (item) => currentMinutes >= item.startMinutes && currentMinutes < item.endMinutes
  );
  if (isInsideItem) {
    return null;
  }

  // Find preceding boundary (either day start or end of previous class)
  let windowStart = dayStartMinutes;
  for (const item of items) {
    if (item.endMinutes <= currentMinutes) {
      windowStart = Math.max(windowStart, item.endMinutes);
    }
  }

  // Find succeeding boundary (either day end or start of next class)
  let windowEnd = dayEndMinutes;
  for (const item of items) {
    if (item.startMinutes > currentMinutes) {
      windowEnd = Math.min(windowEnd, item.startMinutes);
      break;
    }
  }

  if (windowEnd <= windowStart) {
    return null;
  }

  return {
    startMinutes: windowStart,
    endMinutes: windowEnd,
    startTimeFormatted: minutesToTimeString(windowStart),
    endTimeFormatted: minutesToTimeString(windowEnd),
  };
}

