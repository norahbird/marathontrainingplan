import { addDays, format, getDay, parseISO } from 'date-fns';
import type { PlanDay, WeekStartsOn } from '../types';

export function toISODate(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

export function fromISODate(s: string): Date {
  return parseISO(s);
}

/**
 * Builds the full list of plan days, ending on the race date (inclusive).
 * The plan spans exactly lengthWeeks calendar weeks aligned to weekStartsOn,
 * so week 1 starts on that weekday and the race date falls within the final
 * week (which may be a partial week if race day isn't the week's last day).
 */
export function buildPlanDays(
  raceDateISO: string,
  lengthWeeks: number,
  weekStartsOn: WeekStartsOn,
): PlanDay[] {
  const raceDate = fromISODate(raceDateISO);
  const daysSinceWeekStart = (getDay(raceDate) - weekStartsOn + 7) % 7;
  const totalDays = daysSinceWeekStart + (lengthWeeks - 1) * 7 + 1;
  const startDate = addDays(raceDate, -(totalDays - 1));

  const days: PlanDay[] = [];
  for (let i = 0; i < totalDays; i++) {
    days.push({ date: toISODate(addDays(startDate, i)) });
  }
  days[days.length - 1].dayType = 'race';
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
  weekStartsOn: WeekStartsOn,
): { days: PlanDay[]; droppedFilled: number } {
  const newDates = buildPlanDays(raceDateISO, lengthWeeks, weekStartsOn);
  const oldByDate = new Map(existingDays.map((d) => [d.date, d]));
  const newDateSet = new Set(newDates.map((d) => d.date));

  const days = newDates.map((nd) => oldByDate.get(nd.date) ?? nd);
  const droppedFilled = existingDays.filter((d) => !newDateSet.has(d.date) && d.dayType).length;

  return { days, droppedFilled };
}

/**
 * Groups plan days into calendar weeks that start on the given weekday.
 * The first and/or last group may be a partial week if the plan's date
 * range doesn't line up with that weekday.
 */
export function groupIntoWeeks(days: PlanDay[], weekStartsOn: WeekStartsOn): PlanDay[][] {
  const weeks: PlanDay[][] = [];
  let current: PlanDay[] = [];
  days.forEach((day, idx) => {
    if (idx > 0 && getDay(fromISODate(day.date)) === weekStartsOn) {
      weeks.push(current);
      current = [];
    }
    current.push(day);
  });
  if (current.length) weeks.push(current);
  return weeks;
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function weekdayLabels(weekStartsOn: WeekStartsOn): string[] {
  return [...WEEKDAY_LABELS.slice(weekStartsOn), ...WEEKDAY_LABELS.slice(0, weekStartsOn)];
}
