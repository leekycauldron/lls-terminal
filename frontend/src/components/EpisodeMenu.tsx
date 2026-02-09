import { useEffect, useState } from 'react';
import type { EpisodeSummary } from '../stages/types';
import { listEpisodes, createEpisode, deleteEpisode, getEpisode } from '../api/stages';

interface EpisodeMenuProps {
  onSelect: (episodeId: string) => void;
}

export default function EpisodeMenu({ onSelect }: EpisodeMenuProps) {
  const [episodes, setEpisodes] = useState<EpisodeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [creating, setCreating] = useState(false);

  const fetchEpisodes = async () => {
    try {
      const eps = await listEpisodes();
      setEpisodes(eps);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load episodes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEpisodes();
  }, []);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const ep = await createEpisode(`Episode ${episodes.length + 1}`);
      onSelect(ep.id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create episode');
      setCreating(false);
    }
  };

  const handleDelete = async (epId: string) => {
    setDeleting(true);
    try {
      await deleteEpisode(epId);
      setConfirmDelete(null);
      await fetchEpisodes();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete episode');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return <div style={{ color: 'var(--text-dim)' }}>Loading episodes...</div>;
  }

  if (error) {
    return (
      <div>
        <div style={{ color: 'var(--danger)' }}>Error: {error}</div>
        <button onClick={() => { setError(null); setLoading(true); fetchEpisodes(); }} style={linkStyle}>
          [retry]
        </button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ color: 'var(--text-primary)', fontSize: 13, lineHeight: 1.8, marginBottom: 8 }}>
        Select an episode to edit, or create a new one.
      </div>

      {episodes.length === 0 ? (
        <div style={{ color: 'var(--text-dim)', fontSize: 13, marginBottom: 16 }}>
          No episodes found.
        </div>
      ) : (
        <div style={{ marginBottom: 16 }}>
          {episodes.map((ep) => (
            <div key={ep.id} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '6px 0',
              borderBottom: '1px solid var(--border-color)',
            }}>
              <button
                onClick={() => onSelect(ep.id)}
                style={{
                  ...linkStyle,
                  color: 'var(--accent)',
                  flex: 1,
                  textAlign: 'left',
                }}
              >
                {ep.id}: {ep.title}
              </button>
              <span style={{ color: 'var(--text-dim)', fontSize: 11, flexShrink: 0 }}>
                {new Date(ep.date).toLocaleDateString()}
              </span>
              {confirmDelete === ep.id ? (
                <span style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button
                    onClick={() => handleDelete(ep.id)}
                    disabled={deleting}
                    style={{ ...linkStyle, color: 'var(--danger)' }}
                  >
                    {deleting ? '[deleting...]' : '[confirm]'}
                  </button>
                  <button
                    onClick={() => setConfirmDelete(null)}
                    disabled={deleting}
                    style={linkStyle}
                  >
                    [cancel]
                  </button>
                </span>
              ) : (
                <button
                  onClick={() => setConfirmDelete(ep.id)}
                  style={{ ...linkStyle, color: 'var(--text-dim)' }}
                >
                  [delete]
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <button
        onClick={handleCreate}
        disabled={creating}
        style={{
          background: 'none',
          border: '1px solid var(--accent)',
          color: 'var(--accent)',
          padding: '6px 16px',
          fontFamily: 'var(--font-mono)',
          fontSize: 13,
          cursor: creating ? 'default' : 'pointer',
          borderRadius: 2,
          opacity: creating ? 0.5 : 1,
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => {
          if (!creating) e.currentTarget.style.boxShadow = '0 0 8px var(--border-glow)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        {creating ? '> Creating...' : '> New Episode'}
      </button>
    </div>
  );
}

const linkStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  fontFamily: 'var(--font-mono)',
  fontSize: 13,
  cursor: 'pointer',
  padding: 0,
  color: 'var(--text-secondary)',
};
