// What's typed into the workout fields of the run logger, kept as strings while editing and
// converted to numbers (seconds, miles) when saved.
import type { IntervalKind, IntervalRep, LongRunWorkout, LongRunWorkoutKind, RunLog, StridesLog } from '../types';

export interface MinSecDraft {
  min: string;
  sec: string;
}

export interface IntervalDraft {
  kind: IntervalKind | '';
  time: MinSecDraft;
  customDistance: string;
  customUnit: 'm' | 'mi';
  distanceMiles: string;
}

export interface WorkoutDraft {
  kind: LongRunWorkoutKind;
  measure: 'distance' | 'time';
  distanceMiles: string;
  time: MinSecDraft;
  pace: MinSecDraft;
}

export interface StridesDraft {
  count: string;
  pace: MinSecDraft;
}

export const emptyMinSec = (): MinSecDraft => ({ min: '', sec: '' });

export function minSecToSeconds(d: MinSecDraft): number | undefined {
  if (!d.min.trim() && !d.sec.trim()) return undefined;
  const total = (Number(d.min) || 0) * 60 + (Number(d.sec) || 0);
  return total > 0 ? total : undefined;
}

export function secondsToMinSec(seconds: number | undefined): MinSecDraft {
  if (!seconds) return emptyMinSec();
  const s = Math.round(seconds);
  return { min: String(Math.floor(s / 60)), sec: String(s % 60).padStart(2, '0') };
}

function toNumber(value: string): number | undefined {
  const n = Number(value);
  return value.trim() && Number.isFinite(n) && n > 0 ? n : undefined;
}

// Threshold sections ---------------------------------------------------------------------------

export function thresholdDrafts(log: RunLog | undefined): MinSecDraft[] {
  return log?.thresholdPaces?.length ? log.thresholdPaces.map(secondsToMinSec) : [emptyMinSec()];
}

export function thresholdFromDrafts(drafts: MinSecDraft[]): number[] | undefined {
  const paces = drafts.map(minSecToSeconds).filter((p): p is number => p !== undefined);
  return paces.length ? paces : undefined;
}

// Intervals ------------------------------------------------------------------------------------

export function newIntervalDraft(like?: IntervalDraft): IntervalDraft {
  return {
    kind: like?.kind || '400m',
    time: emptyMinSec(),
    customDistance: like?.kind === 'custom' ? like.customDistance : '',
    customUnit: like?.customUnit ?? 'm',
    distanceMiles: '',
  };
}

/** "6:45" -> seconds; anything else -> undefined. */
function parseLegacyTime(text: string): number | undefined {
  const m = text.trim().match(/^(\d{1,3}):([0-5]?\d)$/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : undefined;
}

/**
 * Rows for the interval editor. Old free-text times become rows with the time filled in and the
 * type left for the runner to pick; any that aren't a plain "m:ss" are returned as leftovers.
 */
export function intervalDrafts(log: RunLog | undefined): { rows: IntervalDraft[]; leftovers: string[] } {
  if (log?.intervals?.length) {
    return {
      rows: log.intervals.map((rep) => ({
        kind: rep.kind ?? '',
        time: secondsToMinSec(rep.seconds),
        customDistance: rep.customDistance !== undefined ? String(rep.customDistance) : '',
        customUnit: rep.customUnit ?? 'm',
        distanceMiles: rep.distanceMiles !== undefined ? String(rep.distanceMiles) : '',
      })),
      leftovers: log.intervalTimes ?? [],
    };
  }
  const legacy = (log?.intervalTimes ?? []).filter((t) => t.trim());
  if (legacy.length) {
    const rows: IntervalDraft[] = [];
    const leftovers: string[] = [];
    for (const text of legacy) {
      const seconds = parseLegacyTime(text);
      if (seconds === undefined) leftovers.push(text);
      else rows.push({ ...newIntervalDraft(), kind: '', time: secondsToMinSec(seconds) });
    }
    return { rows: rows.length ? rows : [newIntervalDraft()], leftovers };
  }
  return { rows: [newIntervalDraft()], leftovers: [] };
}

export function intervalFromDraft(d: IntervalDraft): IntervalRep {
  return {
    kind: d.kind || undefined,
    seconds: minSecToSeconds(d.time),
    customDistance: d.kind === 'custom' ? toNumber(d.customDistance) : undefined,
    customUnit: d.kind === 'custom' ? d.customUnit : undefined,
    distanceMiles: d.kind === 'time' ? toNumber(d.distanceMiles) : undefined,
  };
}

export function intervalsFromDrafts(drafts: IntervalDraft[]): IntervalRep[] | undefined {
  const reps = drafts
    .map(intervalFromDraft)
    .filter((r) => r.seconds !== undefined || r.customDistance !== undefined || r.distanceMiles !== undefined);
  return reps.length ? reps : undefined;
}

// Long run workouts ----------------------------------------------------------------------------

export function newWorkoutDraft(kind: LongRunWorkoutKind): WorkoutDraft {
  return { kind, measure: 'distance', distanceMiles: '', time: emptyMinSec(), pace: emptyMinSec() };
}

export function workoutDrafts(log: RunLog | undefined): WorkoutDraft[] {
  return (log?.longRunWorkouts ?? []).map((w) => ({
    kind: w.kind,
    measure: w.measure,
    distanceMiles: w.distanceMiles !== undefined ? String(w.distanceMiles) : '',
    time: secondsToMinSec(w.seconds),
    pace: secondsToMinSec(w.paceSeconds),
  }));
}

export function workoutsFromDrafts(drafts: WorkoutDraft[]): LongRunWorkout[] | undefined {
  const workouts = drafts.map((d) => ({
    kind: d.kind,
    measure: d.measure,
    distanceMiles: d.measure === 'distance' ? toNumber(d.distanceMiles) : undefined,
    seconds: d.measure === 'time' ? minSecToSeconds(d.time) : undefined,
    paceSeconds: minSecToSeconds(d.pace),
  }));
  return workouts.length ? workouts : undefined;
}

// Strides --------------------------------------------------------------------------------------

export function stridesDraft(log: RunLog | undefined): StridesDraft | null {
  const s = log?.strides;
  if (!s) return null;
  return { count: s.count !== undefined ? String(s.count) : '', pace: secondsToMinSec(s.paceSeconds) };
}

export function stridesFromDraft(d: StridesDraft | null): StridesLog | undefined {
  if (!d) return undefined;
  const count = toNumber(d.count);
  const paceSeconds = minSecToSeconds(d.pace);
  return count !== undefined || paceSeconds !== undefined
    ? { count: count !== undefined ? Math.round(count) : undefined, paceSeconds }
    : undefined;
}
