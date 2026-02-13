import { useState, useCallback, useEffect } from 'react';
import type { StageComponentProps } from '../types';
import { useEpisodeStore } from '../../state/episodeStore';
import {
  initializeTimeline,
  updateTimelineClips,
  exportTimeline,
  approveTimeline,
  unapproveStage,
  downloadCaptions,
} from '../../api/stages';
import { registerStage } from '../stageRegistry';
import Timeline from './Timeline';
import ExportButton from './ExportButton';
import VideoPreview from './VideoPreview';
import IntroPanel from './IntroPanel';
import ProgressBar from '../../components/ProgressBar';

type Phase = 'initializing' | 'editing' | 'exporting' | 'done';

function StitchStage({ episodeId }: StageComponentProps) {
  const {
    state,
    setTimelineData,
    setTimelineClips,
    updateClip,
    setCurrentStage,
  } = useEpisodeStore();

  const timeline = state?.timeline;
  const clips = timeline?.clips || [];
  const scenes = state?.scenes.scenes || [];
  const lines = state?.script.lines || [];
  const approved = timeline?.approved || false;

  const initialPhase: Phase = approved
    ? 'done'
    : clips.length > 0
      ? 'editing'
      : 'initializing';

  const [phase, setPhase] = useState<Phase>(initialPhase);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);

  useEffect(() => {
    if (phase === 'initializing') {
      doInitialize();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const doInitialize = async () => {
    try {
      const result = await initializeTimeline(episodeId);
      setTimelineData(result);
      setPhase('editing');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to initialize timeline');
    }
  };

  const handleMove = useCallback(
    (clipId: string, newStartMs: number) => {
      updateClip(clipId, { start_ms: newStartMs });
    },
    [updateClip]
  );

  const handleResize = useCallback(
    (clipId: string, newDurationMs: number) => {
      updateClip(clipId, { duration_ms: newDurationMs });
    },
    [updateClip]
  );

  const handleClipSelect = useCallback(
    (clipId: string) => {
      setSelectedClipId((prev) => (prev === clipId ? null : clipId));
    },
    []
  );

  const selectedClip = clips.find((c) => c.id === selectedClipId && c.track === 'scenes');

  // Save clips to backend on blur / periodic
  const handleSaveClips = async () => {
    try {
      await updateTimelineClips(episodeId, clips);
    } catch {
      // silent fail for drag updates
    }
  };

  const handleExport = async () => {
    setExporting(true);
    setError(null);
    // Save first
    try {
      await updateTimelineClips(episodeId, clips);
    } catch {
      // continue
    }
    try {
      const result = await exportTimeline(episodeId);
      setTimelineData({
        ...timeline!,
        output_file: result.output_file,
        total_duration_ms: result.total_duration_ms,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const handleApprove = async () => {
    setError(null);
    try {
      const result = await approveTimeline(episodeId);
      setCurrentStage(result.current_stage);
      setPhase('done');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Approval failed');
    }
  };

  return (
    <div>
      <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 12 }}>
        STAGE 4: STITCH & EXPORT
      </div>

      {error && (
        <div style={{ color: 'var(--danger)', marginBottom: 12, fontSize: 13 }}>
          Error: {error}
        </div>
      )}

      {phase === 'initializing' && (
        <ProgressBar label="Initializing timeline..." />
      )}

      {phase === 'editing' && (
        <>
          <IntroPanel
            episodeId={episodeId}
            episodeNumber={parseInt(episodeId.replace('ep_', ''), 10)}
            seed={state?.script.seed || ''}
            intro={timeline?.intro || {
              character_id: '',
              tts_text: '',
              image_file: '',
              audio_file: '',
              audio_duration_ms: 0,
              tts_generated: false,
              image_uploaded: false,
            }}
            characters={state?.context.characters || {}}
            onIntroUpdate={(intro) => setTimelineData({ ...timeline!, intro })}
          />

          <Timeline
            clips={clips}
            totalDurationMs={timeline?.total_duration_ms || 0}
            episodeId={episodeId}
            scenes={scenes}
            lines={lines}
            onMove={(clipId, startMs) => {
              handleMove(clipId, startMs);
            }}
            onResize={(clipId, durationMs) => {
              handleResize(clipId, durationMs);
            }}
            onClipSelect={handleClipSelect}
            selectedClipId={selectedClipId}
          />

          {/* Zoom editor for selected scene clip */}
          {selectedClip && (
            <div
              style={{
                marginTop: 12,
                padding: 12,
                border: '1px solid var(--border-color)',
                borderRadius: 2,
                background: 'var(--bg-secondary)',
              }}
            >
              <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 8 }}>
                Zoom Settings — {scenes.find((s) => s.id === selectedClip.source_id)
                  ? `Scene ${scenes.find((s) => s.id === selectedClip.source_id)!.order + 1}`
                  : selectedClip.source_id}
              </div>
              <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
                <label style={{ fontSize: 12, color: 'var(--text-primary)' }}>
                  Start: {selectedClip.zoom_start.toFixed(2)}x
                  <input
                    type="range"
                    min={1.0}
                    max={2.0}
                    step={0.05}
                    value={selectedClip.zoom_start}
                    onChange={(e) =>
                      updateClip(selectedClip.id, { zoom_start: parseFloat(e.target.value) })
                    }
                    style={{ display: 'block', width: 160, marginTop: 4 }}
                  />
                </label>
                <label style={{ fontSize: 12, color: 'var(--text-primary)' }}>
                  End: {selectedClip.zoom_end.toFixed(2)}x
                  <input
                    type="range"
                    min={1.0}
                    max={2.0}
                    step={0.05}
                    value={selectedClip.zoom_end}
                    onChange={(e) =>
                      updateClip(selectedClip.id, { zoom_end: parseFloat(e.target.value) })
                    }
                    style={{ display: 'block', width: 160, marginTop: 4 }}
                  />
                </label>
              </div>
            </div>
          )}

          {/* Video preview */}
          {timeline?.output_file && (
            <VideoPreview episodeId={episodeId} outputFile={timeline.output_file} />
          )}

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 16,
            }}
          >
            <ExportButton
              onExport={handleExport}
              exporting={exporting}
              outputFile={timeline?.output_file || ''}
              episodeId={episodeId}
            />

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => downloadCaptions(episodeId)}
                style={{ ...btnStyle, borderColor: 'var(--text-dim)', color: 'var(--text-dim)' }}
              >
                Download SRT
              </button>
              <button
                onClick={handleSaveClips}
                style={{ ...btnStyle, borderColor: 'var(--text-dim)', color: 'var(--text-dim)' }}
              >
                Save Layout
              </button>
              {timeline?.output_file && (
                <button onClick={handleApprove} style={btnStyle}>
                  Approve & Continue →
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {phase === 'done' && (
        <div style={{ color: 'var(--text-secondary)' }}>
          Timeline approved. Proceeding to thumbnail generation.
          <button
            onClick={async () => {
              await unapproveStage(episodeId, 'stage_4_stitch');
              setTimelineData({ ...timeline!, approved: false });
              setCurrentStage('stage_4_stitch');
              setPhase('editing');
            }}
            style={{ ...btnStyle, marginLeft: 16, borderColor: 'var(--text-dim)', color: 'var(--text-dim)' }}
          >
            [unlock]
          </button>
        </div>
      )}
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  background: 'none',
  border: '1px solid var(--accent)',
  color: 'var(--accent)',
  padding: '4px 12px',
  fontFamily: 'var(--font-mono)',
  fontSize: 12,
  cursor: 'pointer',
  borderRadius: 2,
};

registerStage({
  id: 'stage_4_stitch',
  order: 4,
  name: 'Stitch',
  component: StitchStage,
});

export default StitchStage;
