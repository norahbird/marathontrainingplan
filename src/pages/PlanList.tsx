import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { deletePlan, exportBackup, importPlans, loadPlans, parseBackup } from '../storage';
import type { TrainingPlan } from '../types';
import { formatDisplayDate, toISODate } from '../utils/dates';

function sortedPlans(): TrainingPlan[] {
  return loadPlans().sort((a, b) => a.raceDate.localeCompare(b.raceDate));
}

export default function PlanList() {
  const [plans, setPlans] = useState<TrainingPlan[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPlans(sortedPlans());
  }, []);

  function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This can't be undone.`)) return;
    deletePlan(id);
    setPlans(sortedPlans());
  }

  async function handleExport() {
    const fileName = `training-plans-${toISODate(new Date())}.json`;
    const file = new File([exportBackup()], fileName, { type: 'application/json' });

    // On iPhone this opens the share sheet (Save to Files, AirDrop, Messages...).
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'Training plan backup' });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') alert('Sharing the backup failed. Please try again.');
      }
      return;
    }

    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImportFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    let incoming: TrainingPlan[];
    try {
      incoming = parseBackup(await file.text());
    } catch (err) {
      alert((err as Error).message);
      return;
    }
    if (incoming.length === 0) {
      alert('That backup has no plans in it.');
      return;
    }

    const existingIds = new Set(loadPlans().map((p) => p.id));
    const replacing = incoming.filter((p) => existingIds.has(p.id)).length;
    const message =
      `Import ${incoming.length} plan${incoming.length === 1 ? '' : 's'} from this backup?` +
      (replacing > 0
        ? `\n\n${replacing} of them already ${replacing === 1 ? 'exists' : 'exist'} here and will be replaced with the backup's version.`
        : '');
    if (!confirm(message)) return;

    importPlans(incoming);
    setPlans(sortedPlans());
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
                  {plan.lengthWeeks} {plan.lengthWeeks === 1 ? 'week' : 'weeks'}
                </div>
              </Link>
              <div className="plan-card-actions">
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

      <section className="backup-section">
        <h2>Back up or move your plans</h2>
        <p>
          Plans are saved on this device only. To move them to another device or to the Home Screen app,
          export a backup here and import it there.
        </p>
        <div className="backup-actions">
          <button className="btn-secondary" onClick={handleExport} disabled={plans.length === 0}>
            Export backup
          </button>
          <button className="btn-secondary" onClick={() => fileInput.current?.click()}>
            Import backup
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            onChange={handleImportFile}
            hidden
          />
        </div>
      </section>
    </div>
  );
}
