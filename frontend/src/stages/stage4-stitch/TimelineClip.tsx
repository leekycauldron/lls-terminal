import { useRef, useCallback } from 'react';
import type { TimelineClip as TimelineClipType } from '../types';

const STATIC_BASE = 'http://localhost:8000/static/episodes';

interface TimelineClipProps {
  clip: TimelineClipType;
  episodeId: string;
  pixelsPerSecond: number;
  label: string;
  selected?: boolean;
  onMove: (clipId: string, newStartMs: number) => void;
  onResize: (clipId: string, newDurationMs: number) => void;
  onSelect?: (clipId: string) => void;
}

export default function TimelineClipComponent({
  clip,
  episodeId,
  pixelsPerSecond,
  label,
  selected = false,
  onMove,
  onResize,
  onSelect,
}: TimelineClipProps) {
  const dragRef = useRef<{ startX: number; startMs: number } | null>(null);
  const resizeRef = useRef<{ startX: number; startDuration: number } | null>(null);
  const didDrag = useRef(false);

  const left = (clip.start_ms / 1000) * pixelsPerSecond;
  const width = Math.max((clip.duration_ms / 1000) * pixelsPerSecond, 20);

  const isScene = clip.track === 'scenes';
  const bgColor = isScene ? 'var(--accent)' : 'var(--char-siyuan)';

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      didDrag.current = false;
      dragRef.current = { startX: e.clientX, startMs: clip.start_ms };

      const handleMouseMove = (ev: MouseEvent) => {
        if (!dragRef.current) return;
        const dx = ev.clientX - dragRef.current.startX;
        if (Math.abs(dx) > 3) didDrag.current = true;
        const dMs = (dx / pixelsPerSecond) * 1000;
        const newStart = Math.max(0, Math.round(dragRef.current.startMs + dMs));
        onMove(clip.id, newStart);
      };

      const handleMouseUp = () => {
        dragRef.current = null;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        if (!didDrag.current && onSelect && isScene) {
          onSelect(clip.id);
        }
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [clip.id, clip.start_ms, pixelsPerSecond, onMove, onSelect, isScene]
  );

  const handleResizeMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      resizeRef.current = { startX: e.clientX, startDuration: clip.duration_ms };

      const handleMouseMove = (ev: MouseEvent) => {
        if (!resizeRef.current) return;
        const dx = ev.clientX - resizeRef.current.startX;
        const dMs = (dx / pixelsPerSecond) * 1000;
        const newDuration = Math.max(500, Math.round(resizeRef.current.startDuration + dMs));
        onResize(clip.id, newDuration);
      };

      const handleMouseUp = () => {
        resizeRef.current = null;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [clip.id, clip.duration_ms, pixelsPerSecond, onResize]
  );

  const hasZoom = isScene && (clip.zoom_start !== 1.0 || clip.zoom_end !== 1.0);

  return (
    <div
      onMouseDown={handleMouseDown}
      style={{
        position: 'absolute',
        left,
        width,
        height: 36,
        top: 2,
        background: bgColor,
        opacity: 0.85,
        borderRadius: 3,
        cursor: 'grab',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        padding: '0 4px',
        userSelect: 'none',
        outline: selected ? '2px solid #fff' : 'none',
        outlineOffset: -1,
      }}
      title={`${label} | ${(clip.start_ms / 1000).toFixed(1)}s - ${((clip.start_ms + clip.duration_ms) / 1000).toFixed(1)}s`}
    >
      {/* Thumbnail for scene clips */}
      {isScene && clip.source_file && (
        <img
          src={`${STATIC_BASE}/${episodeId}/${clip.source_file}`}
          alt=""
          style={{ height: 30, width: 40, objectFit: 'cover', borderRadius: 2, flexShrink: 0 }}
        />
      )}

      <span
        style={{
          fontSize: 10,
          color: '#000',
          fontWeight: 700,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>

      {/* Zoom badge for scene clips */}
      {hasZoom && (
        <span
          style={{
            fontSize: 8,
            color: '#000',
            background: 'rgba(255,255,255,0.5)',
            borderRadius: 2,
            padding: '1px 3px',
            flexShrink: 0,
            marginLeft: 'auto',
          }}
        >
          Z
        </span>
      )}

      {/* Resize handle (only for scene clips) */}
      {isScene && (
        <div
          onMouseDown={handleResizeMouseDown}
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            width: 6,
            height: '100%',
            cursor: 'ew-resize',
            background: 'rgba(0,0,0,0.3)',
          }}
        />
      )}
    </div>
  );
}
