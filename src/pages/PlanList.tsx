import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { deletePlan, loadPlans } from '../storage';
import type { TrainingPlan } from '../types';
import { formatDisplayDate } from '../utils/dates';

export default function PlanList() {
  const [plans, setPlans] = useState<TrainingPlan[]>([]);

  useEffect(() => {
    setPlans(loadPlans().sort((a, b) => a.raceDate.localeCompare(b.raceDate)));
  }, []);

  function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This can't be undone.`)) return;
    deletePlan(id);
    setPlans(loadPlans().sort((a, b) => a.raceDate.localeCompare(b.raceDate)));
  }

  return (
    <div>
      <h1>Your Training Plans</h1>

      {plans.length === 0 && (
        <p style={{ color: 'var(--text-muted)' }}>You don't have any training plans yet.</p>
      )}

      <div className="plan-list">
        {plans.map((plan) => {
          const daysDone = plan.days.filter((d) => d.dayType).length;
          const linkTo = plan.finalized ? `/plan/${plan.id}` : `/plan/${plan.id}/build`;
          return (
            <div key={plan.id} className="card plan-card">
              <Link to={linkTo} style={{ flex: 1, textDecoration: 'none', color: 'inherit' }}>
                <div className="plan-card-title">{plan.name}</div>
                <div className="plan-card-meta">
                  {plan.raceName} ({plan.raceDistance}) &middot; Race day {formatDisplayDate(plan.raceDate)} &middot;{' '}
                  {plan.lengthWeeks} weeks
                </div>
              </Link>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className={`plan-card-badge ${plan.finalized ? 'finalized' : ''}`}>
                  {plan.finalized ? 'Finalized' : `${daysDone}/${plan.days.length} days set`}
                </span>
                <button className="btn-danger" onClick={() => handleDelete(plan.id, plan.name)}>
                  Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <Link to="/new" className="btn">
        + Build a new plan
      </Link>
    </div>
  );
}
