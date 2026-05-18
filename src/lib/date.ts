// Constitution VII: timestamps always UTC in DB; display only in Asia/Kolkata (IST, UTC+05:30)

const IST_TZ = 'Asia/Kolkata';

/** Convert any date/string to a Date object in IST */
export function toIST(utcDate: Date | string): Date {
  const d = utcDate instanceof Date ? utcDate : new Date(utcDate);
  return new Date(d.toLocaleString('en-US', { timeZone: IST_TZ }));
}

/**
 * Format a UTC date as dd-MMM-yyyy in IST.
 * e.g. 2026-05-18T12:00:00Z → "18-May-2026"
 */
export function formatDate(utcDate: Date | string): string {
  const d = utcDate instanceof Date ? utcDate : new Date(utcDate);
  return d.toLocaleDateString('en-GB', {
    timeZone: IST_TZ,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Format a UTC date as 12-hour time with AM/PM in IST.
 * e.g. 2026-05-18T07:30:00Z → "1:00 PM"
 */
export function formatTime(utcDate: Date | string): string {
  const d = utcDate instanceof Date ? utcDate : new Date(utcDate);
  return d.toLocaleTimeString('en-IN', {
    timeZone: IST_TZ,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Format date + time together.
 * e.g. "18-May-2026, 1:00 PM"
 */
export function formatDateTime(utcDate: Date | string): string {
  return `${formatDate(utcDate)}, ${formatTime(utcDate)}`;
}

/**
 * Calculate age in years from a date of birth.
 * Calculation is in UTC; display is irrelevant for age.
 */
export function ageFromDOB(dob: Date | string): number {
  const birth = dob instanceof Date ? dob : new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age;
}

/** Returns true if the given date is in the past (UTC comparison) */
export function isExpired(date: Date | string | null | undefined): boolean {
  if (!date) return false;
  const d = date instanceof Date ? date : new Date(date);
  return d < new Date();
}

/** Returns true if the given date is within `days` from now */
export function isExpiringSoon(date: Date | string | null | undefined, days = 90): boolean {
  if (!date) return false;
  const d = date instanceof Date ? date : new Date(date);
  const threshold = new Date();
  threshold.setDate(threshold.getDate() + days);
  return d > new Date() && d <= threshold;
}