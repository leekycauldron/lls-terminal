import { useState } from 'react';
import { useShortsStore } from '../shortsStore';
import { exportVideo, approveShort } from '../api';

interface ExportStepProps {
  shortId: string;
}

const STATIC_BASE = 'http://localhost:8000/static/shorts';

export default function ExportStep({ shortId }: ExportStepProps) {
  const { state, setState } = useShortsStore();
  const [exporting, setExporting] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasVideo = !!state?.output_file;

  const handleExport = async () => {
    setExporting(true);
    setError(null);
    try {
      const result = await exportVideo(shortId);
      if (state) {
        setState({ ...state, output_file: result.output_file });
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to export video');
    } finally {
      setExporting(false);
    }
  };

  const handleApprove = async () => {
    setCompleting(true);
    setError(null);
    try {
      await approveShort(shortId);
      if (state) {
        setState({ ...state, completed: true });
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to complete');
    } finally {
      setCompleting(false);
    }
  };

  const handleDownload = () => {
    window.open(`http://localhost:8000/api/shorts/${shortId}/download`, '_blank');
  };

  return (
    <div>
      <div style={{ color: 'var(--text-primary)', fontSize: 14, marginBottom: 16 }}>
        Export Video
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        <button
          onClick={handleExport}
          disabled={exporting}
          style={btnStyle}
        >
          {exporting ? '> Exporting...' : hasVideo ? '> Re-export Video' : '> Export Video'}
        </button>

        {hasVideo && (
          <button onClick={handleDownload} style={linkBtnStyle}>
            [download MP4]
          </button>
        )}
      </div>

      {exporting && (
        <div style={{ color: 'var(--text-dim)', fontSize: 12, marginBottom: 16 }}>
          Building video with FFmpeg... this may take a minute.
        </div>
      )}

      {/* Video preview */}
      {hasVideo && state?.output_file && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: 24,
        }}>
          <div style={{
            width: 270,
            border: '2px solid var(--border-color)',
            borderRadius: 8,
            overflow: 'hidden',
            background: 'black',
          }}>
            <video
              key={state.output_file}
              controls
              style={{ width: '100%', display: 'block' }}
              src={`${STATIC_BASE}/${shortId}/${state.output_file}?t=${Date.now()}`}
            />
          </div>
        </div>
      )}

      {error && (
        <div style={{ color: 'var(--danger)', fontSize: 12, marginBottom: 12 }}>
          {error}
        </div>
      )}

      {state?.completed ? (
        <div style={{ color: 'var(--success)', fontSize: 13 }}>
          Short completed!
        </div>
      ) : hasVideo ? (
        <button
          onClick={handleApprove}
          disabled={completing}
          style={btnStyle}
        >
          {completing ? '> Completing...' : '> Mark Complete'}
        </button>
      ) : null}
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  background: 'none',
  border: '1px solid var(--accent)',
  color: 'var(--accent)',
  padding: '6px 16px',
  fontFamily: 'var(--font-mono)',
  fontSize: 13,
  cursor: 'pointer',
  borderRadius: 2,
  transition: 'all 0.2s',
};

const linkBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  fontFamily: 'var(--font-mono)',
  fontSize: 13,
  cursor: 'pointer',
  padding: '6px 0',
  color: 'var(--text-secondary)',
};
