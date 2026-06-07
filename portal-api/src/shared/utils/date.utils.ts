/**
 * Date Utilities
 *
 * Helpers for building date-range filters for MongoDB queries.
 */

/**
 * Get start and end of today (UTC).
 */
export function getToday(): { start: Date; end: Date } {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date();
  end.setUTCHours(23, 59, 59, 999);
  return { start, end };
}

/**
 * Get date N days ago (start of that day).
 */
export function daysAgo(days: number): Date {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

/**
 * Build a MongoDB date range filter.
 * Returns a $gte/$lte condition for the given field.
 */
export function buildDateFilter(
  from?: string | Date,
  to?: string | Date,
): Record<string, Date> | undefined {
  const filter: Record<string, Date> = {};

  if (from) {
    filter.$gte = new Date(from);
  }
  if (to) {
    const endDate = new Date(to);
    endDate.setUTCHours(23, 59, 59, 999);
    filter.$lte = endDate;
  }

  return Object.keys(filter).length > 0 ? filter : undefined;
}

/**
 * Get the start of the current month (UTC).
 */
export function getMonthStart(): Date {
  const date = new Date();
  date.setUTCDate(1);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

/**
 * Get the start of the current week (Monday, UTC).
 */
export function getWeekStart(): Date {
  const date = new Date();
  const day = date.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday is first day
  date.setUTCDate(date.getUTCDate() + diff);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}
