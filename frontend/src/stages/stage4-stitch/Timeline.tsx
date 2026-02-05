import { useState } from 'react';
import type { TimelineClip, Scene, ScriptLine } from '../types';
import TimelineRuler from './TimelineRuler';
import TimelineTrack from './TimelineTrack';

interface TimelineProps {
  clips: TimelineClip[];
  totalDurationMs: number;
  episodeId: string;
  scenes: Scene[];
  lines: ScriptLine[];
  onMove: (clipId: string, newStartMs: number) => void;
  onResize: (clipId: string, newDurationMs: number) => void;
}

export default function Timeline({
  clips,
  totalDurationMs,
  episodeId,
  scenes,
  lines,
  onMove,
  onResize,
}: TimelineProps) {
  const [pixelsPerSecond, setPixelsPerSecond] = useState(30);

  const sceneClips = clips.filter((c) => c.track === 'scenes');
  const audioClips = clips.filter((c) => c.track === 'audio');

  const getSceneLabel = (clip: TimelineClip) => {
    const scene = scenes.find((s) => s.id === clip.source_id);
    return scene ? `Scene ${scene.order + 1}` : clip.source_id;
  };

  const getAudioLabel = (clip: TimelineClip) => {
    const line = lines.find((l) => l.id === clip.source_id);
    return line ? line.character_id : clip.source_id;
  };

  return (
    <div>
      {/* Zoom control */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>Zoom:</span>
        <input
          type="range"
          min={10}
          max={80}
          value={pixelsPerSecond}
          onChange={(e) => setPixelsPerSecond(Number(e.target.value))}
          style={{ width: 120 }}
        />
        <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
          {(totalDurationMs / 1000).toFixed(1)}s total
        </span>
      </div>

      {/* Scrollable timeline */}
      <div
        style={{
          overflowX: 'auto',
          border: '1px solid var(--border-color)',
          borderRadius: 2,
          padding: 8,
          background: 'var(--bg-primary)',
        }}
      >
        <TimelineRuler
          totalDurationMs={totalDurationMs}
          pixelsPerSecond={pixelsPerSecond}
        />
        <TimelineTrack
          label="Scenes"
          clips={sceneClips}
          episodeId={episodeId}
          pixelsPerSecond={pixelsPerSecond}
          totalDurationMs={totalDurationMs}
          getClipLabel={getSceneLabel}
          onMove={onMove}
          onResize={onResize}
        />
        <TimelineTrack
          label="Audio"
          clips={audioClips}
          episodeId={episodeId}
          pixelsPerSecond={pixelsPerSecond}
          totalDurationMs={totalDurationMs}
          getClipLabel={getAudioLabel}
          onMove={onMove}
          onResize={onResize}
        />
      </div>
    </div>
  );
}
