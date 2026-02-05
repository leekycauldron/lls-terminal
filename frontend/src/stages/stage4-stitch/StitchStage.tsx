import { useState, useCallback, useEffect } from 'react';
import type { StageComponentProps } from '../types';
import { useEpisodeStore } from '../../state/episodeStore';
import {
  initializeTimeline,
  updateTimelineClips,
  exportTimeline,
  approveTimeline,
} from '../../api/stages';
import { registerStage } from '../stageRegistry';
import Timeline from './Timeline';
import ExportButton from './ExportButton';
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
          />

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
                onClick={handleSaveClips}
                style={{ ...btnStyle, borderColor: 'var(--text-dim)', color: 'var(--text-dim)' }}
              >
                Save Layout
              </button>
              {timeline?.output_file && (
                <button onClick={handleApprove} style={btnStyle}>
                  Approve & Finish →
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {phase === 'done' && (
        <div style={{ color: 'var(--text-secondary)' }}>
          Episode complete! Video exported and approved.
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
