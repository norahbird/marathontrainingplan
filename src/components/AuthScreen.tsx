import { FormEvent, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { emailLinkRedirect } from '../lib/supabaseClient';

type Mode = 'signin' | 'signup' | 'forgot';

const SUBTITLES: Record<Mode, string> = {
  signin: 'Sign in to see your plans',
  signup: 'Create your account',
  forgot: "Enter your email and we'll send you a link to set a new password",
};

export default function AuthScreen() {
  const { signIn, signUp, requestPasswordReset } = useAuth();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(
    emailLinkRedirect.linkError ? 'That email link is invalid or has expired. Please request a new one.' : null,
  );
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setSubmitting(true);
    if (mode === 'forgot') {
      const result = await requestPasswordReset(email);
      if (result.error) setError(result.error);
      else setInfo(`If there's an account for ${email}, a reset link is on its way. Check your email (and spam folder).`);
    } else {
      const result = mode === 'signin' ? await signIn(email, password) : await signUp(email, password);
      if (result.error) setError(result.error);
      else if (result.needsEmailConfirmation) setInfo('Check your email to confirm your account, then sign in.');
    }
    setSubmitting(false);
  }

  function switchTo(next: Mode) {
    setMode(next);
    setError(null);
    setInfo(null);
  }

  const submitLabel = submitting
    ? 'Please wait…'
    : mode === 'signin'
      ? 'Sign in'
      : mode === 'signup'
        ? 'Create account'
        : 'Email me a reset link';

  return (
    <div className="auth-screen">
      <div className="card auth-card">
        <h1>Run Planner</h1>
        <p className="auth-subtitle">{SUBTITLES[mode]}</p>
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="auth-email">Email</label>
            <input
              id="auth-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          {mode !== 'forgot' && (
            <div className="field">
              <label htmlFor="auth-password">Password</label>
              <input
                id="auth-password"
                type="password"
                required
                minLength={6}
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          )}
          {mode === 'signin' && (
            <button className="btn-link auth-forgot" type="button" onClick={() => switchTo('forgot')}>
              Forgot password?
            </button>
          )}
          {error && <p className="auth-error">{error}</p>}
          {info && <p className="auth-info">{info}</p>}
          <button className="btn" type="submit" disabled={submitting}>
            {submitLabel}
          </button>
        </form>
        {mode === 'signin' && (
          <button className="btn-link auth-toggle" type="button" onClick={() => switchTo('signup')}>
            Don't have an account? Sign up
          </button>
        )}
        {mode !== 'signin' && (
          <button className="btn-link auth-toggle" type="button" onClick={() => switchTo('signin')}>
            {mode === 'signup' ? 'Already have an account? Sign in' : 'Back to sign in'}
          </button>
        )}
      </div>
    </div>
  );
}
