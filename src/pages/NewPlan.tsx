import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { newPlanId, savePlan } from '../storage';
import { RACE_DISTANCES, TrainingPlan } from '../types';
import { buildPlanDays } from '../utils/dates';
import { computePaceLabel } from '../utils/pace';

export default function NewPlan() {
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [raceName, setRaceName] = useState('');
  const [raceDistance, setRaceDistance] = useState<string>(RACE_DISTANCES[3]);
  const [customDistance, setCustomDistance] = useState('');
  const [raceDate, setRaceDate] = useState('');
  const [goalTime, setGoalTime] = useState('');
  const [lengthWeeks, setLengthWeeks] = useState(16);
  const [runDaysPerWeek, setRunDaysPerWeek] = useState(5);

  const distance = raceDistance === 'Other' ? customDistance : raceDistance;
  const paceLabel = computePaceLabel(raceDistance, goalTime);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!raceDate || !raceName.trim() || !distance.trim()) return;

    const plan: TrainingPlan = {
      id: newPlanId(),
      name: name.trim() || `${raceName.trim()} Training Plan`,
      raceName: raceName.trim(),
      raceDistance: distance.trim(),
      raceDate,
      goalTime: goalTime.trim(),
      lengthWeeks,
      runDaysPerWeek,
      createdAt: new Date().toISOString(),
      finalized: false,
      days: buildPlanDays(raceDate, lengthWeeks),
    };

    savePlan(plan);
    navigate(`/plan/${plan.id}/build`);
  }

  return (
    <div>
      <h1>Build a New Plan</h1>
      <form className="card" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="plan-name">Plan name (optional)</label>
          <input
            id="plan-name"
            type="text"
            placeholder="e.g. December Marathon"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="race-name">Race name</label>
            <input
              id="race-name"
              type="text"
              required
              placeholder="e.g. California International Marathon"
              value={raceName}
              onChange={(e) => setRaceName(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="race-distance">Race distance</label>
            <select
              id="race-distance"
              value={raceDistance}
              onChange={(e) => setRaceDistance(e.target.value)}
            >
              {RACE_DISTANCES.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>

        {raceDistance === 'Other' && (
          <div className="field">
            <label htmlFor="custom-distance">Custom distance</label>
            <input
              id="custom-distance"
              type="text"
              required
              placeholder="e.g. 50K"
              value={customDistance}
              onChange={(e) => setCustomDistance(e.target.value)}
            />
          </div>
        )}

        <div className="field-row">
          <div className="field">
            <label htmlFor="race-date">Race date</label>
            <input
              id="race-date"
              type="date"
              required
              value={raceDate}
              onChange={(e) => setRaceDate(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="goal-time">Goal time</label>
            <input
              id="goal-time"
              type="text"
              placeholder="e.g. 3:45:00"
              value={goalTime}
              onChange={(e) => setGoalTime(e.target.value)}
            />
            {paceLabel && <span className="field-hint">{paceLabel} pace</span>}
          </div>
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="length-weeks">Plan length (weeks)</label>
            <input
              id="length-weeks"
              type="number"
              min={1}
              max={52}
              required
              value={lengthWeeks}
              onChange={(e) => setLengthWeeks(Number(e.target.value))}
            />
          </div>
          <div className="field">
            <label htmlFor="run-days">Running days per week</label>
            <input
              id="run-days"
              type="number"
              min={1}
              max={7}
              required
              value={runDaysPerWeek}
              onChange={(e) => setRunDaysPerWeek(Number(e.target.value))}
            />
          </div>
        </div>

        <div className="modal-actions">
          <button type="submit" className="btn">
            Next: build the schedule
          </button>
        </div>
      </form>
    </div>
  );
}
