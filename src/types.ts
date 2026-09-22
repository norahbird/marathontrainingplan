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

export interface RunLog {
  status: LogStatus;
  /** Only set when status === 'extra_run' on a day that was planned as rest. */
  extraPurpose?: RunPurpose;
  actualDistanceMiles?: number;
  shoes?: string;
  notes?: string;
  intervalTimes?: string[];
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
