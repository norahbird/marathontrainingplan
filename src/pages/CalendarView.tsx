import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { CSSProperties, useState } from 'react';
import { PlanDay, TrainingPlan } from '../types';
import Dashboard from '../components/Dashboard';
import { clampToPlan, fromISODate, toISODate, todayISODate, weekdayLabels } from '../utils/dates';
import { calendarBubble, PURPOSE_COLORS, RACE_DAY_COLOR, REST_COLOR } from '../utils/display';

export default function CalendarView({ plan }: { plan: TrainingPlan }) {
  const weekStartsOn = plan.weekStartsOn ?? 0;
  const todayISO = todayISODate();
  // Open on the current month (or the plan's first/last month if today is outside it).
  const [monthCursor, setMonthCursor] = useState(() =>
    startOfMonth(fromISODate(clampToPlan(plan.days, todayISO))),
  );

  const dayByDate = new Map<string, PlanDay>(plan.days.map((d) => [d.date, d]));

  const gridStart = startOfWeek(startOfMonth(monthCursor), { weekStartsOn });
  const gridEnd = endOfWeek(endOfMonth(monthCursor), { weekStartsOn });
  const gridDays = eachDayOfInterval({ start: gridStart, end: gridEnd });

  return (
    <div>
      <div className="calendar-nav">
        <button className="btn-secondary" onClick={() => setMonthCursor(subMonths(monthCursor, 1))}>
          &larr; Prev
        </button>
        <span className="calendar-month-title">{format(monthCursor, 'MMMM yyyy')}</span>
        <button className="btn-secondary" onClick={() => setMonthCursor(addMonths(monthCursor, 1))}>
          Next &rarr;
        </button>
      </div>

      <div className="calendar-grid">
        {weekdayLabels(weekStartsOn).map((w) => (
          <div className="calendar-weekday" key={w}>
            {w}
          </div>
        ))}
        {gridDays.map((date) => {
          const iso = toISODate(date);
          const day = dayByDate.get(iso);
          const inMonth = isSameMonth(date, monthCursor);
          const bubble = day?.dayType ? calendarBubble(day, plan.raceDistance) : null;
          const timing = iso < todayISO ? 'past' : iso === todayISO ? 'today' : '';
          return (
            <div key={iso} className={`calendar-cell ${inMonth ? timing : 'empty'}`}>
              {inMonth && (
                <>
                  <span className="calendar-cell-date">{format(date, 'd')}</span>
                  {bubble && (
                    <span
                      className={`calendar-cell-bubble ${day?.log ? 'calendar-cell-bubble--done' : ''} ${bubble.short ? 'calendar-cell-bubble--short' : ''}`}
                      style={{ '--bubble': bubble.color } as CSSProperties}
                    >
                      <span className="label-full">{bubble.label}</span>
                      <span className="label-short">{bubble.shortLabel}</span>
                    </span>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      <div className="legend">
        {Object.entries(PURPOSE_COLORS).map(([purpose, color]) => (
          <span className="legend-item" key={purpose}>
            <span className="legend-swatch" style={{ background: color }} />
            {purpose}
          </span>
        ))}
        <span className="legend-item">
          <span className="legend-swatch" style={{ background: REST_COLOR }} />
          Rest
        </span>
        <span className="legend-item">
          <span className="legend-swatch" style={{ background: RACE_DAY_COLOR }} />
          Race Day
        </span>
      </div>
      <Dashboard plan={plan} />
    </div>
  );
}
