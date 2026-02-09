import TerminalInput from '../../terminal/TerminalInput';

interface SeedInputProps {
  onSubmit: (seed: string) => void;
  disabled?: boolean;
}

export default function SeedInput({ onSubmit, disabled }: SeedInputProps) {
  return (
    <div>
      <div style={{ color: 'var(--text-primary)', marginBottom: 8 }}>
        Enter a story seed idea (or press Enter for a random idea):
      </div>
      <TerminalInput
        prompt="seed>"
        placeholder="e.g. Siyuan loses his homework..."
        onSubmit={onSubmit}
        disabled={disabled}
        allowEmpty
      />
    </div>
  );
}
