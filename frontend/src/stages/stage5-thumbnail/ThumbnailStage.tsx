import { useState, useEffect } from 'react';
import type { StageComponentProps } from '../types';
import { useEpisodeStore } from '../../state/episodeStore';
import {
  initializeThumbnail,
  updateThumbnailPrompt,
  generateThumbnail,
  revertThumbnail,
  approveThumbnail,
} from '../../api/stages';
import { registerStage } from '../stageRegistry';
import ProgressBar from '../../components/ProgressBar';

const STATIC_BASE = 'http://localhost:8000/static/episodes';

type Phase = 'initializing' | 'editing' | 'generating' | 'done';

function ThumbnailStage({ episodeId }: StageComponentProps) {
  const { state, setThumbnailData, setCurrentStage } = useEpisodeStore();
  const thumbnail = state?.thumbnail;
  const approved = thumbnail?.approved || false;

  const initialPhase: Phase = approved
    ? 'done'
    : thumbnail?.generated
      ? 'editing'
      : thumbnail?.prompt
        ? 'editing'
        : 'initializing';

  const [phase, setPhase] = useState<Phase>(initialPhase);
  const [prompt, setPrompt] = useState(thumbnail?.prompt || '');
  const [error, setError] = useState<string | null>(null);

  // Auto-initialize: generate prompt from story on mount
  useEffect(() => {
    if (phase === 'initializing') {
      doInitialize();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const doInitialize = async () => {
    try {
      const result = await initializeThumbnail(episodeId);
      setThumbnailData(result);
      setPrompt(result.prompt);
      setPhase('generating');
      // Auto-generate the image immediately
      try {
        const genResult = await generateThumbnail(episodeId);
        setThumbnailData(genResult);
        setPhase('editing');
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Thumbnail generation failed');
        setPhase('editing');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to initialize thumbnail');
      setPhase('editing');
    }
  };

  const handleGenerate = async () => {
    setPhase('generating');
    setError(null);
    try {
      await updateThumbnailPrompt(episodeId, prompt);
    } catch {
      // continue
    }
    try {
      const result = await generateThumbnail(episodeId);
      setThumbnailData(result);
      setPhase('editing');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Thumbnail generation failed');
      setPhase('editing');
    }
  };

  const handleRevert = async () => {
    setError(null);
    try {
      await revertThumbnail(episodeId);
      setThumbnailData({ ...thumbnail!, image_file: '', generated: false });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Revert failed');
    }
  };

  const handleApprove = async () => {
    setError(null);
    try {
      const result = await approveThumbnail(episodeId);
      setThumbnailData({ ...thumbnail!, approved: true });
      setCurrentStage(result.current_stage);
      setPhase('done');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Approval failed');
    }
  };

  if (phase === 'done') {
    return (
      <div>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 12 }}>
          STAGE 5: THUMBNAIL
        </div>
        <div style={{ color: 'var(--text-secondary)' }}>
          Episode complete! Thumbnail approved.
        </div>
        {thumbnail?.image_file && (
          <img
            src={`${STATIC_BASE}/${episodeId}/${thumbnail.image_file}?t=${Date.now()}`}
            alt="Thumbnail"
            style={{
              width: '100%',
              maxWidth: 480,
              marginTop: 12,
              borderRadius: 2,
              border: '1px solid var(--border-color)',
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div>
      <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 12 }}>
        STAGE 5: THUMBNAIL
      </div>

      {error && (
        <div style={{ color: 'var(--danger)', marginBottom: 12, fontSize: 13 }}>
          Error: {error}
        </div>
      )}

      {phase === 'initializing' && (
        <ProgressBar label="Generating thumbnail prompt from story..." />
      )}

      {phase === 'generating' && (
        <ProgressBar label="Generating thumbnail image..." />
      )}

      {phase === 'editing' && (
        <>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
            Thumbnail prompt (auto-generated from story — edit if needed):
          </div>

          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={thumbnail?.generated}
            style={{
              width: '100%',
              minHeight: 80,
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              padding: 8,
              borderRadius: 2,
              resize: 'vertical',
              opacity: thumbnail?.generated ? 0.7 : 1,
            }}
          />

          {/* Image preview */}
          {thumbnail?.generated && thumbnail.image_file && (
            <div style={{ marginTop: 12 }}>
              <img
                src={`${STATIC_BASE}/${episodeId}/${thumbnail.image_file}?t=${Date.now()}`}
                alt="Thumbnail"
                style={{
                  width: '100%',
                  maxWidth: 640,
                  borderRadius: 2,
                  border: '1px solid var(--border-color)',
                  background: '#000',
                }}
              />
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            {!thumbnail?.generated && (
              <button
                onClick={handleGenerate}
                disabled={!prompt.trim()}
                style={btnStyle}
              >
                Generate Thumbnail
              </button>
            )}
            {thumbnail?.generated && (
              <>
                <button
                  onClick={handleRevert}
                  style={{ ...btnStyle, borderColor: 'var(--danger)', color: 'var(--danger)' }}
                >
                  Revert
                </button>
                <button onClick={handleApprove} style={btnStyle}>
                  Approve & Finish →
                </button>
              </>
            )}
          </div>
        </>
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
  id: 'stage_5_thumbnail',
  order: 5,
  name: 'Thumbnail',
  component: ThumbnailStage,
});

export default ThumbnailStage;
