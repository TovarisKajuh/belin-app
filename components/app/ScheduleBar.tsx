// Where a project lands against the day it was promised for.
//
// This replaced a cumulative progress sparkline, which could not do the job it
// was given. Every finished project is at 100 percent, so its progress line
// always climbs from nothing to full: four delivered projects side by side drew
// four near identical curves. A mark that looks the same whatever the data says
// is not showing data, and a row of them is worse than an empty space because
// it reads as information.
//
// The question that means something on a running project AND on one delivered
// two months ago is the same question: did it land when it was promised. So the
// mark is a diverging bar on a zero line, buffer to the right, overrun to the
// left, on one shared scale for every card. Cards are comparable at a glance,
// and a project that ran long is instantly the odd one out.
//
// Per the form rules this is polarity, not magnitude and not a trend, so it
// takes a diverging pair around a neutral midpoint. The two hues are blue and
// orange rather than the obvious green and red, because green and red is the
// one pair a colourblind reader cannot separate: it failed the CVD check at
// deltaE 5.3, while this pair passes at 24.3. The number is printed beside the
// bar regardless, so colour is never carrying the meaning alone.

/** Working days beyond which the bar is pinned. The label stays exact. */
const SCALE_DAYS = 15;

export function ScheduleBar({
  days,
  label,
}: {
  /** Positive is buffer, negative is overrun, null is nothing to say. */
  days: number | null;
  /** Reader-facing text, already pluralised and translated. */
  label: string;
}) {
  if (days === null) return null;

  const magnitude = Math.min(Math.abs(days), SCALE_DAYS) / SCALE_DAYS;
  const ahead = days >= 0;
  // Half the track each way, so zero sits dead centre on every card.
  const width = magnitude * 50;

  return (
    <div className="sb" role="img" aria-label={label}>
      <div className="sb-track">
        <span
          className={`sb-fill${ahead ? " ahead" : " behind"}`}
          style={ahead ? { left: "50%", width: `${width}%` } : { right: "50%", width: `${width}%` }}
        />
        <span className="sb-zero" aria-hidden />
      </div>
      <span className={`sb-label${ahead ? " ahead" : " behind"}`}>{label}</span>
    </div>
  );
}
