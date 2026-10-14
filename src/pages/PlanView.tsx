import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PlanLoadStatus from '../components/PlanLoadStatus';
import { usePlan } from '../hooks/usePlan';
import { PlanDay } from '../types';
import { formatDisplayDate } from '../utils/dates';
import CalendarView from './CalendarView';
import ScrollView from './ScrollView';

type Tab = 'calendar' | 'log';

export default function PlanView() {
  const { planId } = useParams();
  const navigate = useNavigate();
  const { plan, state, error, update } = usePlan(planId);
  const [tab, setTab] = useState<Tab>('calendar');

  useEffect(() => {
    if (plan && !plan.finalized) navigate(`/plan/${plan.id}/build`, { replace: true });
  }, [plan, navigate]);

  if (!plan || state !== 'ready') return <PlanLoadStatus state={state} error={error} />;

  function handleUpdateDay(updated: PlanDay) {
    if (!plan) return;
    update({ ...plan, days: plan.days.map((d) => (d.date === updated.date ? updated : d)) });
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
