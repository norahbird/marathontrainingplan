import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import DayEditorModal from '../components/DayEditorModal';
import EditPlanSettingsModal from '../components/EditPlanSettingsModal';
import { getPlan, savePlan } from '../storage';
import { PlanDay, TrainingPlan } from '../types';
import { formatCompactDate, groupIntoWeeks, rebuildPlanDays } from '../utils/dates';
import { dayCellLabel, dayColor, formatMiles, raceDayLabel } from '../utils/display';
import { RACE_DISTANCE_MILES } from '../utils/pace';

export default function PlanBuilder() {
  const { planId } = useParams();
  const navigate = useNavigate();
  const [plan, setPlan] = useState<TrainingPlan | null>(null);
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    if (!planId) return;
    const p = getPlan(planId);
    if (!p) {
      navigate('/');
      return;
    }
    if (p.finalized) {
      navigate(`/plan/${p.id}`);
      return;
    }
    setPlan(p);
  }, [planId, navigate]);

  if (!plan) return null;

  const daysDone = plan.days.filter((d) => d.dayType).length;
  const allDone = daysDone === plan.days.length;

  const weeks = groupIntoWeeks(plan.days, plan.weekStartsOn ?? 0);
  const raceDayMiles = RACE_DISTANCE_MILES[plan.raceDistance] ?? 0;

  function weekMiles(week: PlanDay[]): number {
    return week.reduce((total, day) => {
      if (day.dayType === 'run' && day.run?.metric === 'distance' && day.run.distanceMiles) {
        return total + day.run.distanceMiles;
      }
      if (day.dayType === 'race') {
        return total + raceDayMiles;
      }
      return total;
    }, 0);
  }

  function updateDay(updated: PlanDay) {
    if (!plan) return;
    const newDays = plan.days.map((d) => (d.date === updated.date ? updated : d));
    const newPlan = { ...plan, days: newDays };
    setPlan(newPlan);
    savePlan(newPlan);
    setEditingDate(null);
  }

  function handleFinalize() {
    if (!plan || !allDone) return;
    const finalized = { ...plan, finalized: true };
    savePlan(finalized);
    navigate(`/plan/${plan.id}`);
  }

  function updateSettings(newWeeks: number, newRunDays: number) {
    if (!plan) return;
    const { days, droppedFilled } = rebuildPlanDays(plan.days, plan.raceDate, newWeeks);
    if (droppedFilled > 0) {
      const ok = confirm(
        `Shortening the plan removes ${droppedFilled} day(s) you already scheduled. Continue?`,
      );
      if (!ok) return;
    }
    const newPlan = { ...plan, lengthWeeks: newWeeks, runDaysPerWeek: newRunDays, days };
    setPlan(newPlan);
    savePlan(newPlan);
    setShowSettings(false);
  }

  const editingDay = editingDate ? plan.days.find((d) => d.date === editingDate) ?? null : null;

  return (
    <div>
      <h1>{plan.name}</h1>
      <div className="builder-header-row">
        <p className="builder-progress">
          {daysDone} of {plan.days.length} days scheduled &middot; target {plan.runDaysPerWeek} running days/week
        </p>
        <button className="btn-secondary" onClick={() => setShowSettings(true)}>
          Edit plan settings
        </button>
      </div>

      {weeks.map((week, i) => (
        <div className="builder-week" key={i}>
          <div className="builder-week-title">Week {i + 1}</div>
          {week.map((day) => {
            const isRaceDay = day.dayType === 'race';
            return (
              <div
                className={`builder-day${isRaceDay ? ' builder-day--race' : ''}`}
                key={day.date}
                onClick={isRaceDay ? undefined : () => setEditingDate(day.date)}
              >
                <span className="builder-day-date">{formatCompactDate(day.date)}</span>
                {isRaceDay ? (
                  <span className="builder-day-bubble" style={{ background: dayColor(day) }}>
                    {raceDayLabel(plan.raceDistance)}
                  </span>
                ) : day.dayType ? (
                  <span className="builder-day-bubble" style={{ background: dayColor(day) }}>
                    {day.dayType === 'rest' ? 'Rest' : `${day.run?.purpose} — ${dayCellLabel(day)}`}
                  </span>
                ) : (
                  <span className="builder-day-summary">Click to add a run or rest</span>
                )}
              </div>
            );
          })}
          <div className="builder-week-total">Week total: {formatMiles(weekMiles(week))} miles</div>
        </div>
      ))}

      <div className="finalize-bar">
        <button className="btn" disabled={!allDone} onClick={handleFinalize}>
          {allDone ? 'Finalize Plan' : `Finalize Plan (${plan.days.length - daysDone} days left)`}
        </button>
      </div>

      {editingDay && (
        <DayEditorModal day={editingDay} onClose={() => setEditingDate(null)} onSave={updateDay} />
      )}

      {showSettings && (
        <EditPlanSettingsModal
          lengthWeeks={plan.lengthWeeks}
          runDaysPerWeek={plan.runDaysPerWeek}
          onClose={() => setShowSettings(false)}
          onSave={updateSettings}
        />
      )}
    </div>
  );
}
