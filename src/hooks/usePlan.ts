import { useCallback, useEffect, useRef, useState } from 'react';
import { getPlan, hasUnsavedChanges, savePlan } from '../storage';
import type { TrainingPlan } from '../types';

type LoadState = 'loading' | 'ready' | 'missing' | 'error';

const REFRESH_MIN_INTERVAL_MS = 5000;

/**
 * Loads a plan from the account and keeps it fresh: when the app comes back to the
 * foreground (e.g. after logging on another device) it quietly reloads, unless there are
 * unsaved edits here.
 */
export function usePlan(planId: string | undefined) {
  const [plan, setPlan] = useState<TrainingPlan | null>(null);
  const [state, setState] = useState<LoadState>('loading');
  const [error, setError] = useState<string | null>(null);
  const editCount = useRef(0);
  const lastLoad = useRef(0);

  const load = useCallback(
    async (quiet: boolean) => {
      if (!planId) return;
      lastLoad.current = Date.now();
      const editsBefore = editCount.current;
      try {
        const p = await getPlan(planId);
        // An edit made while this load was in flight is newer than what came back; keep it.
        if (quiet && (editCount.current !== editsBefore || hasUnsavedChanges())) return;
        if (!p) {
          setState('missing');
          return;
        }
        setPlan(p);
        setState('ready');
      } catch (e) {
        if (!quiet) {
          setError((e as Error).message);
          setState('error');
        }
      }
    },
    [planId],
  );

  useEffect(() => {
    setState('loading');
    load(false);
  }, [load]);

  useEffect(() => {
    function refresh() {
      if (document.visibilityState !== 'visible' || hasUnsavedChanges()) return;
      if (Date.now() - lastLoad.current < REFRESH_MIN_INTERVAL_MS) return;
      load(true);
    }
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, [load]);

  const update = useCallback((next: TrainingPlan): Promise<boolean> => {
    editCount.current++;
    setPlan(next);
    return savePlan(next);
  }, []);

  return { plan, state, error, update };
}
