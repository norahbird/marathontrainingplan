import { Link, Route, Routes } from 'react-router-dom';
import AuthScreen from './components/AuthScreen';
import SaveStatusBanner from './components/SaveStatusBanner';
import SetNewPasswordScreen from './components/SetNewPasswordScreen';
import { useAuth } from './context/AuthContext';
import PlanList from './pages/PlanList';
import NewPlan from './pages/NewPlan';
import PlanBuilder from './pages/PlanBuilder';
import PlanView from './pages/PlanView';
import { hasUnsavedChanges } from './storage';

export default function App() {
  const { user, loading, recoveringPassword, signOut } = useAuth();

  if (loading) return <p className="page-status">Loading…</p>;
  if (!user) return <AuthScreen />;
  if (recoveringPassword) return <SetNewPasswordScreen />;

  function handleSignOut() {
    if (hasUnsavedChanges() && !confirm("Some changes haven't been saved yet. Sign out anyway?")) return;
    signOut();
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <Link to="/" className="app-title">
          Marathon Training Plan
        </Link>
        <div className="app-account">
          <span className="app-account-email">{user.email}</span>
          <button className="btn-link" onClick={handleSignOut}>
            Sign out
          </button>
        </div>
      </header>
      <SaveStatusBanner />
      <main className="app-main">
        <Routes>
          <Route path="/" element={<PlanList />} />
          <Route path="/new" element={<NewPlan />} />
          <Route path="/plan/:planId/build" element={<PlanBuilder />} />
          <Route path="/plan/:planId" element={<PlanView />} />
        </Routes>
      </main>
    </div>
  );
}
