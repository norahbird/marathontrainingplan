import type { PlanDay, RunPurpose } from '../types';
import { RACE_DISTANCE_MILES } from './pace';

export const PURPOSE_COLORS: Record<RunPurpose, string> = {
  'General Aerobic': '#2f6fb3',
  'Long Run': '#c0392b',
  Threshold: '#e07b1a',
  Intervals: '#7d3c9e',
  Recovery: '#d4b30a',
  'Tune-up Race': '#2e9e5b',
};

export const REST_COLOR = '#1c1c1c';
export const RACE_DAY_COLOR = '#d6336c';
export const RACE_DAY_TAG = 'Race Day!';

export function dayColor(day: PlanDay): string {
  if (day.dayType === 'rest') return REST_COLOR;
  if (day.dayType === 'race') return RACE_DAY_COLOR;
  if (day.dayType === 'run' && day.run) return PURPOSE_COLORS[day.run.purpose];
  return '#9aa0a6';
}

/** "13.1 miles" for a standard race distance, or the raw text for a custom one. */
export function raceDayDistanceText(raceDistance: string): string {
  const miles = RACE_DISTANCE_MILES[raceDistance];
  return miles ? `${formatMiles(miles)} miles` : raceDistance;
}

export function raceDayLabel(raceDistance: string): string {
  return `${RACE_DAY_TAG} — ${raceDayDistanceText(raceDistance)}`;
}

/** Planned miles: distance-based runs plus race day; time-based runs are excluded. */
export function plannedMiles(days: PlanDay[], raceDistance: string): number {
  return days.reduce((total, day) => {
    if (day.dayType === 'run' && day.run?.metric === 'distance' && day.run.distanceMiles) {
      return total + day.run.distanceMiles;
    }
    if (day.dayType === 'race') return total + (RACE_DISTANCE_MILES[raceDistance] ?? 0);
    return total;
  }, 0);
}

/**
 * A day's logged miles, or undefined if nothing was run/logged. Skipped runs have none;
 * a completed run with no distance entered counts its planned distance.
 */
export function dayActualMiles(day: PlanDay): number | undefined {
  const log = day.log;
  if (!log || log.status === 'skipped') return undefined;
  if (log.actualDistanceMiles !== undefined) return log.actualDistanceMiles;
  if (log.status === 'completed' && day.run?.metric === 'distance') return day.run.distanceMiles;
  return undefined;
}

/** A day's planned miles, or undefined for rest days and time-based runs. */
export function dayPlannedMiles(day: PlanDay, raceDistance: string): number | undefined {
  if (day.dayType === 'run' && day.run?.metric === 'distance') return day.run.distanceMiles;
  if (day.dayType === 'race') return RACE_DISTANCE_MILES[raceDistance];
  return undefined;
}

export function actualMiles(days: PlanDay[]): number {
  return days.reduce((total, day) => total + (dayActualMiles(day) ?? 0), 0);
}

export function dayCellLabel(day: PlanDay): string {
  if (day.dayType === 'rest') return 'Rest';
  if (day.dayType === 'run' && day.run) {
    return day.run.metric === 'distance'
      ? `${formatNumber(day.run.distanceMiles)} miles`
      : `${formatNumber(day.run.timeMinutes)} minutes`;
  }
  return '';
}

/**
 * Compact calendar label for narrow screens. Distances are bare numbers (miles are implied)
 * so they fit on one line, e.g. "6", "Race 13.1"; times get a one-letter unit, e.g. "30m".
 */
export function dayCellShortLabel(day: PlanDay, raceDistance: string): string {
  if (day.dayType === 'rest') return 'Rest';
  if (day.dayType === 'race') {
    const miles = RACE_DISTANCE_MILES[raceDistance];
    return miles ? `Race ${formatMiles(miles)}` : 'Race';
  }
  if (day.dayType === 'run' && day.run) {
    return day.run.metric === 'distance'
      ? formatNumber(day.run.distanceMiles)
      : `${formatNumber(day.run.timeMinutes)}m`;
  }
  return '';
}

// Narrow no-break space: keeps "✓ 30m" on one line in the tight phone calendar cells.
const SHORT_CHECK = '✓\u202f';

export interface CalendarBubble {
  label: string;
  shortLabel: string;
  color: string;
  /** Logged as less than planned: a skipped run, or fewer miles than the plan called for. */
  short: boolean;
}

/**
 * What a calendar day shows: the plan, or once a day is logged, what actually happened.
 * Skipped runs show as Rest; logged runs show actual miles with a check mark.
 */
export function calendarBubble(day: PlanDay, raceDistance: string): CalendarBubble {
  const log = day.log;
  if (log?.status === 'skipped') {
    return { label: 'Rest', shortLabel: 'Rest', color: REST_COLOR, short: day.dayType === 'run' || day.dayType === 'race' };
  }

  const planned: CalendarBubble = {
    label: day.dayType === 'race' ? raceDayLabel(raceDistance) : dayCellLabel(day),
    shortLabel: dayCellShortLabel(day, raceDistance),
    color: dayColor(day),
    short: false,
  };
  if (!log) return planned;

  const color =
    log.status === 'extra_run' && day.dayType === 'rest'
      ? PURPOSE_COLORS[log.extraPurpose ?? 'General Aerobic']
      : planned.color;
  const actual = dayActualMiles(day);
  if (actual !== undefined) {
    const target = dayPlannedMiles(day, raceDistance);
    // Compare at the 0.01 mi precision distances are shown at.
    const short = target !== undefined && Math.round(actual * 100) < Math.round(target * 100);
    return { label: `✓ ${formatMiles(actual)} miles`, shortLabel: `${SHORT_CHECK}${formatMiles(actual)}`, color, short };
  }
  // Logged but no distance to show (e.g. a completed time-based run).
  return { label: `✓ ${planned.label}`, shortLabel: `${SHORT_CHECK}${planned.shortLabel}`, color, short: false };
}

export interface LogRowSummary {
  tag: string;
  color: string;
  /** The prominent text: the plan until the day is logged, then what actually happened. */
  main: string;
  /** Smaller text: logging status before, the original plan after. */
  secondary: string;
  logged: boolean;
  skipped: boolean;
}

export function logRowSummary(day: PlanDay, raceDistance: string): LogRowSummary {
  const log = day.log;
  const plannedText = day.dayType === 'race' ? raceDayDistanceText(raceDistance) : dayCellLabel(day);
  const plannedTag =
    day.dayType === 'rest' ? 'Rest' : day.dayType === 'race' ? RACE_DAY_TAG : (day.run?.purpose ?? '—');

  if (!log) {
    return {
      tag: plannedTag,
      color: dayColor(day),
      main: plannedText,
      secondary: day.dayType === 'run' ? 'Not logged yet' : '',
      logged: false,
      skipped: false,
    };
  }

  const ranOnRestDay = log.status === 'extra_run' && day.dayType === 'rest';
  const extraPurpose = log.extraPurpose ?? 'General Aerobic';
  const tag = ranOnRestDay ? extraPurpose : plannedTag;
  const color = ranOnRestDay ? PURPOSE_COLORS[extraPurpose] : dayColor(day);
  const plannedNote = ranOnRestDay ? 'Ran instead of resting' : `Planned: ${plannedText}`;

  if (log.status === 'skipped') {
    return { tag, color, main: 'Skipped', secondary: plannedNote, logged: true, skipped: true };
  }
  const actual = dayActualMiles(day);
  return actual !== undefined
    ? { tag, color, main: `✓ ${formatMiles(actual)} miles`, secondary: plannedNote, logged: true, skipped: false }
    : // Completed with nothing to compare (e.g. a time-based run): the plan is what happened.
      { tag, color, main: `✓ ${plannedText}`, secondary: ranOnRestDay ? plannedNote : '', logged: true, skipped: false };
}

function formatNumber(n: number | undefined): string {
  if (n === undefined) return '';
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

export function formatMiles(n: number): string {
  return formatNumber(Math.round(n * 10) / 10);
}
