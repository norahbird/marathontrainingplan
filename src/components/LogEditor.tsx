import { useState } from 'react';
import { LogStatus, PlanDay, RUN_PURPOSES, RunLog, RunPurpose } from '../types';

interface Props {
  day: PlanDay;
  onSave: (log: RunLog | undefined) => void;
}

export default function LogEditor({ day, onSave }: Props) {
  const isRunDay = day.dayType === 'run';
  const existing = day.log;

  const [ranInstead, setRanInstead] = useState(!isRunDay && existing?.status === 'extra_run');
  const [status, setStatus] = useState<LogStatus>(existing?.status ?? (isRunDay ? 'completed' : 'extra_run'));
  const [extraPurpose, setExtraPurpose] = useState<RunPurpose>(existing?.extraPurpose ?? 'General Aerobic');
  const [actualDistanceMiles, setActualDistanceMiles] = useState<string>(
    existing?.actualDistanceMiles !== undefined ? String(existing.actualDistanceMiles) : '',
  );
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
    }> = {},
  ) {
    const nextRanInstead = next.ranInstead ?? ranInstead;
    const nextStatus = next.status ?? status;
    const nextIntervalTimes = next.intervalTimes ?? intervalTimes;
    const nextExtraPurpose = next.extraPurpose ?? extraPurpose;

    if (!isRunDay && !nextRanInstead) {
      onSave(undefined);
      return;
    }

    const log: RunLog = {
      status: isRunDay ? nextStatus : 'extra_run',
      extraPurpose: isRunDay ? undefined : nextExtraPurpose,
      actualDistanceMiles: actualDistanceMiles.trim() ? Number(actualDistanceMiles) : undefined,
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

  return (
    <div>
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
                  persist({ status: 'completed' });
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
    </div>
  );
}
