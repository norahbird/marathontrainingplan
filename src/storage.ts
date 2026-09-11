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
