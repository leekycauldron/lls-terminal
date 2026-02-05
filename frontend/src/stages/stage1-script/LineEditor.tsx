import type { ReactNode } from 'react';
import type { ScriptLine } from '../types';
import DragDropList from '../../components/DragDropList';
import ScriptLineComponent from './ScriptLine';

interface LineEditorProps {
  lines: ScriptLine[];
  onReorder: (fromIndex: number, toIndex: number) => void;
  onEdit: (lineId: string, updates: Partial<ScriptLine>) => void;
  onAdd: (position: number) => void;
  onDelete: (lineId: string) => void;
  lockedBefore?: number;
  renderLineExtra?: (line: ScriptLine) => ReactNode;
  readOnly?: boolean;
}

export default function LineEditor({
  lines,
  onReorder,
  onEdit,
  onAdd,
  onDelete,
  lockedBefore = -1,
  readOnly = false,
  renderLineExtra,
}: LineEditorProps) {
  if (lines.length === 0) {
    return (
      <div style={{ color: 'var(--text-dim)', padding: 16, textAlign: 'center' }}>
        No script lines yet.
      </div>
    );
  }

  return (
    <div>
      <div style={{
        fontSize: 11,
        color: 'var(--text-dim)',
        marginBottom: 8,
        display: 'flex',
        justifyContent: 'space-between',
      }}>
        <span>{lines.length} lines</span>
        {!readOnly && <span>drag to reorder</span>}
      </div>
      <DragDropList
        items={lines}
        onReorder={onReorder}
        disabled={readOnly}
        renderItem={(line, index) => (
          <ScriptLineComponent
            line={line}
            index={index}
            onEdit={onEdit}
            onDelete={onDelete}
            onAddAfter={onAdd}
            readOnly={readOnly || index < lockedBefore}
            renderExtra={renderLineExtra}
          />
        )}
      />
    </div>
  );
}
