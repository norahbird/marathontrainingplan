import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import DayEditorModal from '../components/DayEditorModal';
import { getPlan, savePlan } from '../storage';
import { PlanDay, TrainingPlan } from '../types';
import { formatCompactDate } from '../utils/dates';
import { dayCellLabel, dayColor } from '../utils/display';

export default function PlanBuilder() {
  const { planId } = useParams();
  const navigate = useNavigate();
  const [plan, setPlan] = useState<TrainingPlan | null>(null);
  const [editingDate, setEditingDate] = useState<string | null>(null);

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

  const weeks: PlanDay[][] = [];
  for (let i = 0; i < plan.days.length; i += 7) {
    weeks.push(plan.days.slice(i, i + 7));
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

  const editingDay = editingDate ? plan.days.find((d) => d.date === editingDate) ?? null : null;

  return (
    <div>
      <h1>{plan.name}</h1>
      <p className="builder-progress">
        {daysDone} of {plan.days.length} days scheduled &middot; target {plan.runDaysPerWeek} running days/week
      </p>

      {weeks.map((week, i) => (
        <div className="builder-week" key={i}>
          <div className="builder-week-title">Week {i + 1}</div>
          {week.map((day) => (
            <div className="builder-day" key={day.date} onClick={() => setEditingDate(day.date)}>
              <span className="builder-day-date">{formatCompactDate(day.date)}</span>
              <span style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                {day.dayType && (
                  <span className="builder-day-swatch" style={{ background: dayColor(day) }} />
                )}
                <span className="builder-day-summary">
                  {day.dayType ? (
                    day.dayType === 'rest' ? (
                      'Rest'
                    ) : (
                      `${day.run?.purpose} — ${dayCellLabel(day)}`
                    )
                  ) : (
                    'Click to add a run or rest'
                  )}
                </span>
              </span>
            </div>
          ))}
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
    </div>
  );
}
