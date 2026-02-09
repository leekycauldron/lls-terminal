import { useState, useCallback } from 'react';
import type { StageComponentProps, ScriptLine } from '../types';
import { useEpisodeStore } from '../../state/episodeStore';
import {
  checkSeed,
  generateIdea,
  generateScript,
  updateLines,
  addLine,
  deleteLine,
  approveScript,
  unapproveStage,
} from '../../api/stages';
import { registerStage } from '../stageRegistry';
import SeedInput from './SeedInput';
import ConflictWarning from './ConflictWarning';
import LineEditor from './LineEditor';
import ProgressBar from '../../components/ProgressBar';

type Phase = 'seed' | 'checking' | 'conflicts' | 'generating-idea' | 'idea-review' | 'generating-script' | 'editing' | 'approving' | 'done';

function ScriptStage({ episodeId }: StageComponentProps) {
  const { state, setScriptLines, setScriptIdea, setScriptSeed, setScriptApproved, setCurrentStage } =
    useEpisodeStore();

  // Resume from existing state
  const initialPhase: Phase = state?.script.approved
    ? 'done'
    : state?.script.lines.length
      ? 'editing'
      : state?.script.idea
        ? 'idea-review'
        : 'seed';

  const [phase, setPhase] = useState<Phase>(initialPhase);
  const [seed, setSeed] = useState(state?.script.seed || '');
  const [idea, setIdea] = useState(state?.script.idea || '');
  const [ideaDetails, setIdeaDetails] = useState<{ characters_used: string[]; settings_used: string[] } | null>(null);
  const [conflicts, setConflicts] = useState<{
    conflicts: { episode_id: string; episode_title: string; similarity: string }[];
    suggestion: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lines = state?.script.lines || [];

  const handleSeedSubmit = async (value: string) => {
    const seedValue = value || 'surprise me with a creative family story';
    setSeed(seedValue);
    setScriptSeed(seedValue);
    setError(null);
    setPhase('checking');

    try {
      const result = await checkSeed(episodeId, seedValue);
      if (result.has_conflicts && result.conflicts.length > 0) {
        setConflicts({ conflicts: result.conflicts, suggestion: result.suggestion });
        setPhase('conflicts');
      } else {
        await doGenerateIdea(seedValue);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Seed check failed');
      setPhase('seed');
    }
  };

  const doGenerateIdea = async (seedValue: string) => {
    setPhase('generating-idea');
    try {
      const result = await generateIdea(episodeId, seedValue);
      setIdea(result.idea);
      setScriptIdea(result.idea);
      setIdeaDetails({ characters_used: result.characters_used, settings_used: result.settings_used });
      setPhase('idea-review');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Idea generation failed');
      setPhase('seed');
    }
  };

  const handleGenerateScript = async () => {
    setPhase('generating-script');
    setError(null);
    try {
      const result = await generateScript(episodeId, idea);
      setScriptLines(result);
      setPhase('editing');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Script generation failed');
      setPhase('idea-review');
    }
  };

  const handleReorder = useCallback(
    async (fromIndex: number, toIndex: number) => {
      const newLines = [...lines];
      const [moved] = newLines.splice(fromIndex, 1);
      newLines.splice(toIndex, 0, moved);
      const reordered = newLines.map((l, i) => ({ ...l, order: i }));
      setScriptLines(reordered);
      try {
        await updateLines(episodeId, reordered);
      } catch {
        // Revert on error
        setScriptLines(lines);
      }
    },
    [episodeId, lines, setScriptLines]
  );

  const handleEdit = useCallback(
    async (lineId: string, updates: Partial<ScriptLine>) => {
      const newLines = lines.map((l) => (l.id === lineId ? { ...l, ...updates } : l));
      setScriptLines(newLines);
      try {
        await updateLines(episodeId, newLines);
      } catch {
        setScriptLines(lines);
      }
    },
    [episodeId, lines, setScriptLines]
  );

  const handleAdd = useCallback(
    async (position: number) => {
      const newLine: ScriptLine = {
        id: Math.random().toString(36).slice(2, 10),
        order: position,
        character_id: '思源',
        text_zh: '',
        text_en: '',
        text_pinyin: '',
        direction: null,
      };
      try {
        const result = await addLine(episodeId, position, newLine);
        setScriptLines(result);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to add line');
      }
    },
    [episodeId, setScriptLines]
  );

  const handleDelete = useCallback(
    async (lineId: string) => {
      try {
        const result = await deleteLine(episodeId, lineId);
        setScriptLines(result);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to delete line');
      }
    },
    [episodeId, setScriptLines]
  );

  const handleApprove = async () => {
    setPhase('approving');
    try {
      const result = await approveScript(episodeId);
      setScriptApproved(true);
      setCurrentStage(result.current_stage);
      setPhase('done');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Approval failed');
      setPhase('editing');
    }
  };

  return (
    <div>
      <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 12 }}>
        STAGE 1: SCRIPT GENERATION
      </div>

      {error && (
        <div style={{ color: 'var(--danger)', marginBottom: 12, fontSize: 13 }}>
          Error: {error}
        </div>
      )}

      {/* Seed input */}
      {phase === 'seed' && (
        <SeedInput onSubmit={handleSeedSubmit} />
      )}

      {/* Checking seed */}
      {phase === 'checking' && (
        <ProgressBar label={`Checking seed: "${seed}"`} />
      )}

      {/* Conflict warning */}
      {phase === 'conflicts' && conflicts && (
        <ConflictWarning
          conflicts={conflicts.conflicts}
          suggestion={conflicts.suggestion}
          onProceed={() => doGenerateIdea(seed)}
          onReseed={() => {
            setConflicts(null);
            setPhase('seed');
          }}
        />
      )}

      {/* Generating idea */}
      {phase === 'generating-idea' && (
        <ProgressBar label="Generating story idea..." />
      )}

      {/* Idea review */}
      {phase === 'idea-review' && (
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 8 }}>
            GENERATED IDEA:
          </div>
          <div
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              padding: 12,
              borderRadius: 2,
              marginBottom: 12,
              lineHeight: 1.8,
              fontSize: 13,
            }}
          >
            {idea}
          </div>
          {ideaDetails && (
            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 12 }}>
              Characters: {ideaDetails.characters_used.join(', ')} | Settings: {ideaDetails.settings_used.join(', ')}
            </div>
          )}
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={handleGenerateScript} style={btnStyle}>
              Generate Script
            </button>
            <button onClick={() => setPhase('seed')} style={btnSecondary}>
              Try Different Seed
            </button>
          </div>
        </div>
      )}

      {/* Generating script */}
      {phase === 'generating-script' && (
        <ProgressBar label="Generating script (this may take a moment)..." />
      )}

      {/* Editing */}
      {phase === 'editing' && (
        <div>
          <LineEditor
            lines={lines}
            onReorder={handleReorder}
            onEdit={handleEdit}
            onAdd={handleAdd}
            onDelete={handleDelete}
          />
          <div style={{ display: 'flex', gap: 12, marginTop: 16, justifyContent: 'space-between' }}>
            <button onClick={() => setPhase('seed')} style={btnSecondary}>
              Start Over
            </button>
            <button onClick={handleApprove} style={btnStyle}>
              Approve Script →
            </button>
          </div>
        </div>
      )}

      {/* Approving */}
      {phase === 'approving' && (
        <ProgressBar label="Approving script..." />
      )}

      {/* Done */}
      {phase === 'done' && (
        <div style={{ color: 'var(--text-secondary)' }}>
          ✓ Script approved and locked. {lines.length} lines finalized.
          <button
            onClick={async () => {
              await unapproveStage(episodeId, 'stage_1_script');
              setScriptApproved(false);
              setCurrentStage('stage_1_script');
              setPhase('editing');
            }}
            style={{ ...btnSecondary, marginLeft: 16 }}
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
  padding: '6px 16px',
  fontFamily: 'var(--font-mono)',
  fontSize: 13,
  cursor: 'pointer',
  borderRadius: 2,
};

const btnSecondary: React.CSSProperties = {
  ...btnStyle,
  borderColor: 'var(--text-dim)',
  color: 'var(--text-dim)',
};

registerStage({
  id: 'stage_1_script',
  order: 1,
  name: 'Script',
  component: ScriptStage,
});

export default ScriptStage;
