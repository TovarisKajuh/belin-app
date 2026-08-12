// One project's progress trend, as a shape.
//
// This is the only mark on the portfolio screen, and it earns its place because
// the thing it shows cannot be said as a number: 60 percent reached steadily
// and 60 percent reached in a rush after three dead weeks look identical in the
// figure and completely different here.
//
// Deliberately spare, per the form rules: one series so no legend (the card
// title names it), no axes, no gridlines, no value labels, a 2px line, and the
// area beneath it only as a faint wash to anchor the baseline. The percentage
// itself is already printed next to it, so the chart carries shape alone.
//
// The y scale is FIXED to 0..100 rather than fitted to the data. A fitted scale
// would make every project's line look equally dramatic, which is exactly the
// misreading the tempo research warned about: the reader compares slopes across
// cards, so the slopes have to mean the same thing on each.

export function ProgressSparkline({ points, label }: { points: number[]; label: string }) {
  // Two points are the minimum for a line to mean anything. One report is a
  // dot, and a dot pretending to be a trend is worse than no chart.
  if (points.length < 2) return null;

  const width = 120;
  const height = 30;
  const stepX = width / (points.length - 1);
  const y = (value: number) => height - (Math.max(0, Math.min(100, value)) / 100) * height;

  const line = points.map((value, i) => `${i === 0 ? "M" : "L"}${i * stepX},${y(value)}`).join(" ");
  const area = `${line} L${width},${height} L0,${height} Z`;

  return (
    <svg
      className="pf-spark"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={label}
      preserveAspectRatio="none"
    >
      <path className="pf-spark-a" d={area} />
      <path className="pf-spark-l" d={line} />
    </svg>
  );
}
