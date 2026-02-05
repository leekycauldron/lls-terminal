import type { Scene, ScriptLine } from '../types';
import SceneCard from './SceneCard';

interface SceneEditorProps {
  scenes: Scene[];
  episodeId: string;
  lines: ScriptLine[];
  onEditPrompt: (sceneId: string, prompt: string) => void;
  onGenerate: (sceneId: string) => void;
  onRevert: (sceneId: string) => void;
  onDelete: (sceneId: string) => void;
  generatingSceneId: string | null;
}

export default function SceneEditor({
  scenes,
  episodeId,
  lines,
  onEditPrompt,
  onGenerate,
  onRevert,
  onDelete,
  generatingSceneId,
}: SceneEditorProps) {
  if (scenes.length === 0) {
    return (
      <div style={{ color: 'var(--text-dim)', padding: 16, textAlign: 'center' }}>
        No scenes yet. Generate a breakdown first.
      </div>
    );
  }

  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 8 }}>
        {scenes.length} scenes | {scenes.filter((s) => s.generated).length} images generated
      </div>
      {scenes
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((scene) => (
          <SceneCard
            key={scene.id}
            scene={scene}
            episodeId={episodeId}
            lines={lines}
            onEditPrompt={onEditPrompt}
            onGenerate={onGenerate}
            onRevert={onRevert}
            onDelete={onDelete}
            generating={generatingSceneId === scene.id}
          />
        ))}
    </div>
  );
}
