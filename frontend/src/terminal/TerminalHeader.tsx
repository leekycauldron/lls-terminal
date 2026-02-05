interface Stage {
  id: string;
  name: string;
  order: number;
}

interface TerminalHeaderProps {
  stages: Stage[];
  currentStage: string;
  episodeId?: string | null;
}

export default function TerminalHeader({ stages, currentStage, episodeId }: TerminalHeaderProps) {
  const currentOrder = stages.find((s) => s.id === currentStage)?.order ?? -1;

  return (
    <div className="terminal-header">
      <div className="terminal-header__title glow-text">LLS Terminal</div>
      <div className="terminal-header__stages">
        {stages.map((s) => {
          let cls = 'terminal-header__stage';
          if (s.id === currentStage) cls += ' terminal-header__stage--active';
          else if (s.order < currentOrder) cls += ' terminal-header__stage--complete';
          return (
            <span key={s.id} className={cls}>
              {s.order}:{s.name}
            </span>
          );
        })}
      </div>
      {episodeId && (
        <span className="terminal-header__episode">[{episodeId}]</span>
      )}
    </div>
  );
}
