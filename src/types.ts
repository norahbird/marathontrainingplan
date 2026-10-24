export const RUN_PURPOSES = [
  'General Aerobic',
  'Long Run',
  'Threshold',
  'Intervals',
  'Recovery',
  'Tune-up Race',
] as const;

export type RunPurpose = (typeof RUN_PURPOSES)[number];

export type RunMetric = 'distance' | 'time';

export interface PlannedRun {
  metric: RunMetric;
  distanceMiles?: number;
  timeMinutes?: number;
  purpose: RunPurpose;
  description: string;
}

export type LogStatus = 'completed' | 'skipped' | 'extra_run';

export const INTERVAL_KINDS = ['400m', '800m', '1200m', '1mi', 'custom', 'time'] as const;
export type IntervalKind = (typeof INTERVAL_KINDS)[number];

/** One interval rep. Distance reps record their time; time reps record the distance covered. */
export interface IntervalRep {
  /** Missing only on reps carried over from the old free-text interval times. */
  kind?: IntervalKind;
  /** How long the rep took (or lasted, for a time rep), in seconds. */
  seconds?: number;
  /** For 'custom' reps. */
  customDistance?: number;
  customUnit?: 'm' | 'mi';
  /** Distance covered on a 'time' rep. */
  distanceMiles?: number;
}

export const LONG_RUN_WORKOUT_KINDS = ['Progression', 'Race Pace'] as const;
export type LongRunWorkoutKind = (typeof LONG_RUN_WORKOUT_KINDS)[number];

export interface LongRunWorkout {
  kind: LongRunWorkoutKind;
  measure: 'distance' | 'time';
  distanceMiles?: number;
  seconds?: number;
  /** Average pace, in seconds per mile. */
  paceSeconds?: number;
}

/** Strides are always 30 seconds each, so only the count and pace are logged. */
export interface StridesLog {
  count?: number;
  /** Seconds per mile. */
  paceSeconds?: number;
}

export interface RunLog {
  status: LogStatus;
  /** Only set when status === 'extra_run' on a day that was planned as rest. */
  extraPurpose?: RunPurpose;
  /** Set when a planned run was completed as a different type (e.g. planned Recovery, ran Threshold). */
  actualPurpose?: RunPurpose;
  actualDistanceMiles?: number;
  /** Only used for runs planned by time. */
  actualTimeMinutes?: number;
  shoes?: string;
  notes?: string;
  /** Old free-text interval times. New logs use `intervals`; kept for entries that couldn't be converted. */
  intervalTimes?: string[];
  /** Threshold runs: pace of each threshold section, in seconds per mile. */
  thresholdPaces?: number[];
  intervals?: IntervalRep[];
  longRunWorkouts?: LongRunWorkout[];
  /** General Aerobic runs. */
  strides?: StridesLog;
}

export type DayType = 'run' | 'rest' | 'race';

export interface PlanDay {
  date: string; // ISO yyyy-MM-dd
  dayType?: DayType; // undefined until set in the builder; 'race' is set automatically
  run?: PlannedRun; // present when dayType === 'run'
  log?: RunLog;
}

/** 0 = Sunday, 1 = Monday (matches date-fns' weekStartsOn). */
export type WeekStartsOn = 0 | 1;

export interface TrainingPlan {
  id: string;
  name: string;
  raceName: string;
  raceDistance: string;
  raceDate: string; // ISO yyyy-MM-dd
  goalTime: string;
  lengthWeeks: number;
  runDaysPerWeek: number;
  weekStartsOn: WeekStartsOn;
  createdAt: string;
  finalized: boolean;
  days: PlanDay[];
}

export const RACE_DISTANCES = ['5K', '10K', 'Half Marathon', 'Marathon', 'Other'] as const;
