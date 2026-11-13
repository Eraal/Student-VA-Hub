import { toZonedTime, format as formatZoned } from "date-fns-tz";

export const TIMEZONE_MANILA = "Asia/Manila";
export const FALLBACK_DASH = "—";

/**
 * Safely parses any date input and returns a Date or null if invalid.
 */
export function parseSafeDate(
  input: Date | string | number | null | undefined
): Date | null {
  if (input === null || input === undefined || input === "") {
    return null;
  }
  const date = input instanceof Date ? input : new Date(input);
  if (isNaN(date.getTime())) {
    return null;
  }
  return date;
}

/**
 * Formats date in Asia/Manila. Default format: "EEE, MMM d" (e.g. "Wed, Nov 11").
 */
export function formatDate(
  input: Date | string | number | null | undefined,
  formatPattern = "EEE, MMM d"
): string {
  const date = parseSafeDate(input);
  if (!date) return FALLBACK_DASH;

  try {
    const zoned = toZonedTime(date, TIMEZONE_MANILA);
    return formatZoned(zoned, formatPattern);
  } catch {
    return FALLBACK_DASH;
  }
}

/**
 * Formats time in Asia/Manila (e.g. "1:00 PM").
 */
export function formatTime(
  input: Date | string | number | null | undefined
): string {
  const date = parseSafeDate(input);
  if (!date) return FALLBACK_DASH;

  try {
    const zoned = toZonedTime(date, TIMEZONE_MANILA);
    return formatZoned(zoned, "h:mm a");
  } catch {
    return FALLBACK_DASH;
  }
}

/**
 * Formats a time range in Asia/Manila (e.g. "1:00 PM – 2:30 PM").
 */
export function formatTimeRange(
  startInput: Date | string | number | null | undefined,
  endInput: Date | string | number | null | undefined
): string {
  const start = formatTime(startInput);
  const end = formatTime(endInput);

  if (start === FALLBACK_DASH && end === FALLBACK_DASH) return FALLBACK_DASH;
  if (start === FALLBACK_DASH) return end;
  if (end === FALLBACK_DASH) return start;
  return `${start} – ${end}`;
}

/**
 * Formats full date and time in Asia/Manila (e.g. "Wed, Nov 11, 1:00 PM").
 */
export function formatDateTime(
  input: Date | string | number | null | undefined,
  formatPattern = "EEE, MMM d, h:mm a"
): string {
  const date = parseSafeDate(input);
  if (!date) return FALLBACK_DASH;

  try {
    const zoned = toZonedTime(date, TIMEZONE_MANILA);
    return formatZoned(zoned, formatPattern);
  } catch {
    return FALLBACK_DASH;
  }
}

/**
 * Formats a date range in Asia/Manila (e.g. "Nov 11 – Nov 15, 2026").
 */
export function formatDateRange(
  startInput: Date | string | number | null | undefined,
  endInput: Date | string | number | null | undefined
): string {
  const startDate = parseSafeDate(startInput);
  const endDate = parseSafeDate(endInput);

  if (!startDate && !endDate) return FALLBACK_DASH;
  if (!startDate) return formatDate(endDate, "MMM d, yyyy");
  if (!endDate) return formatDate(startDate, "MMM d, yyyy");

  const startFormatted = formatDate(startDate, "MMM d, yyyy");
  const endFormatted = formatDate(endDate, "MMM d, yyyy");

  if (startFormatted === endFormatted) {
    return startFormatted;
  }

  const startZoned = toZonedTime(startDate, TIMEZONE_MANILA);
  const endZoned = toZonedTime(endDate, TIMEZONE_MANILA);

  if (startZoned.getFullYear() === endZoned.getFullYear()) {
    const s = formatZoned(startZoned, "MMM d");
    return `${s} – ${endFormatted}`;
  }

  return `${startFormatted} – ${endFormatted}`;
}

/**
 * Formats relative time in natural English (e.g. "in 45 min", "yesterday", "45 min ago").
 */
export function formatRelative(
  input: Date | string | number | null | undefined,
  baseNowInput: Date | string | number = new Date()
): string {
  const date = parseSafeDate(input);
  const baseNow = parseSafeDate(baseNowInput) ?? new Date();
  if (!date) return FALLBACK_DASH;

  const diffMs = date.getTime() - baseNow.getTime();
  const diffSecs = Math.round(diffMs / 1000);
  const isFuture = diffSecs > 0;
  const absSecs = Math.abs(diffSecs);
  const absMins = Math.round(absSecs / 60);
  const absHours = Math.round(absMins / 60);
  const absDays = Math.round(absHours / 24);

  if (absSecs < 45) {
    return isFuture ? "in a few seconds" : "just now";
  }

  if (absMins < 60) {
    return isFuture
      ? `in ${absMins} min`
      : `${absMins} min ago`;
  }

  if (absHours < 24) {
    // Check if same Manila day, yesterday, or tomorrow
    const dateZoned = toZonedTime(date, TIMEZONE_MANILA);
    const nowZoned = toZonedTime(baseNow, TIMEZONE_MANILA);

    const isSameDay =
      dateZoned.getDate() === nowZoned.getDate() &&
      dateZoned.getMonth() === nowZoned.getMonth() &&
      dateZoned.getFullYear() === nowZoned.getFullYear();

    if (isSameDay) {
      return isFuture
        ? `in ${absHours}h`
        : `${absHours}h ago`;
    }
  }

  if (absDays === 1) {
    return isFuture ? "tomorrow" : "yesterday";
  }

  if (absDays < 30) {
    return isFuture
      ? `in ${absDays} days`
      : `${absDays} days ago`;
  }

  return formatDate(date, "MMM d, yyyy");
}

/**
 * Formats hours into clean English string (e.g. 1.5 -> "1h 30m", 2 -> "2h", 0 -> "0h").
 */
export function formatHours(hours: number | null | undefined): string {
  if (hours === null || hours === undefined || isNaN(hours)) {
    return FALLBACK_DASH;
  }

  if (hours === 0) return "0h";

  const totalMinutes = Math.round(hours * 60);
  if (totalMinutes <= 0) return "0h";

  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;

  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

/**
 * Formats Philippine Peso amount into standard currency (e.g. 1250 -> "₱1,250.00").
 */
export function formatPeso(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return FALLBACK_DASH;
  }

  const formattedNumber = new Intl.NumberFormat("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

  return `₱${formattedNumber}`;
}

/**
 * Formats running timer duration into "HH:MM:SS" (e.g. 3665 -> "01:01:05").
 */
export function formatDuration(
  totalSeconds: number | null | undefined
): string {
  if (totalSeconds === null || totalSeconds === undefined || isNaN(totalSeconds) || totalSeconds < 0) {
    return "00:00:00";
  }

  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = Math.floor(totalSeconds % 60);

  const hh = String(hours).padStart(2, "0");
  const mm = String(mins).padStart(2, "0");
  const ss = String(secs).padStart(2, "0");

  return `${hh}:${mm}:${ss}`;
}

