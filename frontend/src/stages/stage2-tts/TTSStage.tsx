import { useState, useCallback, useEffect } from 'react';
import type { StageComponentProps, ScriptLine, TTSLineStatus } from '../types';
import { useEpisodeStore } from '../../state/episodeStore';
import {
  initializeTTS,
  generateTTSLine,
  generateAllTTS,
  revertTTSLine,
  setTTSMode,
  updateTTSLines,
  addTTSLine,
  deleteTTSLine,
  approveTTS,
} from '../../api/stages';
import { registerStage } from '../stageRegistry';
import LineEditor from '../stage1-script/LineEditor';
import AudioPlayer from './AudioPlayer';
import TTSControls from './TTSControls';
import ProgressBar from '../../components/ProgressBar';

const STATIC_BASE = 'http://localhost:8000/static/episodes';

type Phase = 'initializing' | 'editing' | 'generating' | 'done';

function TTSStage({ episodeId }: StageComponentProps) {
  const {
    state,
    setTTSData,
    setTTSLineStatus,
    setTTSMode: setStoreMode,
    setTTSApproved,
    setScriptLines,
    setCurrentStage,
  } = useEpisodeStore();

  const tts = state?.tts;
  const lines = state?.script.lines || [];
  const approved = tts?.approved || false;

  const initialPhase: Phase = approved
    ? 'done'
    : tts?.line_statuses?.length
      ? 'editing'
      : 'initializing';

  const [phase, setPhase] = useState<Phase>(initialPhase);
  const [error, setError] = useState<string | null>(null);
  const [generatingLineId, setGeneratingLineId] = useState<string | null>(null);

  // Initialize on mount if needed
  useEffect(() => {
    if (phase === 'initializing') {
      doInitialize();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const doInitialize = async () => {
    try {
      const result = await initializeTTS(episodeId);
      setTTSData(result);
      setPhase('editing');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to initialize TTS');
    }
  };

  const getStatus = (lineId: string): TTSLineStatus | undefined =>
    tts?.line_statuses.find((ls) => ls.line_id === lineId);

  const generatedCount = tts?.line_statuses.filter((ls) => ls.generated).length || 0;
  const totalCount = lines.length;
  const allGenerated = generatedCount === totalCount && totalCount > 0;

  // Find the index of the last generated line
  const lastGeneratedIndex = (() => {
    let last = -1;
    for (let i = 0; i < lines.length; i++) {
      const s = getStatus(lines[i].id);
      if (s?.generated) last = i;
    }
    return last;
  })();

  const handleGenerateLine = useCallback(
    async (lineId: string) => {
      setGeneratingLineId(lineId);
      setError(null);
      try {
        const result = await generateTTSLine(episodeId, lineId);
        setTTSLineStatus(lineId, result);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'TTS generation failed');
      } finally {
        setGeneratingLineId(null);
      }
    },
    [episodeId, setTTSLineStatus]
  );

  const handleGenerateAll = useCallback(async () => {
    setPhase('generating');
    setError(null);
    try {
      const results = await generateAllTTS(episodeId);
      for (const r of results) {
        setTTSLineStatus(r.line_id, r);
      }
      setPhase('editing');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Auto TTS generation failed');
      setPhase('editing');
    }
  }, [episodeId, setTTSLineStatus]);

  const handleRevert = useCallback(
    async (lineId: string) => {
      setError(null);
      try {
        await revertTTSLine(episodeId, lineId);
        setTTSLineStatus(lineId, { audio_file: '', duration_ms: 0, generated: false });
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Revert failed');
      }
    },
    [episodeId, setTTSLineStatus]
  );

  const handleToggleMode = useCallback(async () => {
    const newMode = tts?.mode === 'manual' ? 'auto' : 'manual';
    setStoreMode(newMode);
    try {
      await setTTSMode(episodeId, newMode);
      if (newMode === 'auto') {
        await handleGenerateAll();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Mode change failed');
    }
  }, [episodeId, tts?.mode, setStoreMode, handleGenerateAll]);

  const handleApprove = async () => {
    setError(null);
    try {
      const result = await approveTTS(episodeId);
      setTTSApproved(true);
      setCurrentStage(result.current_stage);
      setPhase('done');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Approval failed');
    }
  };

  // Line editing callbacks
  const handleReorder = useCallback(
    async (fromIndex: number, toIndex: number) => {
      const newLines = [...lines];
      const [moved] = newLines.splice(fromIndex, 1);
      newLines.splice(toIndex, 0, moved);
      const reordered = newLines.map((l, i) => ({ ...l, order: i }));
      setScriptLines(reordered);
      try {
        await updateTTSLines(episodeId, reordered);
      } catch {
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
        await updateTTSLines(episodeId, newLines);
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
        const result = await addTTSLine(episodeId, position, newLine);
        setScriptLines(result);
        // Re-initialize to get updated line statuses
        const ttsResult = await initializeTTS(episodeId);
        setTTSData(ttsResult);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to add line');
      }
    },
    [episodeId, setScriptLines, setTTSData]
  );

  const handleDelete = useCallback(
    async (lineId: string) => {
      try {
        const result = await deleteTTSLine(episodeId, lineId);
        setScriptLines(result);
        // Re-initialize to sync line statuses
        const ttsResult = await initializeTTS(episodeId);
        setTTSData(ttsResult);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to delete line');
      }
    },
    [episodeId, setScriptLines, setTTSData]
  );

  const renderLineExtra = useCallback(
    (line: ScriptLine) => {
      const status = getStatus(line.id);
      const isGenerating = generatingLineId === line.id;
      const lineIndex = lines.findIndex((l) => l.id === line.id);
      const canGenerate = !status?.generated && lineIndex === lastGeneratedIndex + 1;
      const canRevert = status?.generated && lineIndex === lastGeneratedIndex;

      return (
        <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexShrink: 0 }}>
          {status?.generated && status.audio_file && (
            <AudioPlayer
              src={`${STATIC_BASE}/${episodeId}/${status.audio_file}`}
              durationMs={status.duration_ms}
            />
          )}
          {canGenerate && !isGenerating && (
            <button
              onClick={() => handleGenerateLine(line.id)}
              style={genBtnStyle}
              title="Generate TTS"
            >
              gen
            </button>
          )}
          {isGenerating && (
            <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>...</span>
          )}
          {canRevert && (
            <button
              onClick={() => handleRevert(line.id)}
              style={{ ...genBtnStyle, borderColor: 'var(--danger)', color: 'var(--danger)' }}
              title="Revert TTS"
            >
              rev
            </button>
          )}
        </div>
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tts?.line_statuses, generatingLineId, lastGeneratedIndex, episodeId, lines]
  );

  const isAutoMode = tts?.mode === 'auto';

  return (
    <div>
      <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 12 }}>
        STAGE 2: TEXT-TO-SPEECH
      </div>

      {error && (
        <div style={{ color: 'var(--danger)', marginBottom: 12, fontSize: 13 }}>
          Error: {error}
        </div>
      )}

      {phase === 'initializing' && (
        <ProgressBar label="Initializing TTS..." />
      )}

      {phase === 'generating' && (
        <ProgressBar
          label={`Auto-generating TTS... ${generatedCount}/${totalCount}`}
          progress={(generatedCount / totalCount) * 100}
        />
      )}

      {phase === 'editing' && (
        <>
          <TTSControls
            mode={tts?.mode || 'manual'}
            generated={generatedCount}
            total={totalCount}
            allGenerated={allGenerated}
            onToggleMode={handleToggleMode}
            onApprove={handleApprove}
            generating={!!generatingLineId || phase === 'generating'}
          />
          <LineEditor
            lines={lines}
            onReorder={handleReorder}
            onEdit={handleEdit}
            onAdd={handleAdd}
            onDelete={handleDelete}
            lockedBefore={lastGeneratedIndex + 1}
            readOnly={isAutoMode}
            renderLineExtra={renderLineExtra}
          />
        </>
      )}

      {phase === 'done' && (
        <div style={{ color: 'var(--text-secondary)' }}>
          TTS approved. {generatedCount} audio files generated.
        </div>
      )}
    </div>
  );
}

const genBtnStyle: React.CSSProperties = {
  background: 'none',
  border: '1px solid var(--accent)',
  color: 'var(--accent)',
  fontFamily: 'var(--font-mono)',
  fontSize: 11,
  padding: '2px 8px',
  cursor: 'pointer',
  borderRadius: 2,
};

registerStage({
  id: 'stage_2_tts',
  order: 2,
  name: 'TTS',
  component: TTSStage,
});

export default TTSStage;
