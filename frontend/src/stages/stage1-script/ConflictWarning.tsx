interface Conflict {
  episode_id: string;
  episode_title: string;
  similarity: string;
}

interface ConflictWarningProps {
  conflicts: Conflict[];
  suggestion: string;
  onProceed: () => void;
  onReseed: () => void;
}

export default function ConflictWarning({
  conflicts,
  suggestion,
  onProceed,
  onReseed,
}: ConflictWarningProps) {
  return (
    <div
      style={{
        border: '1px solid var(--warning)',
        padding: 12,
        borderRadius: 2,
        marginBottom: 16,
      }}
    >
      <div style={{ color: 'var(--warning)', fontWeight: 700, marginBottom: 8 }}>
        ⚠ Similar episodes detected
      </div>

      {conflicts.map((c, i) => (
        <div key={i} style={{ marginBottom: 8, fontSize: 13 }}>
          <span style={{ color: 'var(--text-dim)' }}>[{c.episode_id}]</span>{' '}
          <span style={{ color: 'var(--text-secondary)' }}>{c.episode_title}</span>
          <div style={{ color: 'var(--text-dim)', fontSize: 12, marginLeft: 16 }}>
            {c.similarity}
          </div>
        </div>
      ))}

      {suggestion && (
        <div style={{ color: 'var(--info)', fontSize: 12, marginBottom: 12 }}>
          Suggestion: {suggestion}
        </div>
      )}

      <div style={{ display: 'flex', gap: 12 }}>
        <button onClick={onProceed} style={btnStyle}>
          Proceed Anyway
        </button>
        <button
          onClick={onReseed}
          style={{
            ...btnStyle,
            borderColor: 'var(--warning)',
            color: 'var(--warning)',
          }}
        >
          Try Different Idea
        </button>
      </div>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  background: 'none',
  border: '1px solid var(--accent)',
  color: 'var(--accent)',
  padding: '4px 16px',
  fontFamily: 'var(--font-mono)',
  fontSize: 12,
  cursor: 'pointer',
  borderRadius: 2,
};
