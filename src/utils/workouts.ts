import type { IntervalRep, LongRunWorkout, PlanDay, RunLog, RunPurpose } from '../types';

export const METERS_PER_MILE = 1609.344;
export const STRIDE_SECONDS = 30;

const KIND_METERS: Partial<Record<string, number>> = { '400m': 400, '800m': 800, '1200m': 1200 };

/** "6:42", or "1:02:05" past an hour. */
export function formatDuration(totalSeconds: number): string {
  const s = Math.round(totalSeconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
}

/** Up to two decimals, without trailing zeros: 2, 0.5, 0.75. */
function formatDistance(n: number): string {
  return String(Math.round(n * 100) / 100);
}

/** Miles covered by a rep, or undefined if not enough is entered yet. */
export function repMiles(rep: IntervalRep): number | undefined {
  if (!rep.kind) return undefined;
  const meters = KIND_METERS[rep.kind];
  if (meters) return meters / METERS_PER_MILE;
  if (rep.kind === '1mi') return 1;
  if (rep.kind === 'custom') {
    if (!rep.customDistance) return undefined;
    return rep.customUnit === 'mi' ? rep.customDistance : rep.customDistance / METERS_PER_MILE;
  }
  return rep.distanceMiles || undefined;
}

/** Seconds per mile for a rep, or undefined if its time or distance is missing. */
export function repPaceSeconds(rep: IntervalRep): number | undefined {
  const miles = repMiles(rep);
  return miles && rep.seconds ? rep.seconds / miles : undefined;
}

function repLabel(rep: IntervalRep): string {
  switch (rep.kind) {
    case undefined:
      return 'interval';
    case '1mi':
      return '1 mi';
    case 'custom':
      if (!rep.customDistance) return 'custom';
      return rep.customUnit === 'mi' ? `${formatDistance(rep.customDistance)} mi` : `${formatDistance(rep.customDistance)}m`;
    case 'time':
      return rep.seconds ? formatDuration(rep.seconds) : 'time';
    default:
      return rep.kind;
  }
}

function intervalsSummary(reps: IntervalRep[]): string | undefined {
  if (reps.length === 0) return undefined;
  const labels = reps.map(repLabel);
  const head =
    reps.every((r) => r.kind) && labels.every((l) => l === labels[0])
      ? `${reps.length} × ${labels[0]}`
      : `${reps.length} intervals`;
  // Average weighted by distance: total time over total miles.
  let seconds = 0;
  let miles = 0;
  for (const rep of reps) {
    const m = repMiles(rep);
    if (m && rep.seconds) {
      seconds += rep.seconds;
      miles += m;
    }
  }
  return miles > 0 ? `${head} · avg ${formatDuration(seconds / miles)} /mi` : head;
}

function workoutSummary(w: LongRunWorkout): string {
  const amount =
    w.measure === 'distance'
      ? w.distanceMiles
        ? ` ${formatDistance(w.distanceMiles)} mi`
        : ''
      : w.seconds
        ? ` ${formatDuration(w.seconds)}`
        : '';
  const pace = w.paceSeconds ? ` @ ${formatDuration(w.paceSeconds)} /mi` : '';
  return `${w.kind}${amount}${pace}`;
}

/**
 * The run type that was actually run: the extra run's on a rest day, the logged type when a planned
 * run was done as something else, otherwise the plan's.
 */
export function loggedPurpose(day: PlanDay): RunPurpose | undefined {
  if (day.log?.status === 'extra_run' && day.dayType === 'rest') return day.log.extraPurpose ?? 'General Aerobic';
  if (day.log?.status === 'completed' && day.log.actualPurpose) return day.log.actualPurpose;
  return day.run?.purpose;
}

/** One line describing the workout details logged for a day, e.g. "6 × 800m · avg 6:48 /mi". */
export function workoutDetail(purpose: RunPurpose | undefined, log: RunLog | undefined): string | undefined {
  if (!log || log.status === 'skipped') return undefined;
  switch (purpose) {
    case 'Threshold':
      return log.thresholdPaces?.length
        ? `Threshold ${log.thresholdPaces.map(formatDuration).join(', ')} /mi`
        : undefined;
    case 'Intervals':
      return intervalsSummary(log.intervals ?? []);
    case 'Long Run':
      return log.longRunWorkouts?.length ? log.longRunWorkouts.map(workoutSummary).join(' · ') : undefined;
    case 'General Aerobic': {
      const s = log.strides;
      if (!s || (!s.count && !s.paceSeconds)) return undefined;
      const pace = s.paceSeconds ? ` @ ${formatDuration(s.paceSeconds)} /mi` : '';
      return s.count ? `${s.count} × strides${pace}` : `Strides${pace}`;
    }
    default:
      return undefined;
  }
}
