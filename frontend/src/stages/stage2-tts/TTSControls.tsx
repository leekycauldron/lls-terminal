interface TTSControlsProps {
  mode: string;
  generated: number;
  total: number;
  allGenerated: boolean;
  speed: number;
  onToggleMode: () => void;
  onApprove: () => void;
  onSpeedChange: (speed: number) => void;
  generating: boolean;
}

export default function TTSControls({
  mode,
  generated,
  total,
  allGenerated,
  speed,
  onToggleMode,
  onApprove,
  onSpeedChange,
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>
          TTS Progress: {generated}/{total}
        </span>
        <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>
          Speed: {speed.toFixed(2)}x
        </span>
        <input
          type="range"
          min={0.25}
          max={4.0}
          step={0.05}
          value={speed}
          onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
          style={{ width: 100 }}
        />
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
