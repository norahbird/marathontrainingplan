import { supabase } from './lib/supabaseClient';
import type { TrainingPlan } from './types';

const TABLE = 'training_plans';

interface PlanRow {
  id: string;
  data: TrainingPlan;
  version: number;
}

/** A save was refused because the plan changed elsewhere (another device or tab) since it was loaded. */
class ConflictError extends Error {}

// The version each plan had when this page last read or wrote it. Saves only go through if the
// server still has that version, so a stale tab can't overwrite newer changes from another device.
const knownVersions = new Map<string, number>();

function newVersion(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0] & 0x7fffffff;
}

function friendlyError(error: { message: string; code?: string }): Error {
  if (error.code === 'PGRST205' || error.code === '42P01') {
    return new Error("Your Supabase project doesn't have the training_plans table yet. Run supabase/schema.sql.");
  }
  if (/fetch|network/i.test(error.message)) {
    return new Error("Couldn't reach the server. Check your internet connection.");
  }
  return new Error(error.message);
}

function rememberVersions(rows: PlanRow[]): TrainingPlan[] {
  rows.forEach((r) => knownVersions.set(r.id, r.version));
  return rows.map((r) => unsavedCopies.get(r.id) ?? r.data);
}

async function currentUserId(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const id = data.session?.user.id;
  if (!id) throw new Error("You're signed out. Sign in again to save your changes.");
  return id;
}

// ---- Save queue and status --------------------------------------------------------------
// Saves run one at a time, in order, so an older save can never land after a newer one.

export interface SaveStatus {
  pending: number;
  failedCount: number;
  conflict: boolean;
  lastError: string | null;
}

let saveQueue: Promise<unknown> = Promise.resolve();
let pending = 0;
let conflict = false;
let lastError: string | null = null;
// Latest copy of each plan whose save failed; kept so a retry (or reopening the plan) doesn't lose it.
const unsavedCopies = new Map<string, TrainingPlan>();
const listeners = new Set<() => void>();
let status: SaveStatus = { pending: 0, failedCount: 0, conflict: false, lastError: null };

function notify() {
  status = { pending, failedCount: unsavedCopies.size, conflict, lastError };
  listeners.forEach((l) => l());
}

export function subscribeSaveStatus(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSaveStatus(): SaveStatus {
  return status;
}

export function hasUnsavedChanges(): boolean {
  return pending > 0 || unsavedCopies.size > 0;
}

async function writePlan(plan: TrainingPlan): Promise<void> {
  const known = knownVersions.get(plan.id);
  const version = newVersion();
  const updated_at = new Date().toISOString();

  if (known === undefined) {
    const user_id = await currentUserId();
    const { data, error } = await supabase
      .from(TABLE)
      .insert({ id: plan.id, user_id, data: plan, version, updated_at })
      .select('version');
    if (error) throw error.code === '23505' ? new ConflictError() : friendlyError(error);
    knownVersions.set(plan.id, (data as { version: number }[])[0].version);
    return;
  }

  const { data, error } = await supabase
    .from(TABLE)
    .update({ data: plan, version, updated_at })
    .eq('id', plan.id)
    .eq('version', known)
    .select('version');
  if (error) throw friendlyError(error);
  if (!data || data.length === 0) throw new ConflictError();
  knownVersions.set(plan.id, (data as { version: number }[])[0].version);
}

/** Queues a save of the whole plan. Resolves true if it reached the server; never rejects. */
export function savePlan(plan: TrainingPlan): Promise<boolean> {
  pending++;
  notify();
  const run = saveQueue
    .then(() => writePlan(plan))
    .then(
      () => {
        unsavedCopies.delete(plan.id);
        if (unsavedCopies.size === 0) lastError = null;
        return true;
      },
      (err: unknown) => {
        if (err instanceof ConflictError) {
          conflict = true;
        } else {
          unsavedCopies.set(plan.id, plan);
          lastError = (err as Error).message;
        }
        return false;
      },
    )
    .finally(() => {
      pending--;
      notify();
    });
  saveQueue = run;
  return run;
}

export function retryFailedSaves(): void {
  [...unsavedCopies.values()].forEach((plan) => savePlan(plan));
}

/** Clears per-account state on sign-out. */
export function resetStorageState(): void {
  knownVersions.clear();
  unsavedCopies.clear();
  conflict = false;
  lastError = null;
  notify();
}

// ---- Reads and other writes -------------------------------------------------------------

export async function loadPlans(): Promise<TrainingPlan[]> {
  await saveQueue;
  const { data, error } = await supabase.from(TABLE).select('id, data, version');
  if (error) throw friendlyError(error);
  return rememberVersions(data as PlanRow[]);
}

export async function getPlan(id: string): Promise<TrainingPlan | undefined> {
  await saveQueue;
  const { data, error } = await supabase.from(TABLE).select('id, data, version').eq('id', id);
  if (error) throw friendlyError(error);
  return rememberVersions(data as PlanRow[])[0];
}

export async function deletePlan(id: string): Promise<void> {
  await saveQueue;
  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  if (error) throw friendlyError(error);
  knownVersions.delete(id);
  unsavedCopies.delete(id);
  notify();
}

/** Adds backup plans to the account, replacing any existing plan with the same id. */
export async function importPlans(incoming: TrainingPlan[]): Promise<void> {
  await saveQueue;
  const user_id = await currentUserId();
  const updated_at = new Date().toISOString();
  const { data, error } = await supabase
    .from(TABLE)
    .upsert(
      incoming.map((p) => ({ id: p.id, user_id, data: p, version: newVersion(), updated_at })),
      { onConflict: 'user_id,id' },
    )
    .select('id, version');
  if (error) throw friendlyError(error);
  (data as { id: string; version: number }[]).forEach((r) => knownVersions.set(r.id, r.version));
}

export function newPlanId(): string {
  return `plan_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ---- Backup files -----------------------------------------------------------------------

const BACKUP_APP_ID = 'marathon-training-plan';

export function exportBackup(plans: TrainingPlan[]): string {
  return JSON.stringify({ app: BACKUP_APP_ID, version: 1, exportedAt: new Date().toISOString(), plans }, null, 2);
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
  const plans = (data as { plans?: unknown })?.plans;
  if ((data as { app?: string })?.app !== BACKUP_APP_ID || !Array.isArray(plans) || !plans.every(isPlan)) {
    throw new Error("That file isn't a training plan backup.");
  }
  return plans;
}
