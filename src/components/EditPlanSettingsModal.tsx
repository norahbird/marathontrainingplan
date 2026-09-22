import { useState } from 'react';

interface Props {
  lengthWeeks: number;
  runDaysPerWeek: number;
  onSave: (lengthWeeks: number, runDaysPerWeek: number) => void;
  onClose: () => void;
}

export default function EditPlanSettingsModal({ lengthWeeks, runDaysPerWeek, onSave, onClose }: Props) {
  const [weeks, setWeeks] = useState(String(lengthWeeks));
  const [runDays, setRunDays] = useState(String(runDaysPerWeek));

  const weeksNum = Number(weeks);
  const runDaysNum = Number(runDays);
  const canSave =
    Number.isInteger(weeksNum) && weeksNum >= 1 && weeksNum <= 52 &&
    Number.isInteger(runDaysNum) && runDaysNum >= 1 && runDaysNum <= 7;

  function handleSave() {
    if (!canSave) return;
    onSave(weeksNum, runDaysNum);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 style={{ margin: 0 }}>Edit Plan Settings</h2>
          <button className="modal-close" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="edit-length-weeks">Plan length (weeks)</label>
            <input
              id="edit-length-weeks"
              type="number"
              min={1}
              max={52}
              value={weeks}
              onChange={(e) => setWeeks(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="edit-run-days">Running days per week</label>
            <input
              id="edit-run-days"
              type="number"
              min={1}
              max={7}
              value={runDays}
              onChange={(e) => setRunDays(e.target.value)}
            />
          </div>
        </div>

        {canSave && weeksNum !== lengthWeeks && (
          <p className="field-hint">
            {weeksNum > lengthWeeks
              ? `This adds ${weeksNum - lengthWeeks} week(s) at the start of the plan.`
              : `This removes ${lengthWeeks - weeksNum} week(s) from the start of the plan. Any days already scheduled in those weeks will be lost.`}
          </p>
        )}

        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn" disabled={!canSave} onClick={handleSave}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
