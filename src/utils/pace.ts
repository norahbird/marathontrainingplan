export const RACE_DISTANCE_MILES: Record<string, number> = {
  '5K': 3.10686,
  '10K': 6.21371,
  'Half Marathon': 13.1094,
  Marathon: 26.2188,
};

/** Parses "H:MM:SS" or "MM:SS" into total seconds, or null if unparseable. */
export function parseGoalTime(input: string): number | null {
  const parts = input.trim().split(':');
  if (parts.length < 2 || parts.length > 3 || parts.some((p) => p.trim() === '')) return null;
  const nums = parts.map(Number);
  if (nums.some((n) => Number.isNaN(n) || n < 0)) return null;

  const [h, m, s] = parts.length === 3 ? nums : [0, nums[0], nums[1]];
  return h * 3600 + m * 60 + s;
}

function formatPace(secondsPerMile: number): string {
  const totalSeconds = Math.round(secondsPerMile);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/** Returns a "M:SS /mile" pace string, or null if the distance/time can't be computed. */
export function computePaceLabel(raceDistance: string, goalTime: string): string | null {
  const miles = RACE_DISTANCE_MILES[raceDistance];
  if (!miles) return null;

  const totalSeconds = parseGoalTime(goalTime);
  if (!totalSeconds) return null;

  return `${formatPace(totalSeconds / miles)} /mile`;
}
