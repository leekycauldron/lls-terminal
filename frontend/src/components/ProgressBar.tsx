interface ProgressBarProps {
  label?: string;
  progress?: number; // 0-100, undefined = indeterminate
}

export default function ProgressBar({ label, progress }: ProgressBarProps) {
  const isIndeterminate = progress === undefined;
  const width = isIndeterminate ? 100 : progress;

  return (
    <div style={{ marginBottom: 8 }}>
      {label && (
        <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 4 }}>
          {label}
        </div>
      )}
      <div
        style={{
          height: 4,
          background: 'var(--bg-tertiary)',
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${width}%`,
            background: 'var(--accent)',
            borderRadius: 2,
            transition: isIndeterminate ? 'none' : 'width 0.3s ease',
            animation: isIndeterminate ? 'pulse-glow 1.5s ease-in-out infinite' : 'none',
            opacity: isIndeterminate ? 0.6 : 1,
          }}
        />
      </div>
    </div>
  );
}
