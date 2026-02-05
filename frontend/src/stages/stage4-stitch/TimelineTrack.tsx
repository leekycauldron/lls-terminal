import type { TimelineClip as TimelineClipType } from '../types';
import TimelineClipComponent from './TimelineClip';

interface TimelineTrackProps {
  label: string;
  clips: TimelineClipType[];
  episodeId: string;
  pixelsPerSecond: number;
  totalDurationMs: number;
  getClipLabel: (clip: TimelineClipType) => string;
  onMove: (clipId: string, newStartMs: number) => void;
  onResize: (clipId: string, newDurationMs: number) => void;
}

export default function TimelineTrack({
  label,
  clips,
  episodeId,
  pixelsPerSecond,
  totalDurationMs,
  getClipLabel,
  onMove,
  onResize,
}: TimelineTrackProps) {
  const trackWidth = (totalDurationMs / 1000) * pixelsPerSecond + 100;

  return (
    <div style={{ marginBottom: 4 }}>
      <div style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 2, paddingLeft: 4 }}>
        {label}
      </div>
      <div
        style={{
          position: 'relative',
          height: 40,
          background: 'var(--bg-secondary)',
          borderRadius: 2,
          width: trackWidth,
          border: '1px solid var(--border-color)',
        }}
      >
        {clips.map((clip) => (
          <TimelineClipComponent
            key={clip.id}
            clip={clip}
            episodeId={episodeId}
            pixelsPerSecond={pixelsPerSecond}
            label={getClipLabel(clip)}
            onMove={onMove}
            onResize={onResize}
          />
        ))}
      </div>
    </div>
  );
}
