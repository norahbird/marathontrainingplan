import type { PlanDay, RunPurpose } from '../types';

export const PURPOSE_COLORS: Record<RunPurpose, string> = {
  'General Aerobic': '#2f6fb3',
  'Long Run': '#c0392b',
  Threshold: '#e07b1a',
  Intervals: '#7d3c9e',
  Recovery: '#d4b30a',
  'Tune-up Race': '#2e9e5b',
};

export const REST_COLOR = '#1c1c1c';

export function dayColor(day: PlanDay): string {
  if (day.dayType === 'rest') return REST_COLOR;
  if (day.dayType === 'run' && day.run) return PURPOSE_COLORS[day.run.purpose];
  return '#9aa0a6';
}

export function dayCellLabel(day: PlanDay): string {
  if (day.dayType === 'rest') return 'Rest';
  if (day.dayType === 'run' && day.run) {
    return day.run.metric === 'distance'
      ? `${formatNumber(day.run.distanceMiles)} miles`
      : `${formatNumber(day.run.timeMinutes)} minutes`;
  }
  return '';
}

function formatNumber(n: number | undefined): string {
  if (n === undefined) return '';
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}
