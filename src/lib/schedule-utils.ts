/**
 * Schedule and Time calculation utilities.
 *
 * Rules:
 * - dayOfWeek: 0 = Sunday, 1 = Monday, 2 = Tuesday, 3 = Wednesday, 4 = Thursday, 5 = Friday, 6 = Saturday
 * - minutes: integer representing minutes from midnight in Asia/Manila (0 to 1439)
 *   e.g. 540 = 9:00 AM, 780 = 1:00 PM, 1080 = 6:00 PM
 */

export interface DayInfo {
  dayOfWeek: number;
  name: string;
  shortName: string;
}

export const DAYS_ORDER_ACADEMIC: DayInfo[] = [
  { dayOfWeek: 1, name: "Monday", shortName: "Mon" },
  { dayOfWeek: 2, name: "Tuesday", shortName: "Tue" },
  { dayOfWeek: 3, name: "Wednesday", shortName: "Wed" },
  { dayOfWeek: 4, name: "Thursday", shortName: "Thu" },
  { dayOfWeek: 5, name: "Friday", shortName: "Fri" },
  { dayOfWeek: 6, name: "Saturday", shortName: "Sat" },
  { dayOfWeek: 0, name: "Sunday", shortName: "Sun" },
];

export const DAYS_MAP: Record<number, DayInfo> = {
  0: { dayOfWeek: 0, name: "Sunday", shortName: "Sun" },
  1: { dayOfWeek: 1, name: "Monday", shortName: "Mon" },
  2: { dayOfWeek: 2, name: "Tuesday", shortName: "Tue" },
  3: { dayOfWeek: 3, name: "Wednesday", shortName: "Wed" },
  4: { dayOfWeek: 4, name: "Thursday", shortName: "Thu" },
  5: { dayOfWeek: 5, name: "Friday", shortName: "Fri" },
  6: { dayOfWeek: 6, name: "Saturday", shortName: "Sat" },
};

/**
 * Returns formatted day name (e.g. 1 -> "Monday" or "Mon").
 */
export function getDayName(dayOfWeek: number, short = false): string {
  const info = DAYS_MAP[dayOfWeek];
  if (!info) return "Unknown";
  return short ? info.shortName : info.name;
}

/**
 * Converts minutes from midnight into 12-hour or 24-hour time format.
 * e.g. 540 -> "9:00 AM", 780 -> "1:00 PM", 1260 -> "9:00 PM"
 */
export function minutesToTimeString(minutes: number, format24 = false): string {
  const safeMinutes = Math.max(0, Math.min(1439, Math.floor(minutes)));
  const hours = Math.floor(safeMinutes / 60);
  const mins = safeMinutes % 60;
  const minsFormatted = mins.toString().padStart(2, "0");

  if (format24) {
    const hoursFormatted = hours.toString().padStart(2, "0");
    return `${hoursFormatted}:${minsFormatted}`;
  }

  const period = hours >= 12 ? "PM" : "AM";
  const hours12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hours12}:${minsFormatted} ${period}`;
}

/**
 * Converts a "HH:mm" 24-hour time string into minutes from midnight.
 * e.g. "09:00" -> 540, "13:30" -> 810
 */
export function timeStringToMinutes(timeStr: string): number {
  if (!timeStr || !timeStr.includes(":")) {
    throw new Error(`Invalid time string: "${timeStr}". Expected "HH:mm" format.`);
  }

  const [hoursStr, minsStr] = timeStr.split(":");
  const hours = parseInt(hoursStr, 10);
  const mins = parseInt(minsStr, 10);

  if (isNaN(hours) || isNaN(mins) || hours < 0 || hours > 23 || mins < 0 || mins > 59) {
    throw new Error(`Invalid time value: "${timeStr}". Hours must be 0-23 and minutes 0-59.`);
  }

  return hours * 60 + mins;
}

/**
 * Converts minutes duration into a readable string.
 * e.g. 60 -> "1 hr", 90 -> "1 hr 30 mins", 120 -> "2 hrs", 45 -> "45 mins"
 */
export function minutesToDurationString(minutes: number): string {
  if (minutes <= 0) return "0 mins";
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;

  const parts: string[] = [];
  if (hours > 0) {
    parts.push(`${hours} ${hours === 1 ? "hr" : "hrs"}`);
  }
  if (remainingMins > 0) {
    parts.push(`${remainingMins} mins`);
  }

  return parts.join(" ") || "0 mins";
}

/**
 * Checks if two minute intervals on the same day overlap.
 * Uses standard open interval overlap: start1 < end2 && end1 > start2
 */
export function intervalsOverlap(
  start1: number,
  end1: number,
  start2: number,
  end2: number
): boolean {
  return start1 < end2 && end1 > start2;
}
