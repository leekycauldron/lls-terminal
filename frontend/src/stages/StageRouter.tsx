import { getStageComponent } from './stageRegistry';

interface StageRouterProps {
  currentStage: string;
  episodeId: string;
  onAdvance: () => void;
}

export default function StageRouter({ currentStage, episodeId, onAdvance }: StageRouterProps) {
  const Component = getStageComponent(currentStage);

  if (!Component) {
    return (
      <div style={{ color: 'var(--text-dim)', padding: 16 }}>
        <p>Stage complete: {currentStage}</p>
      </div>
    );
  }

  return <Component episodeId={episodeId} onAdvance={onAdvance} />;
}
