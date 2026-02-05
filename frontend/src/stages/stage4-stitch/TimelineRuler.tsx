interface TimelineRulerProps {
  totalDurationMs: number;
  pixelsPerSecond: number;
}

export default function TimelineRuler({ totalDurationMs, pixelsPerSecond }: TimelineRulerProps) {
  const totalSeconds = Math.ceil(totalDurationMs / 1000);
  const markers: number[] = [];
  const step = pixelsPerSecond >= 20 ? 5 : 10;
  for (let s = 0; s <= totalSeconds; s += step) {
    markers.push(s);
  }

  return (
    <div
      style={{
        position: 'relative',
        height: 24,
        borderBottom: '1px solid var(--border-color)',
        width: (totalDurationMs / 1000) * pixelsPerSecond + 100,
      }}
    >
      {markers.map((s) => (
        <div
          key={s}
          style={{
            position: 'absolute',
            left: s * pixelsPerSecond,
            top: 0,
            height: '100%',
            borderLeft: '1px solid var(--border-color)',
            paddingLeft: 4,
            fontSize: 10,
            color: 'var(--text-dim)',
            lineHeight: '24px',
          }}
        >
          {s}s
        </div>
      ))}
    </div>
  );
}
