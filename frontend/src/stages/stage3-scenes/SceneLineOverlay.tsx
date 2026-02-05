import type { Scene, ScriptLine } from '../types';

interface SceneLineOverlayProps {
  scenes: Scene[];
  lines: ScriptLine[];
}

const SCENE_COLORS = [
  'var(--accent)',
  'var(--char-siyuan)',
  'var(--char-siqi)',
  'var(--char-jiamin)',
  'var(--char-minghao)',
  'var(--char-nanzhen)',
];

export default function SceneLineOverlay({ scenes, lines }: SceneLineOverlayProps) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 4 }}>
        Scene → Line mapping
      </div>
      <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        {lines.map((line) => {
          const sceneIndex = scenes.findIndex((s) => s.line_ids.includes(line.id));
          const color = sceneIndex >= 0 ? SCENE_COLORS[sceneIndex % SCENE_COLORS.length] : 'var(--text-dim)';
          return (
            <div
              key={line.id}
              style={{
                width: 20,
                height: 20,
                background: color,
                opacity: 0.7,
                borderRadius: 2,
                fontSize: 9,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--bg-primary)',
                fontWeight: 700,
              }}
              title={`Line ${line.order + 1} → Scene ${sceneIndex + 1}`}
            >
              {sceneIndex >= 0 ? sceneIndex + 1 : '?'}
            </div>
          );
        })}
      </div>
    </div>
  );
}
