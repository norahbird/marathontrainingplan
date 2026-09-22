import { Link, Route, Routes } from 'react-router-dom';
import PlanList from './pages/PlanList';
import NewPlan from './pages/NewPlan';
import PlanBuilder from './pages/PlanBuilder';
import PlanView from './pages/PlanView';

export default function App() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <Link to="/" className="app-title">
          Marathon Training Plan
        </Link>
      </header>
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
