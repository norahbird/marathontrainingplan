import { useState } from 'react';
import LogEditor from '../components/LogEditor';
import { PlanDay, RunLog, TrainingPlan } from '../types';
import { formatDisplayDate } from '../utils/dates';
import { dayCellLabel, dayColor, raceDayDistanceText, RACE_DAY_TAG } from '../utils/display';

interface Props {
  plan: TrainingPlan;
  onUpdateDay: (day: PlanDay) => void;
}

function statusLabel(day: PlanDay): string {
  if (!day.log) return day.dayType === 'run' ? 'Not logged yet' : '';
  if (day.log.status === 'completed') return 'Completed';
  if (day.log.status === 'skipped') return 'Skipped';
  return 'Ran instead of resting';
}

export default function ScrollView({ plan, onUpdateDay }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);

  function handleLogChange(day: PlanDay, log: RunLog | undefined) {
    onUpdateDay({ ...day, log });
  }

  return (
    <div className="log-list">
      {plan.days.map((day) => {
        const isOpen = expanded === day.date;
        return (
          <div className="log-item" key={day.date}>
            <div className="log-item-header" onClick={() => setExpanded(isOpen ? null : day.date)}>
              <span className="log-item-date">{formatDisplayDate(day.date)}</span>
              <span className="log-item-tag" style={{ background: dayColor(day) }}>
                {day.dayType === 'rest' ? 'Rest' : day.dayType === 'race' ? RACE_DAY_TAG : day.run?.purpose ?? '—'}
              </span>
              <span className="log-item-amount">
                {day.dayType === 'race' ? raceDayDistanceText(plan.raceDistance) : dayCellLabel(day)}
              </span>
              <span className="log-item-status">{statusLabel(day)}</span>
            </div>

            {isOpen && (
              <div className="log-item-body">
                {day.run?.description && (
                  <div className="log-item-description">{day.run.description}</div>
                )}

                <div className="log-section-title">Log what actually happened</div>
                <LogEditor day={day} onSave={(log) => handleLogChange(day, log)} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
