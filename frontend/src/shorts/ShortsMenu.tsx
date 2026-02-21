import { useEffect, useState } from 'react';
import type { ShortSummary } from './types';
import { listShorts, createShort, deleteShort } from './api';

interface ShortsMenuProps {
  onSelect: (shortId: string) => void;
}

export default function ShortsMenu({ onSelect }: ShortsMenuProps) {
  const [shorts, setShorts] = useState<ShortSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [creating, setCreating] = useState(false);

  const fetchShorts = async () => {
    try {
      const list = await listShorts();
      setShorts(list);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load shorts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShorts();
  }, []);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const s = await createShort();
      onSelect(s.id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create short');
      setCreating(false);
    }
  };

  const handleDelete = async (shortId: string) => {
    setDeleting(true);
    try {
      await deleteShort(shortId);
      setConfirmDelete(null);
      await fetchShorts();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete short');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return <div style={{ color: 'var(--text-dim)' }}>Loading shorts...</div>;
  }

  if (error) {
    return (
      <div>
        <div style={{ color: 'var(--danger)' }}>Error: {error}</div>
        <button onClick={() => { setError(null); setLoading(true); fetchShorts(); }} style={linkStyle}>
          [retry]
        </button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ color: 'var(--text-primary)', fontSize: 13, lineHeight: 1.8, marginBottom: 8 }}>
        Select a short to edit, or create a new one.
      </div>

      {shorts.length === 0 ? (
        <div style={{ color: 'var(--text-dim)', fontSize: 13, marginBottom: 16 }}>
          No shorts found.
        </div>
      ) : (
        <div style={{ marginBottom: 16 }}>
          {shorts.map((s) => (
            <div key={s.id} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '6px 0',
              borderBottom: '1px solid var(--border-color)',
            }}>
              <button
                onClick={() => onSelect(s.id)}
                style={{
                  ...linkStyle,
                  color: 'var(--accent)',
                  flex: 1,
                  textAlign: 'left',
                }}
              >
                {s.id}: {s.title || s.topic || 'Untitled'}
                {s.completed && <span style={{ color: 'var(--success)', marginLeft: 8 }}>[done]</span>}
              </button>
              <span style={{ color: 'var(--text-dim)', fontSize: 11, flexShrink: 0 }}>
                {s.theme}
              </span>
              <span style={{ color: 'var(--text-dim)', fontSize: 11, flexShrink: 0 }}>
                {new Date(s.date).toLocaleDateString()}
              </span>
              {confirmDelete === s.id ? (
                <span style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button
                    onClick={() => handleDelete(s.id)}
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
                  onClick={() => setConfirmDelete(s.id)}
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
        {creating ? '> Creating...' : '> New Short'}
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
