// Workout details in the run logger: threshold paces, interval reps, long-run workouts and strides.
// Each section reports edits with onChange and asks to save with onCommit (on blur, add or remove).
import { LONG_RUN_WORKOUT_KINDS, LongRunWorkoutKind } from '../types';
import { formatDuration, repPaceSeconds } from '../utils/workouts';
import {
  emptyMinSec,
  IntervalDraft,
  intervalFromDraft,
  MinSecDraft,
  newIntervalDraft,
  newWorkoutDraft,
  StridesDraft,
  WorkoutDraft,
} from './workoutDrafts';

interface SectionProps<T> {
  value: T;
  onChange: (next: T) => void;
  onCommit: (next: T) => void;
}

/** Minutes and seconds as two number-pad boxes (the iPhone number pad has no ":"). */
function MinSecInput({
  value,
  onChange,
  onBlur,
  label,
}: {
  value: MinSecDraft;
  onChange: (next: MinSecDraft) => void;
  onBlur: () => void;
  label: string;
}) {
  const digits = (text: string, max: number) => text.replace(/\D/g, '').slice(0, max);
  return (
    <span className="minsec">
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        placeholder="min"
        aria-label={`${label} minutes`}
        value={value.min}
        onChange={(e) => onChange({ ...value, min: digits(e.target.value, 3) })}
        onBlur={onBlur}
      />
      <span className="minsec-colon">:</span>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        placeholder="sec"
        aria-label={`${label} seconds`}
        value={value.sec}
        onChange={(e) => onChange({ ...value, sec: digits(e.target.value, 2) })}
        onBlur={onBlur}
      />
    </span>
  );
}

function Toggle<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: [T, string][];
  value: T;
  onChange: (next: T) => void;
  label: string;
}) {
  return (
    <span className="seg" role="radiogroup" aria-label={label}>
      {options.map(([v, text]) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={value === v}
          className={`seg-btn${value === v ? ' active' : ''}`}
          onClick={() => onChange(v)}
        >
          {text}
        </button>
      ))}
    </span>
  );
}

function RemoveButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button type="button" className="btn-danger" aria-label={label} onClick={onClick}>
      Remove
    </button>
  );
}

function replaceAt<T>(list: T[], index: number, item: T): T[] {
  return list.map((x, i) => (i === index ? item : x));
}

// Threshold ------------------------------------------------------------------------------------

export function ThresholdFields({ value, onChange, onCommit }: SectionProps<MinSecDraft[]>) {
  return (
    <div className="field">
      <label>Threshold pace (per mile)</label>
      <div className="workout-list">
        {value.map((pace, i) => (
          <div className="rep-line" key={i}>
            <span className="inline-label">Section {i + 1}</span>
            <MinSecInput
              label={`Section ${i + 1} pace`}
              value={pace}
              onChange={(next) => onChange(replaceAt(value, i, next))}
              onBlur={() => onCommit(value)}
            />
            <span className="unit">/mi</span>
            {value.length > 1 && (
              <RemoveButton label={`Remove section ${i + 1}`} onClick={() => onCommit(value.filter((_, j) => j !== i))} />
            )}
          </div>
        ))}
      </div>
      <button type="button" className="btn-link" onClick={() => onCommit([...value, emptyMinSec()])}>
        + Add section
      </button>
    </div>
  );
}

// Intervals ------------------------------------------------------------------------------------

const INTERVAL_OPTIONS: [IntervalDraft['kind'], string][] = [
  ['400m', '400m'],
  ['800m', '800m'],
  ['1200m', '1200m'],
  ['1mi', '1 mi'],
  ['custom', 'Custom distance'],
  ['time', 'Time'],
];

export function IntervalFields({
  value,
  onChange,
  onCommit,
  leftovers,
}: SectionProps<IntervalDraft[]> & { leftovers: string[] }) {
  const edit = (i: number, patch: Partial<IntervalDraft>) => onChange(replaceAt(value, i, { ...value[i], ...patch }));
  const commit = () => onCommit(value);
  const removeRep = (i: number) => (
    <span className="rep-remove">
      <RemoveButton label={`Remove interval ${i + 1}`} onClick={() => onCommit(value.filter((_, j) => j !== i))} />
    </span>
  );

  return (
    <div className="field">
      <label>Intervals</label>
      {leftovers.length > 0 && <p className="field-hint">Earlier notes: {leftovers.join(', ')}</p>}
      <div className="workout-list">
        {value.map((rep, i) => {
          const pace = repPaceSeconds(intervalFromDraft(rep));
          return (
            <div className="rep" key={i}>
              <div className="rep-top">
                <span className="rep-num">{i + 1}</span>
                <select
                  aria-label={`Interval ${i + 1} type`}
                  value={rep.kind}
                  onChange={(e) => onCommit(replaceAt(value, i, { ...rep, kind: e.target.value as IntervalDraft['kind'] }))}
                >
                  {rep.kind === '' && <option value="">Choose…</option>}
                  {INTERVAL_OPTIONS.map(([v, text]) => (
                    <option key={v} value={v}>
                      {text}
                    </option>
                  ))}
                </select>
                <span className="rep-pace">{pace ? `${formatDuration(pace)} /mi` : '–:–– /mi'}</span>
              </div>
              {rep.kind === 'custom' && (
                <div className="rep-line">
                  <span className="inline-label">Distance</span>
                  <input
                    className="num-input"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="any"
                    placeholder={rep.customUnit === 'm' ? '600' : '2'}
                    aria-label={`Interval ${i + 1} distance`}
                    value={rep.customDistance}
                    onChange={(e) => edit(i, { customDistance: e.target.value })}
                    onBlur={commit}
                  />
                  <Toggle
                    label={`Interval ${i + 1} distance unit`}
                    options={[
                      ['m', 'm'],
                      ['mi', 'mi'],
                    ]}
                    value={rep.customUnit}
                    onChange={(unit) => onCommit(replaceAt(value, i, { ...rep, customUnit: unit }))}
                  />
                </div>
              )}
              <div className="rep-line">
                <span className="inline-label">{rep.kind === 'time' ? 'Duration' : 'Time'}</span>
                <MinSecInput
                  label={`Interval ${i + 1} ${rep.kind === 'time' ? 'duration' : 'time'}`}
                  value={rep.time}
                  onChange={(time) => edit(i, { time })}
                  onBlur={commit}
                />
                {rep.kind !== 'time' && removeRep(i)}
              </div>
              {rep.kind === 'time' && (
                <div className="rep-line">
                  <span className="inline-label">Distance</span>
                  <input
                    className="num-input"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="any"
                    placeholder="0.5"
                    aria-label={`Interval ${i + 1} distance in miles`}
                    value={rep.distanceMiles}
                    onChange={(e) => edit(i, { distanceMiles: e.target.value })}
                    onBlur={commit}
                  />
                  <span className="unit">mi</span>
                  {removeRep(i)}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <button
        type="button"
        className="btn-link"
        onClick={() => onCommit([...value, newIntervalDraft(value[value.length - 1])])}
      >
        + Add interval
      </button>
    </div>
  );
}

// Long run workouts ----------------------------------------------------------------------------

export function LongRunFields({ value, onChange, onCommit }: SectionProps<WorkoutDraft[]>) {
  const edit = (i: number, patch: Partial<WorkoutDraft>) => onChange(replaceAt(value, i, { ...value[i], ...patch }));
  const commit = () => onCommit(value);

  return (
    <div className="field">
      <label>Workouts</label>
      {value.length > 0 && (
        <div className="workout-list">
          {value.map((w, i) => (
            <div className="rep" key={i}>
              <div className="rep-top">
                <span className="rep-title">{w.kind}</span>
                <span className="rep-remove">
                  <RemoveButton label={`Remove ${w.kind}`} onClick={() => onCommit(value.filter((_, j) => j !== i))} />
                </span>
              </div>
              <div className="rep-line">
                <Toggle
                  label={`${w.kind} distance or time`}
                  options={[
                    ['distance', 'Distance'],
                    ['time', 'Time'],
                  ]}
                  value={w.measure}
                  onChange={(measure) => onCommit(replaceAt(value, i, { ...w, measure }))}
                />
                {w.measure === 'distance' ? (
                  <>
                    <input
                      className="num-input"
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="any"
                      placeholder="6"
                      aria-label={`${w.kind} distance in miles`}
                      value={w.distanceMiles}
                      onChange={(e) => edit(i, { distanceMiles: e.target.value })}
                      onBlur={commit}
                    />
                    <span className="unit">mi</span>
                  </>
                ) : (
                  <MinSecInput label={`${w.kind} time`} value={w.time} onChange={(time) => edit(i, { time })} onBlur={commit} />
                )}
              </div>
              <div className="rep-line">
                <span className="inline-label">Avg pace</span>
                <MinSecInput label={`${w.kind} average pace`} value={w.pace} onChange={(pace) => edit(i, { pace })} onBlur={commit} />
                <span className="unit">/mi</span>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="add-workout">
        <span className="inline-label">Add workout:</span>
        {LONG_RUN_WORKOUT_KINDS.map((kind: LongRunWorkoutKind) => (
          <button key={kind} type="button" className="btn-secondary btn-small" onClick={() => onCommit([...value, newWorkoutDraft(kind)])}>
            + {kind}
          </button>
        ))}
      </div>
    </div>
  );
}

// Strides --------------------------------------------------------------------------------------

export function StridesFields({ value, onChange, onCommit }: SectionProps<StridesDraft | null>) {
  if (!value) {
    return (
      <button type="button" className="btn-link" onClick={() => onCommit({ count: '', pace: emptyMinSec() })}>
        + Add strides
      </button>
    );
  }
  const commit = () => onCommit(value);
  return (
    <div className="field">
      <div className="field-head">
        <label>Strides (30 seconds each)</label>
        <RemoveButton label="Remove strides" onClick={() => onCommit(null)} />
      </div>
      <div className="rep-line">
        <input
          className="num-input num-input--short"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          placeholder="6"
          aria-label="Number of strides"
          value={value.count}
          onChange={(e) => onChange({ ...value, count: e.target.value.replace(/\D/g, '').slice(0, 2) })}
          onBlur={commit}
        />
        <span className="inline-label">strides @</span>
        <MinSecInput label="Strides pace" value={value.pace} onChange={(pace) => onChange({ ...value, pace })} onBlur={commit} />
        <span className="unit">/mi</span>
      </div>
    </div>
  );
}
