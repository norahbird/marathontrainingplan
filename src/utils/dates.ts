import { addDays, format, parseISO } from 'date-fns';
import type { PlanDay } from '../types';

export function toISODate(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

export function fromISODate(s: string): Date {
  return parseISO(s);
}

/**
 * Builds the full list of plan days, ending on the race date (inclusive),
 * spanning lengthWeeks * 7 days.
 */
export function buildPlanDays(raceDateISO: string, lengthWeeks: number): PlanDay[] {
  const totalDays = lengthWeeks * 7;
  const raceDate = fromISODate(raceDateISO);
  const startDate = addDays(raceDate, -(totalDays - 1));
  const days: PlanDay[] = [];
  for (let i = 0; i < totalDays; i++) {
    days.push({ date: toISODate(addDays(startDate, i)) });
  }
  return days;
}

export function formatDisplayDate(iso: string): string {
  return format(fromISODate(iso), 'EEE, MMM d, yyyy');
}

export function formatShortDate(iso: string): string {
  return format(fromISODate(iso), 'MMM d');
}

export function formatCompactDate(iso: string): string {
  return format(fromISODate(iso), 'EEE M/d/yy');
}

/**
 * Recomputes the plan's day range for a new length, carrying over any
 * existing day data for dates still in range. Returns the count of
 * already-scheduled days that fall outside the new range and would be lost.
 */
export function rebuildPlanDays(
  existingDays: PlanDay[],
  raceDateISO: string,
  lengthWeeks: number,
): { days: PlanDay[]; droppedFilled: number } {
  const newDates = buildPlanDays(raceDateISO, lengthWeeks);
  const oldByDate = new Map(existingDays.map((d) => [d.date, d]));
  const newDateSet = new Set(newDates.map((d) => d.date));

  const days = newDates.map((nd) => oldByDate.get(nd.date) ?? nd);
  const droppedFilled = existingDays.filter((d) => !newDateSet.has(d.date) && d.dayType).length;

  return { days, droppedFilled };
}
