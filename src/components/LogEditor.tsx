import { useState } from 'react';
import { LogStatus, PlanDay, RUN_PURPOSES, RunLog, RunPurpose } from '../types';
import { IntervalFields, LongRunFields, StridesFields, ThresholdFields } from './WorkoutFields';
import {
  IntervalDraft,
  intervalDrafts,
  intervalsFromDrafts,
  MinSecDraft,
  StridesDraft,
  stridesDraft,
  stridesFromDraft,
  thresholdDrafts,
  thresholdFromDrafts,
  WorkoutDraft,
  workoutDrafts,
  workoutsFromDrafts,
} from './workoutDrafts';

interface Props {
  day: PlanDay;
  onSave: (log: RunLog | undefined) => void;
  onClose: () => void;
}

export default function LogEditor({ day, onSave, onClose }: Props) {
  const isRunDay = day.dayType === 'run';
  const existing = day.log;

  const plannedDistance =
    isRunDay && day.run?.metric === 'distance' ? day.run.distanceMiles : undefined;
  const isTimeRun = isRunDay && day.run?.metric === 'time';
  const plannedMinutes = isTimeRun ? day.run?.timeMinutes : undefined;

  const [ranInstead, setRanInstead] = useState(!isRunDay && existing?.status === 'extra_run');
  const [status, setStatus] = useState<LogStatus | null>(existing?.status ?? null);
  const [extraPurpose, setExtraPurpose] = useState<RunPurpose>(existing?.extraPurpose ?? 'General Aerobic');
  const plannedPurpose = isRunDay ? day.run?.purpose : undefined;
  // The type actually run on a planned run day; starts as the plan.
  const [actualPurpose, setActualPurpose] = useState<RunPurpose | undefined>(existing?.actualPurpose ?? plannedPurpose);
  const [actualDistanceMiles, setActualDistanceMiles] = useState<string>(() => {
    if (existing?.actualDistanceMiles !== undefined) return String(existing.actualDistanceMiles);
    if (existing?.status === 'completed' && plannedDistance !== undefined) return String(plannedDistance);
    return '';
  });
  const [actualTimeMinutes, setActualTimeMinutes] = useState<string>(() => {
    if (existing?.actualTimeMinutes !== undefined) return String(existing.actualTimeMinutes);
    if (existing?.status === 'completed' && plannedMinutes !== undefined) return String(plannedMinutes);
    return '';
  });
  const [shoes, setShoes] = useState(existing?.shoes ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [thresholdPaces, setThresholdPaces] = useState<MinSecDraft[]>(() => thresholdDrafts(existing));
  const [initialIntervals] = useState(() => intervalDrafts(existing));
  const [intervals, setIntervals] = useState<IntervalDraft[]>(initialIntervals.rows);
  const [workouts, setWorkouts] = useState<WorkoutDraft[]>(() => workoutDrafts(existing));
  const [strides, setStrides] = useState<StridesDraft | null>(() => stridesDraft(existing));

  const effectivePurpose: RunPurpose | undefined = isRunDay ? actualPurpose : extraPurpose;

  function persist(
    next: Partial<{
      status: LogStatus;
      ranInstead: boolean;
      extraPurpose: RunPurpose;
      actualPurpose: RunPurpose;
      actualDistanceMiles: string;
      actualTimeMinutes: string;
      thresholdPaces: MinSecDraft[];
      intervals: IntervalDraft[];
      workouts: WorkoutDraft[];
      strides: StridesDraft | null;
    }> = {},
  ) {
    const nextRanInstead = next.ranInstead ?? ranInstead;
    const nextStatus = next.status ?? status;
    const nextExtraPurpose = next.extraPurpose ?? extraPurpose;
    const nextActualPurpose = next.actualPurpose ?? actualPurpose;
    const nextDistance = next.actualDistanceMiles ?? actualDistanceMiles;
    const nextMinutes = next.actualTimeMinutes ?? actualTimeMinutes;

    if (!isRunDay && !nextRanInstead) {
      onSave(undefined);
      return;
    }
    if (isRunDay && !nextStatus) return;

    // Workout details only belong to a run that happened, and only for its run type.
    const ran = !isRunDay || nextStatus === 'completed';
    const purpose = isRunDay ? (ran ? nextActualPurpose : plannedPurpose) : nextExtraPurpose;
    const log: RunLog = {
      status: isRunDay ? nextStatus! : 'extra_run',
      extraPurpose: isRunDay ? undefined : nextExtraPurpose,
      actualPurpose: isRunDay && ran && purpose !== plannedPurpose ? purpose : undefined,
      actualDistanceMiles: nextDistance.trim() ? Number(nextDistance) : undefined,
      actualTimeMinutes: isTimeRun && nextMinutes.trim() ? Number(nextMinutes) : undefined,
      shoes: shoes.trim() || undefined,
      notes: notes.trim() || undefined,
      intervalTimes:
        ran && purpose === 'Intervals' && initialIntervals.leftovers.length ? initialIntervals.leftovers : undefined,
      thresholdPaces: ran && purpose === 'Threshold' ? thresholdFromDrafts(next.thresholdPaces ?? thresholdPaces) : undefined,
      intervals: ran && purpose === 'Intervals' ? intervalsFromDrafts(next.intervals ?? intervals) : undefined,
      longRunWorkouts: ran && purpose === 'Long Run' ? workoutsFromDrafts(next.workouts ?? workouts) : undefined,
      strides: ran && purpose === 'General Aerobic' ? stridesFromDraft(next.strides !== undefined ? next.strides : strides) : undefined,
    };
    onSave(log);
  }

  function handleSaveAndClose() {
    persist();
    onClose();
  }

  function handleRemoveLog() {
    const log = day.log;
    const hasDetails =
      shoes.trim() !== '' ||
      notes.trim() !== '' ||
      Boolean(log?.intervalTimes?.length || log?.thresholdPaces || log?.intervals || log?.longRunWorkouts || log?.strides);
    if (hasDetails && !confirm('Remove this log? Your shoes, notes, and workout details for this day will be cleared.')) {
      return;
    }
    onSave(undefined);
    onClose();
  }

  return (
    <div className="log-editor">
      {!isRunDay && (
        <div className="field">
          <label>
            <input
              type="checkbox"
              checked={ranInstead}
              onChange={(e) => {
                setRanInstead(e.target.checked);
                persist({ ranInstead: e.target.checked });
              }}
            />{' '}
            I ran today instead of resting
          </label>
        </div>
      )}

      {isRunDay && (
        <div className="field">
          <label>Status</label>
          <div className="radio-group">
            <label>
              <input
                type="radio"
                checked={status === 'completed'}
                onChange={() => {
                  setStatus('completed');
                  // Start from the plan; edit it down if the run came up short.
                  const prefill: { actualDistanceMiles?: string; actualTimeMinutes?: string } = {};
                  if (!actualDistanceMiles.trim() && plannedDistance !== undefined) {
                    prefill.actualDistanceMiles = String(plannedDistance);
                    setActualDistanceMiles(prefill.actualDistanceMiles);
                  }
                  if (!actualTimeMinutes.trim() && plannedMinutes !== undefined) {
                    prefill.actualTimeMinutes = String(plannedMinutes);
                    setActualTimeMinutes(prefill.actualTimeMinutes);
                  }
                  persist({ status: 'completed', ...prefill });
                }}
              />
              Completed
            </label>
            <label>
              <input
                type="radio"
                checked={status === 'skipped'}
                onChange={() => {
                  setStatus('skipped');
                  persist({ status: 'skipped' });
                }}
              />
              Skipped
            </label>
          </div>
        </div>
      )}

      {((isRunDay && status === 'completed') || (!isRunDay && ranInstead)) && (
        <>
          <div className="field">
            <label htmlFor="run-type">Type of run</label>
            <select
              id="run-type"
              value={(isRunDay ? actualPurpose : extraPurpose) ?? ''}
              onChange={(e) => {
                const value = e.target.value as RunPurpose;
                if (isRunDay) {
                  setActualPurpose(value);
                  persist({ actualPurpose: value });
                } else {
                  setExtraPurpose(value);
                  persist({ extraPurpose: value });
                }
              }}
            >
              {RUN_PURPOSES.map((p) => (
                <option key={p} value={p}>
                  {p === plannedPurpose ? `${p} (planned)` : p}
                </option>
              ))}
            </select>
          </div>

          {isTimeRun && (
            <div className="field">
              <label htmlFor="actual-time">Actual time (minutes)</label>
              <input
                id="actual-time"
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                value={actualTimeMinutes}
                onChange={(e) => setActualTimeMinutes(e.target.value)}
                onBlur={() => persist()}
              />
            </div>
          )}

          <div className="field">
            <label htmlFor="actual-distance">Actual distance (miles)</label>
            <input
              id="actual-distance"
              type="number"
              min={0}
              step={0.1}
              value={actualDistanceMiles}
              onChange={(e) => setActualDistanceMiles(e.target.value)}
              onBlur={() => persist()}
            />
          </div>

          {effectivePurpose === 'Threshold' && (
            <ThresholdFields
              value={thresholdPaces}
              onChange={setThresholdPaces}
              onCommit={(next) => {
                setThresholdPaces(next);
                persist({ thresholdPaces: next });
              }}
            />
          )}
          {effectivePurpose === 'Intervals' && (
            <IntervalFields
              value={intervals}
              leftovers={initialIntervals.leftovers}
              onChange={setIntervals}
              onCommit={(next) => {
                setIntervals(next);
                persist({ intervals: next });
              }}
            />
          )}
          {effectivePurpose === 'Long Run' && (
            <LongRunFields
              value={workouts}
              onChange={setWorkouts}
              onCommit={(next) => {
                setWorkouts(next);
                persist({ workouts: next });
              }}
            />
          )}
          {effectivePurpose === 'General Aerobic' && (
            <StridesFields
              value={strides}
              onChange={setStrides}
              onCommit={(next) => {
                setStrides(next);
                persist({ strides: next });
              }}
            />
          )}

          <div className="field">
            <label htmlFor="shoes">Shoes</label>
            <input
              id="shoes"
              type="text"
              value={shoes}
              onChange={(e) => setShoes(e.target.value)}
              onBlur={() => persist()}
            />
          </div>

          <div className="field">
            <label htmlFor="notes">Notes</label>
            <textarea
              id="notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={() => persist()}
            />
          </div>

        </>
      )}

      <div className="log-actions">
        {day.log && (
          <button type="button" className="btn-danger" onClick={handleRemoveLog}>
            Remove log
          </button>
        )}
        <button type="button" className="btn" onClick={handleSaveAndClose}>
          Save &amp; close
        </button>
      </div>
    </div>
  );
}
