import { useState } from 'react';
import { DayType, PlanDay, RUN_PURPOSES, RunMetric, RunPurpose } from '../types';
import { formatDisplayDate } from '../utils/dates';

const DESCRIPTION_MAX = 500;

interface Props {
  day: PlanDay;
  onSave: (updated: PlanDay) => void;
  onClose: () => void;
}

export default function DayEditorModal({ day, onSave, onClose }: Props) {
  const [dayType, setDayType] = useState<DayType>(day.dayType ?? 'run');
  const [metric, setMetric] = useState<RunMetric>(day.run?.metric ?? 'distance');
  const [distanceMiles, setDistanceMiles] = useState<string>(
    day.run?.distanceMiles !== undefined ? String(day.run.distanceMiles) : '',
  );
  const [timeMinutes, setTimeMinutes] = useState<string>(
    day.run?.timeMinutes !== undefined ? String(day.run.timeMinutes) : '',
  );
  const [purpose, setPurpose] = useState<RunPurpose>(day.run?.purpose ?? 'General Aerobic');
  const [description, setDescription] = useState(day.run?.description ?? '');

  const canSave =
    dayType === 'rest' ||
    (dayType === 'run' &&
      ((metric === 'distance' && distanceMiles.trim() !== '') ||
        (metric === 'time' && timeMinutes.trim() !== '')));

  function handleSave() {
    if (!canSave) return;
    if (dayType === 'rest') {
      onSave({ ...day, dayType: 'rest', run: undefined });
      return;
    }
    onSave({
      ...day,
      dayType: 'run',
      run: {
        metric,
        distanceMiles: metric === 'distance' ? Number(distanceMiles) : undefined,
        timeMinutes: metric === 'time' ? Number(timeMinutes) : undefined,
        purpose,
        description: description.slice(0, DESCRIPTION_MAX),
      },
    });
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 style={{ margin: 0 }}>{formatDisplayDate(day.date)}</h2>
          <button className="modal-close" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="field">
          <label>Day type</label>
          <div className="radio-group">
            <label>
              <input
                type="radio"
                name="dayType"
                checked={dayType === 'rest'}
                onChange={() => setDayType('rest')}
              />
              Rest
            </label>
            <label>
              <input
                type="radio"
                name="dayType"
                checked={dayType === 'run'}
                onChange={() => setDayType('run')}
              />
              Run
            </label>
          </div>
        </div>

        {dayType === 'run' && (
          <>
            <div className="field">
              <label>Measure this run by</label>
              <div className="radio-group">
                <label>
                  <input
                    type="radio"
                    name="metric"
                    checked={metric === 'distance'}
                    onChange={() => setMetric('distance')}
                  />
                  Distance
                </label>
                <label>
                  <input
                    type="radio"
                    name="metric"
                    checked={metric === 'time'}
                    onChange={() => setMetric('time')}
                  />
                  Time
                </label>
              </div>
            </div>

            {metric === 'distance' ? (
              <div className="field">
                <label htmlFor="distance-miles">Distance (miles)</label>
                <input
                  id="distance-miles"
                  type="number"
                  min={0}
                  step={0.1}
                  value={distanceMiles}
                  onChange={(e) => setDistanceMiles(e.target.value)}
                />
              </div>
            ) : (
              <div className="field">
                <label htmlFor="time-minutes">Time (minutes)</label>
                <input
                  id="time-minutes"
                  type="number"
                  min={0}
                  step={1}
                  value={timeMinutes}
                  onChange={(e) => setTimeMinutes(e.target.value)}
                />
              </div>
            )}

            <div className="field">
              <label htmlFor="purpose">Purpose</label>
              <select id="purpose" value={purpose} onChange={(e) => setPurpose(e.target.value as RunPurpose)}>
                {RUN_PURPOSES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                rows={4}
                maxLength={DESCRIPTION_MAX}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <span className="char-count">
                {description.length}/{DESCRIPTION_MAX}
              </span>
            </div>
          </>
        )}

        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn" disabled={!canSave} onClick={handleSave}>
            Save day
          </button>
        </div>
      </div>
    </div>
  );
}
