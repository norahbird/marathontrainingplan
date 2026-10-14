import { useEffect, useSyncExternalStore } from 'react';
import { getSaveStatus, hasUnsavedChanges, retryFailedSaves, subscribeSaveStatus } from '../storage';

export default function SaveStatusBanner() {
  const status = useSyncExternalStore(subscribeSaveStatus, getSaveStatus);

  useEffect(() => {
    function warnIfUnsaved(e: BeforeUnloadEvent) {
      if (hasUnsavedChanges()) e.preventDefault();
    }
    window.addEventListener('beforeunload', warnIfUnsaved);
    return () => window.removeEventListener('beforeunload', warnIfUnsaved);
  }, []);

  if (status.conflict) {
    return (
      <div className="save-banner save-banner--error" role="alert">
        <span>This plan was changed on another device, so your last change wasn't saved. Reload to get the latest version.</span>
        <button className="btn-secondary" onClick={() => window.location.reload()}>
          Reload
        </button>
      </div>
    );
  }

  if (status.failedCount > 0) {
    return (
      <div className="save-banner save-banner--error" role="alert">
        <span>Your latest change wasn't saved. {status.lastError}</span>
        <button className="btn-secondary" onClick={retryFailedSaves} disabled={status.pending > 0}>
          {status.pending > 0 ? 'Saving…' : 'Try again'}
        </button>
      </div>
    );
  }

  return null;
}
