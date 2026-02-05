interface TTSControlsProps {
  mode: string;
  generated: number;
  total: number;
  allGenerated: boolean;
  onToggleMode: () => void;
  onApprove: () => void;
  generating: boolean;
}

export default function TTSControls({
  mode,
  generated,
  total,
  allGenerated,
  onToggleMode,
  onApprove,
  generating,
}: TTSControlsProps) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        gap: 12,
      }}
    >
      <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
        TTS Progress: {generated}/{total}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={onToggleMode}
          disabled={generating}
          style={{
            ...btnStyle,
            borderColor: 'var(--text-dim)',
            color: 'var(--text-dim)',
            opacity: generating ? 0.5 : 1,
          }}
        >
          Mode: {mode}
        </button>

        {allGenerated && (
          <button
            onClick={onApprove}
            disabled={generating}
            style={btnStyle}
          >
            Approve TTS →
          </button>
        )}
      </div>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  background: 'none',
  border: '1px solid var(--accent)',
  color: 'var(--accent)',
  padding: '4px 12px',
  fontFamily: 'var(--font-mono)',
  fontSize: 12,
  cursor: 'pointer',
  borderRadius: 2,
};
