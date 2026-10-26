// "How training is going": headline tiles and charts under the calendar. Charts are plain SVG
// drawn at the container's width; tapping (or hovering) a mark shows its values in a readout line.
import { differenceInCalendarDays } from 'date-fns';
import { CSSProperties, ReactNode, useLayoutEffect, useRef, useState } from 'react';
import type { TrainingPlan } from '../types';
import {
  buildDashboard,
  FeelPoint,
  FeelWeek,
  INTERVAL_FILTERS,
  IntervalFilter,
  LongRunPoint,
  PacePoint,
  WeekMiles,
} from '../utils/dashboard';
import { formatShortDate, fromISODate, todayISODate } from '../utils/dates';
import { formatMiles, PURPOSE_COLORS } from '../utils/display';
import { formatDuration } from '../utils/workouts';

const ACCENT = '#2f6fb3';
/** Planned / de-emphasized marks. Neutral enough to stay distinct from the series hues. */
const PLANNED = '#909090';
const GRID = '#e6e8eb';
const HIGHLIGHT = '#eaf1f9';

// Layout ------------------------------------------------------------------------------------------

function useWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setWidth(el.clientWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

/** Evenly spaced "nice" tick values (steps of 1, 2 or 5 x 10^n) covering 0..max. */
function niceTicks(max: number, count = 4): number[] {
  if (max <= 0) return [0];
  const raw = max / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= raw)!;
  const ticks: number[] = [];
  for (let v = 0; v <= max + step * 0.001; v += step) ticks.push(Math.round(v * 1000) / 1000);
  if (ticks[ticks.length - 1] < max) ticks.push(ticks[ticks.length - 1] + step);
  return ticks;
}

/** Bar with rounded top corners, anchored to the baseline. */
function barPath(x: number, y: number, w: number, h: number, r = 3): string {
  if (h <= 0 || w <= 0) return '';
  const rr = Math.min(r, w / 2, h);
  return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`;
}

function ChartCard({
  title,
  summary,
  legend,
  controls,
  readout,
  children,
}: {
  title: string;
  summary?: ReactNode;
  legend?: ReactNode;
  controls?: ReactNode;
  readout?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="dash-card">
      <h3 className="dash-title">{title}</h3>
      {summary && <p className="dash-summary">{summary}</p>}
      {controls}
      {legend}
      {children}
      {readout && (
        <p className="dash-readout" aria-live="polite">
          {readout}
        </p>
      )}
    </section>
  );
}

function LegendItem({ kind, color, label }: { kind: 'fill' | 'outline' | 'dot' | 'line'; color: string; label: string }) {
  return (
    <span className="dash-legend-item">
      <span className={`dash-key dash-key--${kind}`} style={{ '--key': color } as CSSProperties} />
      {label}
    </span>
  );
}

const Empty = ({ children }: { children: ReactNode }) => <p className="dash-empty">{children}</p>;

// Headline tiles ----------------------------------------------------------------------------------

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="dash-tile">
      <div className="dash-tile-label">{label}</div>
      <div className="dash-tile-value">{value}</div>
      {sub && <div className="dash-tile-sub">{sub}</div>}
    </div>
  );
}

// Weekly mileage ----------------------------------------------------------------------------------

function WeeklyMilesChart({ weeks }: { weeks: WeekMiles[] }) {
  const [ref, width] = useWidth();
  const currentIndex = Math.max(0, weeks.findIndex((w) => w.current));
  const [selected, setSelected] = useState(currentIndex);
  const H = 180;
  const M = { l: 32, r: 4, t: 8, b: 22 };
  const innerW = Math.max(0, width - M.l - M.r);
  const innerH = H - M.t - M.b;
  const ticks = niceTicks(Math.max(1, ...weeks.map((w) => Math.max(w.planned, w.actual))));
  const yMax = ticks[ticks.length - 1];
  const y = (v: number) => M.t + innerH - (v / yMax) * innerH;
  const band = innerW / weeks.length;
  const groupW = Math.min(band * 0.78, 36);
  const barW = Math.max(1, (groupW - 2) / 2);
  const labelEvery = Math.max(1, Math.ceil(20 / band));
  const w = weeks[selected] ?? weeks[0];

  return (
    <ChartCard
      title="Weekly mileage"
      legend={
        <div className="dash-legend">
          <LegendItem kind="outline" color={PLANNED} label="Planned" />
          <LegendItem kind="fill" color={ACCENT} label="Actual" />
        </div>
      }
      readout={
        <>
          <strong>Week {w.week}</strong> ({formatShortDate(w.start)}–{formatShortDate(w.end)}
          {w.current ? ', this week' : ''}) · planned {formatMiles(w.planned)} mi
          {!w.future && <> · actual {formatMiles(w.actual)} mi</>}
        </>
      }
    >
      <div ref={ref} className="dash-chart">
        {width > 0 && (
          <svg width={width} height={H} role="img" aria-label="Planned and actual miles per week">
            {ticks.map((t) => (
              <g key={t}>
                <line x1={M.l} x2={width - M.r} y1={y(t)} y2={y(t)} stroke={GRID} />
                <text x={M.l - 6} y={y(t)} dy="0.32em" textAnchor="end" className="dash-axis">
                  {t}
                </text>
              </g>
            ))}
            {weeks.map((wk, i) => {
              const x0 = M.l + i * band + (band - groupW) / 2;
              return (
                <g key={wk.week}>
                  {i === selected && <rect x={M.l + i * band} y={M.t} width={band} height={innerH} fill={HIGHLIGHT} />}
                  <path
                    d={barPath(x0 + 0.75, y(wk.planned) + 0.75, barW - 1.5, y(0) - y(wk.planned) - 0.75)}
                    fill="white"
                    stroke={PLANNED}
                    strokeWidth={1.5}
                  />
                  {!wk.future && wk.actual > 0 && (
                    <path d={barPath(x0 + barW + 2, y(wk.actual), barW, y(0) - y(wk.actual))} fill={ACCENT} />
                  )}
                  {(i % labelEvery === 0 || i === selected || wk.current) && (
                    <text
                      x={M.l + i * band + band / 2}
                      y={H - 6}
                      textAnchor="middle"
                      className={`dash-axis${wk.current ? ' dash-axis--strong' : ''}`}
                    >
                      {wk.week}
                    </text>
                  )}
                  <rect
                    x={M.l + i * band}
                    y={M.t}
                    width={band}
                    height={innerH}
                    fill="transparent"
                    className="dash-hit"
                    onClick={() => setSelected(i)}
                    onMouseEnter={() => setSelected(i)}
                  />
                </g>
              );
            })}
            <line x1={M.l} x2={width - M.r} y1={y(0)} y2={y(0)} stroke="#c3c8cf" />
          </svg>
        )}
      </div>
      <p className="dash-axis-caption">Week · miles</p>
    </ChartCard>
  );
}

// Long runs -----------------------------------------------------------------------------------------

function LongRunChart({ runs }: { runs: LongRunPoint[] }) {
  const [ref, width] = useWidth();
  const done = runs.filter((r) => !r.planned);
  const defaultIndex = done.length ? runs.indexOf(done[done.length - 1]) : 0;
  const [selected, setSelected] = useState(defaultIndex);
  const color = PURPOSE_COLORS['Long Run'];

  if (runs.length === 0) {
    return (
      <ChartCard title="Long runs">
        <Empty>No long runs in this plan yet.</Empty>
      </ChartCard>
    );
  }

  let summary: ReactNode = 'No long runs logged yet.';
  if (done.length) {
    const first = done[0];
    const longest = done.reduce((a, b) => (b.miles > a.miles ? b : a));
    const gain = longest.miles - first.miles;
    summary =
      gain > 0 ? (
        <>
          Longest so far: <strong>{formatMiles(longest.miles)} mi</strong> · up {formatMiles(gain)} mi from{' '}
          {formatMiles(first.miles)} mi in week {first.week}
        </>
      ) : (
        <>
          Longest so far: <strong>{formatMiles(longest.miles)} mi</strong>
        </>
      );
  }

  const H = 170;
  const M = { l: 32, r: 4, t: 8, b: 22 };
  const innerW = Math.max(0, width - M.l - M.r);
  const innerH = H - M.t - M.b;
  const ticks = niceTicks(Math.max(1, ...runs.map((r) => r.miles)));
  const yMax = ticks[ticks.length - 1];
  const y = (v: number) => M.t + innerH - (v / yMax) * innerH;
  const band = innerW / runs.length;
  const barW = Math.min(band * 0.6, 26);
  const labelEvery = Math.max(1, Math.ceil(20 / band));
  const r = runs[selected] ?? runs[0];

  return (
    <ChartCard
      title="Long runs"
      summary={summary}
      legend={
        <div className="dash-legend">
          <LegendItem kind="fill" color={color} label="Run" />
          <LegendItem kind="outline" color={PLANNED} label="Planned (ahead)" />
        </div>
      }
      readout={
        <>
          <strong>{formatShortDate(r.date)}</strong> · week {r.week} · {formatMiles(r.miles)} mi{r.planned ? ' planned' : ''}
        </>
      }
    >
      <div ref={ref} className="dash-chart">
        {width > 0 && (
          <svg width={width} height={H} role="img" aria-label="Long run distance over the plan">
            {ticks.map((t) => (
              <g key={t}>
                <line x1={M.l} x2={width - M.r} y1={y(t)} y2={y(t)} stroke={GRID} />
                <text x={M.l - 6} y={y(t)} dy="0.32em" textAnchor="end" className="dash-axis">
                  {t}
                </text>
              </g>
            ))}
            {runs.map((run, i) => {
              const x0 = M.l + i * band + (band - barW) / 2;
              return (
                <g key={run.date}>
                  {i === selected && <rect x={M.l + i * band} y={M.t} width={band} height={innerH} fill={HIGHLIGHT} />}
                  {run.planned ? (
                    <path
                      d={barPath(x0 + 0.75, y(run.miles) + 0.75, barW - 1.5, y(0) - y(run.miles) - 0.75)}
                      fill="white"
                      stroke={PLANNED}
                      strokeWidth={1.5}
                    />
                  ) : (
                    <path d={barPath(x0, y(run.miles), barW, y(0) - y(run.miles))} fill={color} />
                  )}
                  {(i % labelEvery === 0 || i === selected) && (
                    <text
                      x={M.l + i * band + band / 2}
                      y={H - 6}
                      textAnchor="middle"
                      className={`dash-axis${i === selected ? ' dash-axis--strong' : ''}`}
                    >
                      {run.week}
                    </text>
                  )}
                  <rect
                    x={M.l + i * band}
                    y={M.t}
                    width={band}
                    height={innerH}
                    fill="transparent"
                    className="dash-hit"
                    onClick={() => setSelected(i)}
                    onMouseEnter={() => setSelected(i)}
                  />
                </g>
              );
            })}
            <line x1={M.l} x2={width - M.r} y1={y(0)} y2={y(0)} stroke="#c3c8cf" />
          </svg>
        )}
      </div>
      <p className="dash-axis-caption">Week · miles</p>
    </ChartCard>
  );
}

// Time axis shared by the pace and feel charts ----------------------------------------------------

function timeScale(plan: TrainingPlan, x0: number, x1: number) {
  const start = plan.days[0].date;
  const end = plan.days[plan.days.length - 1].date;
  const span = Math.max(1, differenceInCalendarDays(fromISODate(end), fromISODate(start)));
  const x = (iso: string) => x0 + (differenceInCalendarDays(fromISODate(iso), fromISODate(start)) / span) * (x1 - x0);
  // Four evenly spaced date labels, snapped to days in the plan.
  const ticks = [0, 1 / 3, 2 / 3, 1].map((f) => plan.days[Math.round(f * (plan.days.length - 1))].date);
  return { x, ticks };
}

function TimeAxis({ ticks, x, y, x0, x1 }: { ticks: string[]; x: (iso: string) => number; y: number; x0: number; x1: number }) {
  return (
    <>
      <line x1={x0} x2={x1} y1={y} y2={y} stroke="#c3c8cf" />
      {ticks.map((t, i) => (
        <text
          key={t}
          x={x(t)}
          y={y + 16}
          textAnchor={i === 0 ? 'start' : i === ticks.length - 1 ? 'end' : 'middle'}
          className="dash-axis"
        >
          {formatShortDate(t)}
        </text>
      ))}
    </>
  );
}

// Pace trend ------------------------------------------------------------------------------------------

function paceChange(points: PacePoint[]): ReactNode {
  if (points.length === 0) return undefined;
  const first = points[0].pace;
  const last = points[points.length - 1].pace;
  if (points.length === 1) return `${formatDuration(last)} /mi so far · log more to see a trend`;
  const diff = Math.round(first - last);
  const amount = Math.abs(diff) < 60 ? `${Math.abs(diff)} sec` : formatDuration(Math.abs(diff));
  const change = diff === 0 ? 'no change' : diff > 0 ? `${amount} faster` : `${amount} slower`;
  return (
    <>
      {formatDuration(first)} → <strong>{formatDuration(last)} /mi</strong> · {change}
    </>
  );
}

function PaceChart({
  plan,
  title,
  points,
  color,
  emptyText,
  controls,
}: {
  plan: TrainingPlan;
  title: string;
  points: PacePoint[];
  color: string;
  emptyText: string;
  controls?: ReactNode;
}) {
  const [ref, width] = useWidth();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const H = 170;
  const M = { l: 40, r: 10, t: 22, b: 24 };
  const { x, ticks: xTicks } = timeScale(plan, M.l, width - M.r);

  if (points.length === 0) {
    return (
      <ChartCard title={title} controls={controls}>
        <Empty>{emptyText}</Empty>
      </ChartCard>
    );
  }

  const innerH = H - M.t - M.b;
  const paces = points.map((p) => p.pace);
  const lo = Math.min(...paces);
  const hi = Math.max(...paces);
  const pad = Math.max(10, (hi - lo) * 0.2);
  const step = [5, 10, 15, 20, 30, 60, 120].find((s) => (hi - lo + 2 * pad) / s <= 4) ?? 300;
  const top = Math.floor((lo - pad) / step) * step;
  const bottom = Math.ceil((hi + pad) / step) * step;
  // Faster (fewer seconds) is higher.
  const y = (sec: number) => M.t + ((sec - top) / (bottom - top)) * innerH;
  const yTicks: number[] = [];
  for (let v = top; v <= bottom; v += step) yTicks.push(v);
  const sel = points.find((p) => p.date === selectedDate) ?? points[points.length - 1];

  return (
    <ChartCard
      title={title}
      summary={paceChange(points)}
      controls={controls}
      readout={
        <>
          <strong>{formatShortDate(sel.date)}</strong> · {formatDuration(sel.pace)} /mi · {sel.note}
        </>
      }
    >
      <div ref={ref} className="dash-chart">
        {width > 0 && (
          <svg width={width} height={H} role="img" aria-label={`${title}, faster is higher`}>
            <text x={4} y={12} className="dash-axis">
              faster ↑
            </text>
            {yTicks.map((t) => (
              <g key={t}>
                <line x1={M.l} x2={width - M.r} y1={y(t)} y2={y(t)} stroke={GRID} />
                <text x={M.l - 6} y={y(t)} dy="0.32em" textAnchor="end" className="dash-axis">
                  {formatDuration(t)}
                </text>
              </g>
            ))}
            <TimeAxis ticks={xTicks} x={x} y={H - M.b} x0={M.l} x1={width - M.r} />
            {points.length > 1 && (
              <polyline
                points={points.map((p) => `${x(p.date)},${y(p.pace)}`).join(' ')}
                fill="none"
                stroke={color}
                strokeWidth={2}
                strokeLinejoin="round"
              />
            )}
            {points.map((p) => (
              <g key={p.date}>
                <circle
                  cx={x(p.date)}
                  cy={y(p.pace)}
                  r={p === sel ? 6 : 4.5}
                  fill={color}
                  stroke="white"
                  strokeWidth={2}
                />
                <circle
                  cx={x(p.date)}
                  cy={y(p.pace)}
                  r={14}
                  fill="transparent"
                  className="dash-hit"
                  onClick={() => setSelectedDate(p.date)}
                  onMouseEnter={() => setSelectedDate(p.date)}
                />
              </g>
            ))}
          </svg>
        )}
      </div>
    </ChartCard>
  );
}

function IntervalChart({ plan, sessions }: { plan: TrainingPlan; sessions: Partial<Record<IntervalFilter, PacePoint[]>> }) {
  const available = INTERVAL_FILTERS.filter((f) => sessions[f]?.length);
  const [filter, setFilter] = useState<IntervalFilter>('All');
  const active = available.includes(filter) ? filter : 'All';
  const controls =
    available.length > 1 ? (
      <div className="dash-filters" role="radiogroup" aria-label="Rep distance">
        {available.map((f) => (
          <button
            key={f}
            type="button"
            role="radio"
            aria-checked={f === active}
            className={`dash-chip${f === active ? ' active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>
    ) : undefined;
  return (
    <PaceChart
      plan={plan}
      title="Interval pace"
      points={sessions[active] ?? []}
      color={PURPOSE_COLORS.Intervals}
      emptyText="Log your interval reps to see your pace trend here."
      controls={controls}
    />
  );
}

// How runs are feeling ----------------------------------------------------------------------------

function FeelChart({
  plan,
  points,
  weeks,
  thisWeek,
  lastWeek,
}: {
  plan: TrainingPlan;
  points: FeelPoint[];
  weeks: FeelWeek[];
  thisWeek?: number;
  lastWeek?: number;
}) {
  const [ref, width] = useWidth();
  const [selected, setSelected] = useState<{ kind: 'run'; p: FeelPoint } | { kind: 'week'; w: FeelWeek } | null>(null);
  const H = 160;
  const M = { l: 24, r: 10, t: 22, b: 24 };
  const { x, ticks: xTicks } = timeScale(plan, M.l, width - M.r);

  if (points.length === 0) {
    return (
      <ChartCard title="How runs are feeling">
        <Empty>Rate how your runs feel in the log to see this chart.</Empty>
      </ChartCard>
    );
  }

  const innerH = H - M.t - M.b;
  const y = (rating: number) => M.t + ((5 - rating) / 4) * innerH;
  const latestWeek = weeks[weeks.length - 1];
  const summary =
    thisWeek !== undefined ? (
      <>
        This week avg <strong>{thisWeek.toFixed(1)}</strong>
        {lastWeek !== undefined && <> · last week {lastWeek.toFixed(1)}</>}
      </>
    ) : (
      <>
        Latest: week {latestWeek.week} avg <strong>{latestWeek.average.toFixed(1)}</strong>
      </>
    );
  const shown = selected ?? { kind: 'run' as const, p: points[points.length - 1] };

  return (
    <ChartCard
      title="How runs are feeling"
      summary={summary}
      legend={
        <div className="dash-legend">
          <LegendItem kind="dot" color={PLANNED} label="Each run" />
          <LegendItem kind="line" color={ACCENT} label="Weekly average" />
        </div>
      }
      readout={
        shown.kind === 'run' ? (
          <>
            <strong>{formatShortDate(shown.p.date)}</strong> · {shown.p.purpose ?? 'Run'} · felt {shown.p.rating}/5
          </>
        ) : (
          <>
            <strong>Week {shown.w.week}</strong> average {shown.w.average.toFixed(1)}
          </>
        )
      }
    >
      <div ref={ref} className="dash-chart">
        {width > 0 && (
          <svg width={width} height={H} role="img" aria-label="How runs felt, 1 to 5, with weekly average">
            <text x={4} y={12} className="dash-axis">
              5 = very good
            </text>
            {[1, 2, 3, 4, 5].map((t) => (
              <g key={t}>
                <line x1={M.l} x2={width - M.r} y1={y(t)} y2={y(t)} stroke={GRID} />
                <text x={M.l - 8} y={y(t)} dy="0.32em" textAnchor="end" className="dash-axis">
                  {t}
                </text>
              </g>
            ))}
            <TimeAxis ticks={xTicks} x={x} y={H - M.b} x0={M.l} x1={width - M.r} />
            {points.map((p) => (
              <g key={p.date}>
                <circle cx={x(p.date)} cy={y(p.rating)} r={shown.kind === 'run' && shown.p === p ? 5 : 3.5} fill={PLANNED} stroke="white" strokeWidth={1.5} />
                <circle
                  cx={x(p.date)}
                  cy={y(p.rating)}
                  r={11}
                  fill="transparent"
                  className="dash-hit"
                  onClick={() => setSelected({ kind: 'run', p })}
                  onMouseEnter={() => setSelected({ kind: 'run', p })}
                />
              </g>
            ))}
            {weeks.length > 1 && (
              <polyline
                points={weeks.map((w) => `${x(w.mid)},${y(w.average)}`).join(' ')}
                fill="none"
                stroke={ACCENT}
                strokeWidth={2}
                strokeLinejoin="round"
              />
            )}
            {weeks.map((w) => (
              <g key={w.week}>
                <circle
                  cx={x(w.mid)}
                  cy={y(w.average)}
                  r={shown.kind === 'week' && shown.w === w ? 6 : 4.5}
                  fill={ACCENT}
                  stroke="white"
                  strokeWidth={2}
                />
                <circle
                  cx={x(w.mid)}
                  cy={y(w.average)}
                  r={12}
                  fill="transparent"
                  className="dash-hit"
                  onClick={() => setSelected({ kind: 'week', w })}
                  onMouseEnter={() => setSelected({ kind: 'week', w })}
                />
              </g>
            ))}
          </svg>
        )}
      </div>
    </ChartCard>
  );
}

// The dashboard -----------------------------------------------------------------------------------

export default function Dashboard({ plan }: { plan: TrainingPlan }) {
  const today = todayISODate();
  const d = buildDashboard(plan, today);
  const { milesToDate, runsToDate, thisWeek } = d;
  const started = plan.days[0].date <= today;
  const pct = milesToDate.planned > 0 ? Math.round((milesToDate.actual / milesToDate.planned) * 100) : undefined;

  return (
    <div className="dashboard">
      <h2 className="dash-heading">How training is going</h2>
      <div className="dash-tiles">
        <Tile
          label="Miles so far"
          value={`${formatMiles(milesToDate.actual)} of ${formatMiles(milesToDate.planned)} mi`}
          sub={started ? (pct !== undefined ? `${pct}% of plan to date` : undefined) : `Plan starts ${formatShortDate(plan.days[0].date)}`}
        />
        <Tile
          label="Runs done"
          value={`${runsToDate.completed} of ${runsToDate.planned}`}
          sub={runsToDate.skipped ? `${runsToDate.skipped} skipped` : 'None skipped'}
        />
        <Tile
          label="This week"
          value={`${formatMiles(thisWeek.actual)} of ${formatMiles(thisWeek.planned)} mi`}
          sub={`Week ${thisWeek.week} · ${formatShortDate(thisWeek.start)}–${formatShortDate(thisWeek.end)}`}
        />
        <Tile
          label="Feel this week"
          value={d.feelThisWeek !== undefined ? `${d.feelThisWeek.toFixed(1)} / 5` : '—'}
          sub={
            d.feelLastWeek !== undefined
              ? `Last week ${d.feelLastWeek.toFixed(1)}`
              : d.feelThisWeek === undefined
                ? 'No ratings yet'
                : undefined
          }
        />
      </div>
      <WeeklyMilesChart weeks={d.weeks} />
      <LongRunChart runs={d.longRuns} />
      <PaceChart
        plan={plan}
        title="Threshold pace"
        points={d.threshold}
        color={PURPOSE_COLORS.Threshold}
        emptyText="Log paces on a threshold run to see your trend here."
      />
      <IntervalChart plan={plan} sessions={d.intervals} />
      <FeelChart plan={plan} points={d.feel} weeks={d.feelWeeks} thisWeek={d.feelThisWeek} lastWeek={d.feelLastWeek} />
    </div>
  );
}
