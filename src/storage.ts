import type { TrainingPlan } from './types';

const STORAGE_KEY = 'marathon-training-plans';

export function loadPlans(): TrainingPlan[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as TrainingPlan[];
  } catch {
    return [];
  }
}

export function savePlans(plans: TrainingPlan[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
}

export function savePlan(plan: TrainingPlan): void {
  const plans = loadPlans();
  const idx = plans.findIndex((p) => p.id === plan.id);
  if (idx >= 0) {
    plans[idx] = plan;
  } else {
    plans.push(plan);
  }
  savePlans(plans);
}

export function getPlan(id: string): TrainingPlan | undefined {
  return loadPlans().find((p) => p.id === id);
}

export function deletePlan(id: string): void {
  savePlans(loadPlans().filter((p) => p.id !== id));
}

export function newPlanId(): string {
  return `plan_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

const BACKUP_APP_ID = 'marathon-training-plan';

export function exportBackup(): string {
  return JSON.stringify(
    { app: BACKUP_APP_ID, version: 1, exportedAt: new Date().toISOString(), plans: loadPlans() },
    null,
    2,
  );
}

function isPlan(value: unknown): value is TrainingPlan {
  const p = value as TrainingPlan;
  return (
    typeof p === 'object' &&
    p !== null &&
    typeof p.id === 'string' &&
    typeof p.name === 'string' &&
    typeof p.raceDate === 'string' &&
    Array.isArray(p.days) &&
    p.days.every((d) => typeof d?.date === 'string')
  );
}

/** Parses a backup file's text into plans; throws an Error with a user-facing message if invalid. */
export function parseBackup(text: string): TrainingPlan[] {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("That file isn't a training plan backup.");
  }
  const plans = (data as { app?: string; plans?: unknown })?.plans;
  if ((data as { app?: string })?.app !== BACKUP_APP_ID || !Array.isArray(plans) || !plans.every(isPlan)) {
    throw new Error("That file isn't a training plan backup.");
  }
  return plans;
}

/** Adds backup plans, replacing any existing plan with the same id. */
export function importPlans(incoming: TrainingPlan[]): void {
  const byId = new Map(loadPlans().map((p) => [p.id, p]));
  incoming.forEach((p) => byId.set(p.id, p));
  savePlans([...byId.values()]);
}
