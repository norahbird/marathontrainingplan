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
import { useState } from 'react';
import { PlanDay, TrainingPlan } from '../types';
import { fromISODate, toISODate } from '../utils/dates';
import { dayCellLabel, dayColor, PURPOSE_COLORS, REST_COLOR } from '../utils/display';

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CalendarView({ plan }: { plan: TrainingPlan }) {
  const firstDay = fromISODate(plan.days[0].date);
  const [monthCursor, setMonthCursor] = useState(startOfMonth(firstDay));

  const dayByDate = new Map<string, PlanDay>(plan.days.map((d) => [d.date, d]));

  const gridStart = startOfWeek(startOfMonth(monthCursor));
  const gridEnd = endOfWeek(endOfMonth(monthCursor));
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
        {WEEKDAY_LABELS.map((w) => (
          <div className="calendar-weekday" key={w}>
            {w}
          </div>
        ))}
        {gridDays.map((date) => {
          const iso = toISODate(date);
          const day = dayByDate.get(iso);
          const inMonth = isSameMonth(date, monthCursor);
          return (
            <div key={iso} className={`calendar-cell ${inMonth ? '' : 'empty'}`}>
              {inMonth && (
                <>
                  <span className="calendar-cell-date">{format(date, 'd')}</span>
                  {day?.dayType && (
                    <span className="calendar-cell-bubble" style={{ background: dayColor(day) }}>
                      {dayCellLabel(day)}
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
      </div>
    </div>
  );
}
