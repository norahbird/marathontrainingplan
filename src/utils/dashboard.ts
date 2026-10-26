// Numbers behind the "How training is going" dashboard. Everything is computed from the plan and
// today's date, so it can be checked without rendering.
import type { IntervalRep, PlanDay, RunPurpose, TrainingPlan } from '../types';
import { groupIntoWeeks, weekIndexFor } from './dates';
import { actualMiles, dayActualMiles, dayPlannedMiles, plannedMiles } from './display';
import { formatDuration, loggedPurpose, repMiles } from './workouts';

export interface WeekMiles {
  /** 1-based week number. */
  week: number;
  start: string;
  end: string;
  planned: number;
  actual: number;
  future: boolean;
  current: boolean;
}

export interface LongRunPoint {
  date: string;
  week: number;
  miles: number;
  /** A future long run from the plan, not yet run. */
  planned: boolean;
}

export interface PacePoint {
  date: string;
  /** Seconds per mile. */
  pace: number;
  /** Extra detail for the readout, e.g. "Sections 7:05, 7:02" or "6 × 800m". */
  note: string;
}

export interface FeelPoint {
  date: string;
  rating: number;
  purpose?: RunPurpose;
}

export interface FeelWeek {
  week: number;
  /** Middle of the week, for placing the average on a time axis. */
  mid: string;
  average: number;
}

export const INTERVAL_FILTERS = ['All', '400m', '800m', '1200m', '1 mi', 'Other'] as const;
export type IntervalFilter = (typeof INTERVAL_FILTERS)[number];

export interface Dashboard {
  milesToDate: { planned: number; actual: number };
  runsToDate: { planned: number; completed: number; skipped: number };
  thisWeek: WeekMiles;
  weeks: WeekMiles[];
  longRuns: LongRunPoint[];
  threshold: PacePoint[];
  /** Interval sessions, per rep-distance filter (only filters with data, plus All). */
  intervals: Partial<Record<IntervalFilter, PacePoint[]>>;
  feel: FeelPoint[];
  feelWeeks: FeelWeek[];
  feelThisWeek?: number;
  feelLastWeek?: number;
}

const isRun = (day: PlanDay) => day.dayType === 'run' || day.dayType === 'race';
/** Logged as a run that happened (a completed run, or an extra run on a rest day). */
const ran = (day: PlanDay) => day.log?.status === 'completed' || day.log?.status === 'extra_run';
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

function filterFor(rep: IntervalRep): IntervalFilter {
  switch (rep.kind) {
    case '400m':
    case '800m':
    case '1200m':
      return rep.kind;
    case '1mi':
      return '1 mi';
    default:
      return 'Other';
  }
}

/** Distance-weighted average pace of a set of reps: total time over total distance. */
function sessionPace(reps: IntervalRep[]): number | undefined {
  let seconds = 0;
  let miles = 0;
  for (const rep of reps) {
    const m = repMiles(rep);
    if (m && rep.seconds) {
      seconds += rep.seconds;
      miles += m;
    }
  }
  return miles > 0 ? seconds / miles : undefined;
}

function repsNote(reps: IntervalRep[]): string {
  const counts = new Map<IntervalFilter, number>();
  for (const rep of reps) counts.set(filterFor(rep), (counts.get(filterFor(rep)) ?? 0) + 1);
  return [...counts].map(([f, n]) => `${n} × ${f === 'Other' ? 'other' : f}`).join(', ');
}

export function buildDashboard(plan: TrainingPlan, todayISO: string): Dashboard {
  const days = plan.days;
  const toDate = days.filter((d) => d.date <= todayISO);
  const weeksOfDays = groupIntoWeeks(days, plan.weekStartsOn ?? 0);
  const currentIndex = weekIndexFor(weeksOfDays, todayISO);
  const weekNumber = new Map<string, number>();
  weeksOfDays.forEach((w, i) => w.forEach((d) => weekNumber.set(d.date, i + 1)));

  const weeks: WeekMiles[] = weeksOfDays.map((w, i) => ({
    week: i + 1,
    start: w[0].date,
    end: w[w.length - 1].date,
    planned: plannedMiles(w, plan.raceDistance),
    actual: actualMiles(w),
    future: w[0].date > todayISO,
    current: i === currentIndex,
  }));

  const plannedRuns = toDate.filter(isRun);

  // Long runs: what was actually run as a long run, then the plan's long runs still ahead.
  const longRuns: LongRunPoint[] = [];
  for (const day of days) {
    const week = weekNumber.get(day.date)!;
    if (ran(day) && loggedPurpose(day) === 'Long Run') {
      const miles = dayActualMiles(day);
      if (miles) longRuns.push({ date: day.date, week, miles, planned: false });
    } else if (!day.log && day.date > todayISO && day.dayType === 'run' && day.run?.purpose === 'Long Run') {
      const miles = dayPlannedMiles(day, plan.raceDistance);
      if (miles) longRuns.push({ date: day.date, week, miles, planned: true });
    }
  }

  const threshold: PacePoint[] = [];
  const intervals: Partial<Record<IntervalFilter, PacePoint[]>> = {};
  const feel: FeelPoint[] = [];
  for (const day of days) {
    if (!ran(day)) continue;
    const log = day.log!;
    const purpose = loggedPurpose(day);
    if (log.feel) feel.push({ date: day.date, rating: log.feel, purpose });

    if (purpose === 'Threshold' && log.thresholdPaces?.length) {
      threshold.push({
        date: day.date,
        pace: mean(log.thresholdPaces),
        note: `${log.thresholdPaces.length > 1 ? 'Sections' : 'Section'} ${log.thresholdPaces.map(formatDuration).join(', ')}`,
      });
    }
    if (purpose === 'Intervals' && log.intervals?.length) {
      for (const filter of INTERVAL_FILTERS) {
        const reps = filter === 'All' ? log.intervals : log.intervals.filter((r) => filterFor(r) === filter);
        const pace = reps.length ? sessionPace(reps) : undefined;
        if (pace) (intervals[filter] ??= []).push({ date: day.date, pace, note: repsNote(reps) });
      }
    }
  }

  const feelByWeek = new Map<number, number[]>();
  for (const p of feel) {
    const w = weekNumber.get(p.date)!;
    feelByWeek.set(w, [...(feelByWeek.get(w) ?? []), p.rating]);
  }
  const feelWeeks: FeelWeek[] = [...feelByWeek]
    .sort(([a], [b]) => a - b)
    .map(([week, ratings]) => {
      const w = weeksOfDays[week - 1];
      return { week, mid: w[Math.floor(w.length / 2)].date, average: mean(ratings) };
    });
  const avgFor = (week: number) => feelWeeks.find((w) => w.week === week)?.average;

  return {
    milesToDate: { planned: plannedMiles(toDate, plan.raceDistance), actual: actualMiles(toDate) },
    runsToDate: {
      planned: plannedRuns.length,
      completed: plannedRuns.filter((d) => d.log?.status === 'completed').length,
      skipped: plannedRuns.filter((d) => d.log?.status === 'skipped').length,
    },
    thisWeek: weeks[currentIndex],
    weeks,
    longRuns,
    threshold,
    intervals,
    feel,
    feelWeeks,
    feelThisWeek: avgFor(currentIndex + 1),
    feelLastWeek: currentIndex > 0 ? avgFor(currentIndex) : undefined,
  };
}
