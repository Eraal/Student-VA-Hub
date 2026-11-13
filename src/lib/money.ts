/**
 * VAwise — Single Source of Truth for Time & Money Calculations (lib/money.ts)
 *
 * Rules:
 * 1. Bill in whole minutes: duration = Math.round((timeOut - timeIn) / 60000).
 *    Minimum billable session: 1 minute.
 *    Negative or zero duration rejected (Time Out must be after Time In).
 *    totalHours is stored as minutes / 60 (schema stays Float).
 * 2. Always derive minutes from stored totalHours via Math.round(totalHours * 60)
 *    so legacy 2-decimal numbers (e.g. 0.01, 1.02) map accurately to minutes.
 * 3. Round per log to integer centavos: Math.round(minutes * rateCentavos / 60),
 *    and return pesos as centavos / 100.
 * 4. All invoice amounts, task breakdowns, timesheets, and dashboard estimates
 *    MUST be sums of per-log amounts. Never multiply a summed hours total by the rate.
 */

/**
 * Calculates logged duration in integer minutes.
 * Rejects sessions where timeOut <= timeIn.
 * Enforces a minimum billable duration of 1 minute.
 */
export function calculateLoggedMinutes(
  timeIn: Date | string | number,
  timeOut: Date | string | number
): number {
  const dIn = timeIn instanceof Date ? timeIn : new Date(timeIn);
  const dOut = timeOut instanceof Date ? timeOut : new Date(timeOut);

  const diffMs = dOut.getTime() - dIn.getTime();
  if (isNaN(diffMs) || diffMs <= 0) {
    throw new Error("Time Out must be after Time In.");
  }

  const roundedMinutes = Math.round(diffMs / 60000);
  return Math.max(1, roundedMinutes);
}

/**
 * Calculates logged hours as whole minutes / 60.
 */
export function calculateLoggedHours(
  timeIn: Date | string | number,
  timeOut: Date | string | number
): number {
  const minutes = calculateLoggedMinutes(timeIn, timeOut);
  return minutes / 60;
}

/**
 * Derives integer minutes from stored totalHours.
 * Handles legacy 2-decimal hours (e.g. 0.01 -> 1 min, 0.02 -> 1 min, 1.02 -> 61 min).
 */
export function hoursToMinutes(totalHours: number | null | undefined): number {
  if (totalHours === null || totalHours === undefined || isNaN(totalHours) || totalHours <= 0) {
    return 0;
  }
  return Math.max(0, Math.round(totalHours * 60));
}

/**
 * Calculates the monetary amount for a single time log in integer centavos,
 * returning the peso value rounded to 2 decimal places.
 * Formula: Math.round(minutes * (hourlyRate * 100) / 60) / 100
 */
export function calculateLogAmount(
  totalHours: number | null | undefined,
  hourlyRate: number
): number {
  const minutes = hoursToMinutes(totalHours);
  if (minutes === 0 || hourlyRate <= 0) {
    return 0;
  }

  const rateCentavos = Math.round(hourlyRate * 100);
  const centavos = Math.round((minutes * rateCentavos) / 60);
  return centavos / 100;
}

/**
 * Sums an array of monetary amounts using integer centavos to prevent floating point drift.
 */
export function sumMoney(amounts: (number | null | undefined)[]): number {
  const totalCentavos = amounts.reduce<number>((acc, a) => {
    if (a === null || a === undefined || isNaN(a)) return acc;
    return acc + Math.round(a * 100);
  }, 0);
  return totalCentavos / 100;
}

/**
 * Calculates the total monetary amount from a list of time logs by summing their individual per-log amounts.
 */
export function calculateTotalAmountFromLogs(
  logs: { totalHours: number | null | undefined }[],
  hourlyRate: number
): number {
  return sumMoney(logs.map((log) => calculateLogAmount(log.totalHours, hourlyRate)));
}
