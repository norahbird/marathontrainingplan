import { ChangeEvent, useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { deletePlan, exportBackup, importPlans, loadPlans, parseBackup } from '../storage';
import type { TrainingPlan } from '../types';
import { formatDisplayDate, toISODate } from '../utils/dates';

async function sortedPlans(): Promise<TrainingPlan[]> {
  return (await loadPlans()).sort((a, b) => a.raceDate.localeCompare(b.raceDate));
}

export default function PlanList() {
  const [plans, setPlans] = useState<TrainingPlan[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    try {
      setPlans(await sortedPlans());
      setLoadError(null);
    } catch (err) {
      setLoadError((err as Error).message);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This can't be undone.`)) return;
    setBusy(true);
    try {
      await deletePlan(id);
      await refresh();
    } catch (err) {
      alert(`Couldn't delete the plan. ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function handleExport() {
    if (!plans) return;
    const fileName = `training-plans-${toISODate(new Date())}.json`;
    const file = new File([exportBackup(plans)], fileName, { type: 'application/json' });

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

    const existingIds = new Set((plans ?? []).map((p) => p.id));
    const replacing = incoming.filter((p) => existingIds.has(p.id)).length;
    const message =
      `Import ${incoming.length} plan${incoming.length === 1 ? '' : 's'} from this backup into your account?` +
      (replacing > 0
        ? `\n\n${replacing} of them already ${replacing === 1 ? 'exists' : 'exist'} in your account and will be replaced with the backup's version.`
        : '');
    if (!confirm(message)) return;

    setBusy(true);
    try {
      await importPlans(incoming);
      await refresh();
    } catch (err) {
      alert(`Couldn't import the backup. ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  if (plans === null) {
    return loadError ? (
      <div className="page-status">
        <p>Couldn't load your plans. {loadError}</p>
        <button className="btn-secondary" onClick={refresh}>
          Try again
        </button>
      </div>
    ) : (
      <p className="page-status">Loading your plans…</p>
    );
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
                <button className="btn-danger" disabled={busy} onClick={() => handleDelete(plan.id, plan.name)}>
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
        <h2>Back up or import plans</h2>
        <p>
          Your plans are saved to your account, so they show up on any device you sign in on. Export a backup file
          any time, or import one, such as plans exported from the old version of this site.
        </p>
        <div className="backup-actions">
          <button className="btn-secondary" onClick={handleExport} disabled={plans.length === 0 || busy}>
            Export backup
          </button>
          <button className="btn-secondary" onClick={() => fileInput.current?.click()} disabled={busy}>
            {busy ? 'Working…' : 'Import backup'}
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
