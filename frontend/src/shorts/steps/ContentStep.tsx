import { useState } from 'react';
import { useShortsStore } from '../shortsStore';
import { updateItems, approveContent, generateContent } from '../api';
import type { FlashcardItem } from '../types';

interface ContentStepProps {
  shortId: string;
}

export default function ContentStep({ shortId }: ContentStepProps) {
  const { state, setState, setItems, setCurrentStep } = useShortsStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<FlashcardItem>>({});
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const items = state?.items || [];

  const startEdit = (item: FlashcardItem) => {
    setEditingId(item.id);
    setEditForm({
      word_zh: item.word_zh,
      word_pinyin: item.word_pinyin,
      word_en: item.word_en,
      sentence_zh: item.sentence_zh,
      sentence_pinyin: item.sentence_pinyin,
      sentence_en: item.sentence_en,
      image_prompt: item.image_prompt,
    });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setSaving(true);
    try {
      const updatedItems = items.map((i) =>
        i.id === editingId ? { ...i, ...editForm } : i
      );
      const result = await updateItems(shortId, updatedItems);
      setItems(result.items);
      setEditingId(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = async (itemId: string) => {
    const updated = items.filter((i) => i.id !== itemId).map((i, idx) => ({ ...i, order: idx }));
    try {
      const result = await updateItems(shortId, updated);
      setItems(result.items);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete item');
    }
  };

  const moveItem = async (itemId: string, direction: -1 | 1) => {
    const idx = items.findIndex((i) => i.id === itemId);
    if (idx < 0) return;
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= items.length) return;
    const updated = [...items];
    [updated[idx], updated[newIdx]] = [updated[newIdx], updated[idx]];
    const reordered = updated.map((i, o) => ({ ...i, order: o }));
    try {
      const result = await updateItems(shortId, reordered);
      setItems(result.items);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to reorder');
    }
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    setError(null);
    try {
      const result = await generateContent(shortId, items.length || 6);
      setItems(result.items);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to regenerate');
    } finally {
      setRegenerating(false);
    }
  };

  const handleApprove = async () => {
    setApproving(true);
    setError(null);
    try {
      await approveContent(shortId);
      if (state) {
        setState({ ...state, content_approved: true, current_step: 'assets', items });
      }
      setCurrentStep('assets');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to approve');
    } finally {
      setApproving(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ color: 'var(--text-primary)', fontSize: 14 }}>
          Vocabulary Items ({items.length})
        </div>
        <button
          onClick={handleRegenerate}
          disabled={regenerating}
          style={linkBtnStyle}
        >
          {regenerating ? '[regenerating...]' : '[regenerate all]'}
        </button>
      </div>

      {items.map((item) => (
        <div
          key={item.id}
          style={{
            border: '1px solid var(--border-color)',
            borderRadius: 2,
            padding: 12,
            marginBottom: 8,
            background: editingId === item.id ? 'var(--bg-secondary)' : 'transparent',
          }}
        >
          {editingId === item.id ? (
            /* Edit mode */
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
                <div>
                  <label style={labelStyle}>Chinese</label>
                  <input
                    value={editForm.word_zh || ''}
                    onChange={(e) => setEditForm({ ...editForm, word_zh: e.target.value })}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Pinyin</label>
                  <input
                    value={editForm.word_pinyin || ''}
                    onChange={(e) => setEditForm({ ...editForm, word_pinyin: e.target.value })}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>English</label>
                  <input
                    value={editForm.word_en || ''}
                    onChange={(e) => setEditForm({ ...editForm, word_en: e.target.value })}
                    style={inputStyle}
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
                <div>
                  <label style={labelStyle}>Sentence (Chinese)</label>
                  <input
                    value={editForm.sentence_zh || ''}
                    onChange={(e) => setEditForm({ ...editForm, sentence_zh: e.target.value })}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Sentence (Pinyin)</label>
                  <input
                    value={editForm.sentence_pinyin || ''}
                    onChange={(e) => setEditForm({ ...editForm, sentence_pinyin: e.target.value })}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Sentence (English)</label>
                  <input
                    value={editForm.sentence_en || ''}
                    onChange={(e) => setEditForm({ ...editForm, sentence_en: e.target.value })}
                    style={inputStyle}
                  />
                </div>
              </div>
              <div style={{ marginBottom: 8 }}>
                <label style={labelStyle}>Image Prompt</label>
                <textarea
                  value={editForm.image_prompt || ''}
                  onChange={(e) => setEditForm({ ...editForm, image_prompt: e.target.value })}
                  style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }}
                />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={saveEdit} disabled={saving} style={linkBtnStyle}>
                  {saving ? '[saving...]' : '[save]'}
                </button>
                <button onClick={() => setEditingId(null)} style={linkBtnStyle}>[cancel]</button>
              </div>
            </div>
          ) : (
            /* View mode */
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ color: 'var(--text-dim)', fontSize: 11, width: 20 }}>{item.order + 1}.</span>
              <span style={{ color: 'var(--accent)', fontSize: 20, minWidth: 60 }}>{item.word_zh}</span>
              <span style={{ color: 'var(--text-secondary)', fontSize: 13, minWidth: 80 }}>{item.word_pinyin}</span>
              <span style={{ color: 'var(--text-dim)', fontSize: 13, flex: 1 }}>{item.word_en}</span>
              <span style={{ color: 'var(--text-dim)', fontSize: 11, flex: 2 }}>{item.sentence_zh}</span>
              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                <button onClick={() => moveItem(item.id, -1)} style={linkBtnStyle} disabled={item.order === 0}>[^]</button>
                <button onClick={() => moveItem(item.id, 1)} style={linkBtnStyle} disabled={item.order === items.length - 1}>[v]</button>
                <button onClick={() => startEdit(item)} style={linkBtnStyle}>[edit]</button>
                <button onClick={() => deleteItem(item.id)} style={{ ...linkBtnStyle, color: 'var(--danger)' }}>[x]</button>
              </div>
            </div>
          )}
        </div>
      ))}

      {error && (
        <div style={{ color: 'var(--danger)', fontSize: 12, marginTop: 8, marginBottom: 8 }}>
          {error}
        </div>
      )}

      <div style={{ marginTop: 16, display: 'flex', gap: 12 }}>
        <button
          onClick={handleApprove}
          disabled={approving || items.length === 0}
          style={{
            ...btnStyle,
            opacity: items.length === 0 ? 0.5 : 1,
          }}
        >
          {approving ? '> Approving...' : '> Approve Content'}
        </button>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  color: 'var(--text-dim)',
  fontSize: 10,
  fontFamily: 'var(--font-mono)',
  marginBottom: 2,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--bg-primary)',
  border: '1px solid var(--border-color)',
  color: 'var(--text-primary)',
  fontFamily: 'var(--font-mono)',
  fontSize: 12,
  padding: '4px 6px',
  borderRadius: 2,
  boxSizing: 'border-box',
};

const linkBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  fontFamily: 'var(--font-mono)',
  fontSize: 11,
  cursor: 'pointer',
  padding: 0,
  color: 'var(--text-secondary)',
};

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
