import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getPlan, savePlan } from '../storage';
import { PlanDay, TrainingPlan } from '../types';
import { formatDisplayDate } from '../utils/dates';
import CalendarView from './CalendarView';
import ScrollView from './ScrollView';

type Tab = 'calendar' | 'log';

export default function PlanView() {
  const { planId } = useParams();
  const navigate = useNavigate();
  const [plan, setPlan] = useState<TrainingPlan | null>(null);
  const [tab, setTab] = useState<Tab>('calendar');

  useEffect(() => {
    if (!planId) return;
    const p = getPlan(planId);
    if (!p) {
      navigate('/');
      return;
    }
    if (!p.finalized) {
      navigate(`/plan/${p.id}/build`);
      return;
    }
    setPlan(p);
  }, [planId, navigate]);

  if (!plan) return null;

  function handleUpdateDay(updated: PlanDay) {
    if (!plan) return;
    const newDays = plan.days.map((d) => (d.date === updated.date ? updated : d));
    const newPlan = { ...plan, days: newDays };
    setPlan(newPlan);
    savePlan(newPlan);
  }

  return (
    <div>
      <div className="plan-header">
        <div className="plan-header-title">{plan.name}</div>
        <div className="plan-header-meta">
          {plan.raceName} ({plan.raceDistance}) &middot; Race day {formatDisplayDate(plan.raceDate)}
          {plan.goalTime && <> &middot; Goal: {plan.goalTime}</>}
        </div>
      </div>

      <div className="view-tabs">
        <button className={`view-tab ${tab === 'calendar' ? 'active' : ''}`} onClick={() => setTab('calendar')}>
          Calendar
        </button>
        <button className={`view-tab ${tab === 'log' ? 'active' : ''}`} onClick={() => setTab('log')}>
          Log
        </button>
      </div>

      {tab === 'calendar' ? (
        <CalendarView plan={plan} />
      ) : (
        <ScrollView plan={plan} onUpdateDay={handleUpdateDay} />
      )}
    </div>
  );
}
