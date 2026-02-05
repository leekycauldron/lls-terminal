import { useState } from 'react';
import type { ScriptLine as ScriptLineType } from '../types';

const CHARACTER_COLORS: Record<string, string> = {
  '思源': 'var(--char-siyuan)',
  '思琪': 'var(--char-siqi)',
  '佳敏': 'var(--char-jiamin)',
  '明浩': 'var(--char-minghao)',
  '南珍': 'var(--char-nanzhen)',
  'Side Character (Woman)': 'var(--char-side-woman)',
  'Side Character (Man)': 'var(--char-side-man)',
  'Side Character (Boy)': 'var(--char-side-boy)',
  'Side Character (Girl)': 'var(--char-side-girl)',
};

interface ScriptLineProps {
  line: ScriptLineType;
  index: number;
  onEdit?: (lineId: string, updates: Partial<ScriptLineType>) => void;
  onDelete?: (lineId: string) => void;
  onAddAfter?: (position: number) => void;
  readOnly?: boolean;
  renderExtra?: (line: ScriptLineType) => React.ReactNode;
}

export default function ScriptLineComponent({
  line,
  index,
  onEdit,
  onDelete,
  onAddAfter,
  readOnly = false,
  renderExtra,
}: ScriptLineProps) {
  const [editing, setEditing] = useState(false);
  const [editZh, setEditZh] = useState(line.text_zh);
  const [editEn, setEditEn] = useState(line.text_en);
  const [editPinyin, setEditPinyin] = useState(line.text_pinyin);

  const color = CHARACTER_COLORS[line.character_id] || 'var(--text-primary)';

  const handleSave = () => {
    onEdit?.(line.id, { text_zh: editZh, text_en: editEn, text_pinyin: editPinyin });
    setEditing(false);
  };

  const handleCancel = () => {
    setEditZh(line.text_zh);
    setEditEn(line.text_en);
    setEditPinyin(line.text_pinyin);
    setEditing(false);
  };

  return (
    <div
      style={{
        padding: '8px 12px',
        marginBottom: 4,
        background: 'var(--bg-secondary)',
        borderLeft: `3px solid ${color}`,
        borderRadius: 2,
        position: 'relative',
      }}
    >
      {line.direction && (
        <div style={{ fontSize: 11, color: 'var(--char-direction)', fontStyle: 'italic', marginBottom: 4 }}>
          [{line.direction}]
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flexShrink: 0, width: 24, color: 'var(--text-dim)', fontSize: 11 }}>
          {String(index + 1).padStart(2, '0')}
        </div>

        <div
          style={{
            flexShrink: 0,
            minWidth: 50,
            color,
            fontWeight: 700,
            fontSize: 13,
          }}
        >
          {line.character_id}
        </div>

        <div style={{ flex: 1 }}>
          {editing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <input
                value={editZh}
                onChange={(e) => setEditZh(e.target.value)}
                style={inputStyle}
                placeholder="Chinese text"
              />
              <input
                value={editPinyin}
                onChange={(e) => setEditPinyin(e.target.value)}
                style={inputStyle}
                placeholder="Pinyin"
              />
              <input
                value={editEn}
                onChange={(e) => setEditEn(e.target.value)}
                style={inputStyle}
                placeholder="English"
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button onClick={handleSave} style={btnStyle}>Save</button>
                <button onClick={handleCancel} style={{ ...btnStyle, borderColor: 'var(--text-dim)', color: 'var(--text-dim)' }}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <div style={{ fontSize: 15 }}>{line.text_zh}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                {line.text_pinyin}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>
                {line.text_en}
              </div>
            </>
          )}
        </div>

        {!readOnly && !editing && (
          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
            <button onClick={() => setEditing(true)} style={iconBtnStyle} title="Edit">
              ✎
            </button>
            <button onClick={() => onAddAfter?.(index + 1)} style={iconBtnStyle} title="Add line after">
              +
            </button>
            <button
              onClick={() => onDelete?.(line.id)}
              style={{ ...iconBtnStyle, color: 'var(--danger)' }}
              title="Delete"
            >
              ×
            </button>
          </div>
        )}

        {renderExtra?.(line)}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: 'var(--bg-primary)',
  border: '1px solid var(--border-color)',
  color: 'var(--text-primary)',
  fontFamily: 'var(--font-mono)',
  fontSize: 13,
  padding: '4px 8px',
  borderRadius: 2,
  outline: 'none',
};

const btnStyle: React.CSSProperties = {
  background: 'none',
  border: '1px solid var(--accent)',
  color: 'var(--accent)',
  fontFamily: 'var(--font-mono)',
  fontSize: 11,
  padding: '2px 12px',
  cursor: 'pointer',
  borderRadius: 2,
};

const iconBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: 'var(--text-dim)',
  fontFamily: 'var(--font-mono)',
  fontSize: 16,
  cursor: 'pointer',
  padding: '0 4px',
  lineHeight: 1,
};
