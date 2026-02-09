import type { Scene, ScriptLine } from '../types';

const STATIC_BASE = 'http://localhost:8000/static/episodes';

interface SceneCardProps {
  scene: Scene;
  episodeId: string;
  lines: ScriptLine[];
  onEditPrompt: (sceneId: string, prompt: string) => void;
  onGenerate: (sceneId: string) => void;
  onRevert: (sceneId: string) => void;
  onDelete: (sceneId: string) => void;
  generating: boolean;
}

export default function SceneCard({
  scene,
  episodeId,
  lines,
  onEditPrompt,
  onGenerate,
  onRevert,
  onDelete,
  generating,
}: SceneCardProps) {
  const sceneLines = lines.filter((l) => scene.line_ids.includes(l.id));

  return (
    <div
      style={{
        border: '1px solid var(--border-color)',
        borderRadius: 2,
        padding: 12,
        marginBottom: 8,
        background: 'var(--bg-secondary)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 700 }}>
          Scene {scene.order + 1}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
          {scene.setting_id} | {scene.character_ids.join(', ')}
        </div>
      </div>

      {/* Image preview */}
      {scene.generated && scene.image_file && (
        <div style={{ marginBottom: 8 }}>
          <img
            src={`${STATIC_BASE}/${episodeId}/${scene.image_file}?t=${Date.now()}`}
            alt={`Scene ${scene.order + 1}`}
            style={{
              width: '100%',
              objectFit: 'contain',
              borderRadius: 2,
              border: '1px solid var(--border-color)',
              background: '#000',
            }}
          />
        </div>
      )}

      {/* Prompt */}
      <textarea
        value={scene.prompt}
        onChange={(e) => onEditPrompt(scene.id, e.target.value)}
        disabled={scene.generated}
        style={{
          width: '100%',
          minHeight: 60,
          background: 'var(--bg-primary)',
          border: '1px solid var(--border-color)',
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
          padding: 8,
          borderRadius: 2,
          resize: 'vertical',
          opacity: scene.generated ? 0.7 : 1,
        }}
      />

      {/* Lines covered */}
      <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4, marginBottom: 8 }}>
        Lines: {sceneLines.map((l) => l.character_id + ': ' + l.text_zh.slice(0, 15) + '...').join(' | ')}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8 }}>
        {!scene.generated && (
          <button
            onClick={() => onGenerate(scene.id)}
            disabled={generating}
            style={btnStyle}
          >
            {generating ? '...' : 'Generate Image'}
          </button>
        )}
        {scene.generated && (
          <button
            onClick={() => onRevert(scene.id)}
            style={{ ...btnStyle, borderColor: 'var(--danger)', color: 'var(--danger)' }}
          >
            Revert
          </button>
        )}
        {!scene.generated && (
          <button
            onClick={() => onDelete(scene.id)}
            style={{ ...btnStyle, borderColor: 'var(--text-dim)', color: 'var(--text-dim)' }}
          >
            Delete
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
  fontFamily: 'var(--font-mono)',
  fontSize: 11,
  padding: '3px 10px',
  cursor: 'pointer',
  borderRadius: 2,
};
