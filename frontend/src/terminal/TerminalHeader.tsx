interface Stage {
  id: string;
  name: string;
  order: number;
}

interface TerminalHeaderProps {
  stages: Stage[];
  currentStage: string;
  episodeId?: string | null;
  onStageClick?: (stageId: string) => void;
}

export default function TerminalHeader({ stages, currentStage, episodeId, onStageClick }: TerminalHeaderProps) {
  // If currentStage matches a known stage, use its order.
  // Otherwise (e.g. "stage_4_stitch_complete"), all known stages are complete.
  const exactMatch = stages.find((s) => s.id === currentStage);
  const maxOrder = stages.length > 0 ? Math.max(...stages.map((s) => s.order)) : -1;
  const currentOrder = exactMatch ? exactMatch.order : maxOrder + 1;

  return (
    <div className="terminal-header">
      <div className="terminal-header__title glow-text">LLS Terminal</div>
      <div className="terminal-header__stages">
        {stages.map((s) => {
          let cls = 'terminal-header__stage';
          const isActive = s.id === currentStage;
          const isComplete = s.order < currentOrder;
          if (isActive) cls += ' terminal-header__stage--active';
          else if (isComplete) cls += ' terminal-header__stage--complete';

          const clickable = onStageClick && !!episodeId;
          return (
            <span
              key={s.id}
              className={cls}
              onClick={clickable ? () => onStageClick(s.id) : undefined}
              style={clickable ? { cursor: 'pointer' } : undefined}
            >
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
