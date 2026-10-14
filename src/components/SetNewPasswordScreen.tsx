import { FormEvent, useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function SetNewPasswordScreen() {
  const { user, updatePassword, signOut } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError("The two passwords don't match.");
      return;
    }
    setSubmitting(true);
    const result = await updatePassword(password);
    setSubmitting(false);
    if (result.error) setError(result.error);
  }

  return (
    <div className="auth-screen">
      <div className="card auth-card">
        <h1>Set a new password</h1>
        <p className="auth-subtitle">For {user?.email}</p>
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="new-password">New password</label>
            <input
              id="new-password"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="confirm-password">Confirm new password</label>
            <input
              id="confirm-password"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          {error && <p className="auth-error">{error}</p>}
          <button className="btn" type="submit" disabled={submitting}>
            {submitting ? 'Saving…' : 'Save new password'}
          </button>
        </form>
        <button className="btn-link auth-toggle" type="button" onClick={signOut}>
          Cancel and sign out
        </button>
      </div>
    </div>
  );
}
