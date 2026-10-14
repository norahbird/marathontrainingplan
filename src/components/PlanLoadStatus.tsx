import { Link } from 'react-router-dom';

interface Props {
  state: 'loading' | 'ready' | 'missing' | 'error';
  error: string | null;
}

export default function PlanLoadStatus({ state, error }: Props) {
  if (state === 'missing') {
    return (
      <p className="page-status">
        This plan wasn't found in your account. <Link to="/">Back to your plans</Link>
      </p>
    );
  }
  if (state === 'error') {
    return (
      <p className="page-status">
        Couldn't load this plan. {error} <Link to="/">Back to your plans</Link>
      </p>
    );
  }
  return <p className="page-status">Loading…</p>;
}
