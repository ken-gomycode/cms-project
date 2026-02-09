import { format, formatDistanceToNow, parseISO, isValid } from 'date-fns';

/**
 * Parse a date value (string or Date) into a Date object
 */
const toDate = (date: string | Date): Date => {
  if (date instanceof Date) return date;
  return parseISO(date);
};

/**
 * Format a date as "Jan 15, 2026"
 */
export const formatDate = (date: string | Date): string => {
  const d = toDate(date);
  return isValid(d) ? format(d, 'MMM d, yyyy') : '';
};

/**
 * Format a date as "Jan 15, 2026, 3:30 PM"
 */
export const formatDateTime = (date: string | Date): string => {
  const d = toDate(date);
  return isValid(d) ? format(d, 'MMM d, yyyy, h:mm a') : '';
};

/**
 * Format a date as "3:30 PM"
 */
export const formatTime = (date: string | Date): string => {
  const d = toDate(date);
  return isValid(d) ? format(d, 'h:mm a') : '';
};

/**
 * Format a date as relative time: "2 hours ago", "3 days ago"
 */
export const formatRelative = (date: string | Date): string => {
  const d = toDate(date);
  return isValid(d) ? formatDistanceToNow(d, { addSuffix: true }) : '';
};

/**
 * Format a date for datetime-local input fields: "2026-01-15T14:30"
 */
export const formatForInput = (date: string | Date): string => {
  const d = toDate(date);
  return isValid(d) ? format(d, "yyyy-MM-dd'T'HH:mm") : '';
};

/**
 * Format a date as "January 15, 2026"
 */
export const formatDateLong = (date: string | Date): string => {
  const d = toDate(date);
  return isValid(d) ? format(d, 'MMMM d, yyyy') : '';
};

/**
 * Format a date as "01/15/2026"
 */
export const formatDateShort = (date: string | Date): string => {
  const d = toDate(date);
  return isValid(d) ? format(d, 'MM/dd/yyyy') : '';
};
