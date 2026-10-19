import { useState } from 'react';
import { LogStatus, PlanDay, RUN_PURPOSES, RunLog, RunPurpose } from '../types';

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
  const [intervalTimes, setIntervalTimes] = useState<string[]>(existing?.intervalTimes ?? ['']);

  const effectivePurpose: RunPurpose | undefined = isRunDay ? day.run?.purpose : extraPurpose;
  const showIntervalTimes = effectivePurpose === 'Intervals' && (isRunDay ? status === 'completed' : ranInstead);

  function persist(
    next: Partial<{
      status: LogStatus;
      ranInstead: boolean;
      intervalTimes: string[];
      extraPurpose: RunPurpose;
      actualDistanceMiles: string;
      actualTimeMinutes: string;
    }> = {},
  ) {
    const nextRanInstead = next.ranInstead ?? ranInstead;
    const nextStatus = next.status ?? status;
    const nextIntervalTimes = next.intervalTimes ?? intervalTimes;
    const nextExtraPurpose = next.extraPurpose ?? extraPurpose;
    const nextDistance = next.actualDistanceMiles ?? actualDistanceMiles;
    const nextMinutes = next.actualTimeMinutes ?? actualTimeMinutes;

    if (!isRunDay && !nextRanInstead) {
      onSave(undefined);
      return;
    }
    if (isRunDay && !nextStatus) return;

    const log: RunLog = {
      status: isRunDay ? nextStatus! : 'extra_run',
      extraPurpose: isRunDay ? undefined : nextExtraPurpose,
      actualDistanceMiles: nextDistance.trim() ? Number(nextDistance) : undefined,
      actualTimeMinutes: isTimeRun && nextMinutes.trim() ? Number(nextMinutes) : undefined,
      shoes: shoes.trim() || undefined,
      notes: notes.trim() || undefined,
      intervalTimes:
        (isRunDay ? day.run?.purpose : nextExtraPurpose) === 'Intervals'
          ? nextIntervalTimes.filter((t) => t.trim() !== '')
          : undefined,
    };
    onSave(log);
  }

  function updateInterval(idx: number, value: string) {
    const next = [...intervalTimes];
    next[idx] = value;
    setIntervalTimes(next);
  }

  function addInterval() {
    setIntervalTimes([...intervalTimes, '']);
  }

  function removeInterval(idx: number) {
    const next = intervalTimes.filter((_, i) => i !== idx);
    setIntervalTimes(next);
    persist({ intervalTimes: next });
  }

  function handleSaveAndClose() {
    persist();
    onClose();
  }

  function handleRemoveLog() {
    const hasDetails =
      shoes.trim() !== '' || notes.trim() !== '' || intervalTimes.some((t) => t.trim() !== '');
    if (hasDetails && !confirm('Remove this log? Your shoes, notes, and interval times for this day will be cleared.')) {
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
          {!isRunDay && (
            <div className="field">
              <label htmlFor="extra-purpose">Type of run</label>
              <select
                id="extra-purpose"
                value={extraPurpose}
                onChange={(e) => {
                  const value = e.target.value as RunPurpose;
                  setExtraPurpose(value);
                  persist({ extraPurpose: value });
                }}
              >
                {RUN_PURPOSES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          )}

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

          {showIntervalTimes && (
            <div className="field">
              <label>Interval times</label>
              {intervalTimes.map((t, idx) => (
                <div className="interval-row" key={idx}>
                  <input
                    type="text"
                    placeholder={`Interval ${idx + 1} (e.g. 6:45)`}
                    value={t}
                    onChange={(e) => updateInterval(idx, e.target.value)}
                    onBlur={() => persist()}
                  />
                  <button type="button" className="btn-danger" onClick={() => removeInterval(idx)}>
                    Remove
                  </button>
                </div>
              ))}
              <button type="button" className="btn-link" onClick={addInterval}>
                + Add interval
              </button>
            </div>
          )}
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
