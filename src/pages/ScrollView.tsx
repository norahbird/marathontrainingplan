import { CSSProperties, useEffect, useRef, useState } from 'react';
import LogEditor from '../components/LogEditor';
import { PlanDay, RunLog, TrainingPlan } from '../types';
import { formatDisplayDate, groupIntoWeeks, todayISODate, weekIndexFor } from '../utils/dates';
import { actualMiles, formatMiles, logRowSummary, plannedMiles } from '../utils/display';

interface Props {
  plan: TrainingPlan;
  onUpdateDay: (day: PlanDay) => void;
}

export default function ScrollView({ plan, onUpdateDay }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const weekRefs = useRef<(HTMLDivElement | null)[]>([]);
  const todayISO = todayISODate();
  const weeks = groupIntoWeeks(plan.days, plan.weekStartsOn ?? 0);

  // Open on the current week (or the first/last week if today is outside the plan).
  useEffect(() => {
    const index = weekIndexFor(weeks, todayISO);
    if (index > 0) weekRefs.current[index]?.scrollIntoView({ block: 'start' });
    // Only when the log first opens; later updates shouldn't move the page.
  }, []);

  function handleLogChange(day: PlanDay, log: RunLog | undefined) {
    onUpdateDay({ ...day, log });
  }

  return (
    <div>
      {weeks.map((week, i) => (
        <div
          className="builder-week"
          key={week[0].date}
          ref={(el) => {
            weekRefs.current[i] = el;
          }}
        >
          <div className="builder-week-title">Week {i + 1}</div>
          <div className="log-list">
            {week.map((day) => {
              const isOpen = expanded === day.date;
              const row = logRowSummary(day, plan.raceDistance);
              return (
                <div className={`log-item${day.date === todayISO ? ' log-item--today' : ''}`} key={day.date}>
                  <div className="log-item-header" onClick={() => setExpanded(isOpen ? null : day.date)}>
                    <span className="log-item-date">{formatDisplayDate(day.date)}</span>
                    <span
                      className={`log-item-tag${row.logged ? ' log-item-tag--done' : ''}`}
                      style={{ '--bubble': row.color } as CSSProperties}
                    >
                      {row.tag}
                    </span>
                    <span
                      className={`log-item-amount${row.logged ? ' log-item-amount--actual' : ''}${row.skipped ? ' log-item-amount--skipped' : ''}`}
                    >
                      {row.main}
                    </span>
                    {row.secondary && (
                      <span className="log-item-right">
                        <span className={row.logged ? 'log-item-planned' : 'log-item-status'}>{row.secondary}</span>
                      </span>
                    )}
                  </div>

                  {isOpen && (
                    <div className="log-item-body">
                      {day.run?.description && (
                        <div className="log-item-description">{day.run.description}</div>
                      )}

                      <div className="log-section-title">Log what actually happened</div>
                      <LogEditor
                        day={day}
                        onSave={(log) => handleLogChange(day, log)}
                        onClose={() => setExpanded(null)}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="builder-week-total">
            Planned: {formatMiles(plannedMiles(week, plan.raceDistance))} miles &middot; Actual:{' '}
            {formatMiles(actualMiles(week))} miles
          </div>
        </div>
      ))}
    </div>
  );
}
