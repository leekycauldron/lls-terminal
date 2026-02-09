import { useState, useCallback } from 'react';
import type { StageComponentProps, Scene } from '../types';
import { useEpisodeStore } from '../../state/episodeStore';
import {
  generateSceneBreakdown,
  updateScenes,
  deleteScene,
  generateSceneImage,
  revertSceneImage,
  setScenesMode,
  approveScenes,
  setArtStyle,
  unapproveStage,
} from '../../api/stages';
import { registerStage } from '../stageRegistry';
import SceneEditor from './SceneEditor';
import SceneLineOverlay from './SceneLineOverlay';
import ProgressBar from '../../components/ProgressBar';

type Phase = 'init' | 'generating-breakdown' | 'editing' | 'generating-all' | 'done';

function ScenesStage({ episodeId }: StageComponentProps) {
  const {
    state,
    setScenesData,
    setScenes,
    updateScene,
    setScenesApproved,
    setCurrentStage,
    setArtStyle: setStoreArtStyle,
  } = useEpisodeStore();

  const scenesData = state?.scenes;
  const scenes = scenesData?.scenes || [];
  const lines = state?.script.lines || [];
  const approved = scenesData?.approved || false;

  const initialPhase: Phase = approved
    ? 'done'
    : scenes.length > 0
      ? 'editing'
      : 'init';

  const [phase, setPhase] = useState<Phase>(initialPhase);
  const [error, setError] = useState<string | null>(null);
  const [generatingSceneId, setGeneratingSceneId] = useState<string | null>(null);
  const [artStyleLocal, setArtStyleLocal] = useState(state?.art_style || '');
  const [artStyleSaving, setArtStyleSaving] = useState(false);

  const handleSaveArtStyle = async () => {
    setArtStyleSaving(true);
    try {
      await setArtStyle(episodeId, artStyleLocal);
      setStoreArtStyle(artStyleLocal);
    } catch {
      // silent
    } finally {
      setArtStyleSaving(false);
    }
  };

  const generatedCount = scenes.filter((s) => s.generated).length;
  const allGenerated = generatedCount === scenes.length && scenes.length > 0;

  const handleGenerateBreakdown = async () => {
    setPhase('generating-breakdown');
    setError(null);
    try {
      const result = await generateSceneBreakdown(episodeId);
      setScenesData(result);
      setPhase('editing');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Breakdown generation failed');
      setPhase('init');
    }
  };

  const handleEditPrompt = useCallback(
    async (sceneId: string, prompt: string) => {
      updateScene(sceneId, { prompt });
      const updatedScenes = scenes.map((s) =>
        s.id === sceneId ? { ...s, prompt } : s
      );
      try {
        await updateScenes(episodeId, updatedScenes);
      } catch {
        // Revert handled by next load
      }
    },
    [episodeId, scenes, updateScene]
  );

  const handleGenerate = useCallback(
    async (sceneId: string) => {
      setGeneratingSceneId(sceneId);
      setError(null);
      try {
        const result = await generateSceneImage(episodeId, sceneId);
        updateScene(sceneId, { image_file: result.image_file, generated: true });
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Image generation failed');
      } finally {
        setGeneratingSceneId(null);
      }
    },
    [episodeId, updateScene]
  );

  const handleGenerateAll = async () => {
    setPhase('generating-all');
    setError(null);
    try {
      const ungenerated = scenes.filter((s) => !s.generated);
      for (const scene of ungenerated) {
        setGeneratingSceneId(scene.id);
        const result = await generateSceneImage(episodeId, scene.id);
        updateScene(scene.id, { image_file: result.image_file, generated: true });
      }
      setGeneratingSceneId(null);
      setPhase('editing');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Auto image generation failed');
      setGeneratingSceneId(null);
      setPhase('editing');
    }
  };

  const handleRevert = useCallback(
    async (sceneId: string) => {
      setError(null);
      try {
        await revertSceneImage(episodeId, sceneId);
        updateScene(sceneId, { image_file: '', generated: false });
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Revert failed');
      }
    },
    [episodeId, updateScene]
  );

  const handleDelete = useCallback(
    async (sceneId: string) => {
      setError(null);
      try {
        const result = await deleteScene(episodeId, sceneId);
        setScenes(result);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Delete failed');
      }
    },
    [episodeId, setScenes]
  );

  const handleToggleMode = async () => {
    const newMode = scenesData?.mode === 'manual' ? 'auto' : 'manual';
    try {
      await setScenesMode(episodeId, newMode);
      setScenesData({ ...scenesData!, mode: newMode });
      if (newMode === 'auto') {
        await handleGenerateAll();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Mode change failed');
    }
  };

  const handleApprove = async () => {
    setError(null);
    try {
      const result = await approveScenes(episodeId);
      setScenesApproved(true);
      setCurrentStage(result.current_stage);
      setPhase('done');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Approval failed');
    }
  };

  return (
    <div>
      <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 12 }}>
        STAGE 3: SCENE GENERATION
      </div>

      {error && (
        <div style={{ color: 'var(--danger)', marginBottom: 12, fontSize: 13 }}>
          Error: {error}
        </div>
      )}

      {phase === 'init' && (
        <div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
            Generate a scene breakdown from your {lines.length}-line script.
            The AI will divide lines into visual scenes with image prompts.
          </p>
          <button onClick={handleGenerateBreakdown} style={btnStyle}>
            Generate Scene Breakdown
          </button>
        </div>
      )}

      {phase === 'generating-breakdown' && (
        <ProgressBar label="Generating scene breakdown..." />
      )}

      {phase === 'generating-all' && (
        <ProgressBar
          label={`Generating image ${generatedCount + 1}/${scenes.length}...`}
          progress={scenes.length ? (generatedCount / scenes.length) * 100 : 0}
        />
      )}

      {phase === 'editing' && (
        <>
          {/* Art style input */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 12,
              padding: 8,
              border: '1px solid var(--border-color)',
              borderRadius: 2,
              background: 'var(--bg-secondary)',
            }}
          >
            <span style={{ fontSize: 12, color: 'var(--text-dim)', flexShrink: 0 }}>
              Art style:
            </span>
            <input
              value={artStyleLocal}
              onChange={(e) => setArtStyleLocal(e.target.value)}
              onBlur={handleSaveArtStyle}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSaveArtStyle(); }}
              placeholder="e.g. Studio Ghibli watercolor, Pixar 3D, flat vector, oil painting..."
              style={{
                flex: 1,
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                padding: '4px 8px',
                borderRadius: 2,
              }}
            />
            {artStyleSaving && (
              <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>saving...</span>
            )}
          </div>

          <SceneLineOverlay scenes={scenes} lines={lines} />

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 12,
            }}
          >
            <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
              Images: {generatedCount}/{scenes.length}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={handleToggleMode}
                disabled={!!generatingSceneId}
                style={{ ...btnStyle, borderColor: 'var(--text-dim)', color: 'var(--text-dim)' }}
              >
                Mode: {scenesData?.mode || 'manual'}
              </button>
              <button
                onClick={handleGenerateBreakdown}
                disabled={!!generatingSceneId}
                style={{ ...btnStyle, borderColor: 'var(--text-dim)', color: 'var(--text-dim)' }}
              >
                Re-generate Breakdown
              </button>
              {allGenerated && (
                <button onClick={handleApprove} style={btnStyle}>
                  Approve Scenes →
                </button>
              )}
            </div>
          </div>

          <SceneEditor
            scenes={scenes}
            episodeId={episodeId}
            lines={lines}
            onEditPrompt={handleEditPrompt}
            onGenerate={handleGenerate}
            onRevert={handleRevert}
            onDelete={handleDelete}
            generatingSceneId={generatingSceneId}
          />
        </>
      )}

      {phase === 'done' && (
        <div style={{ color: 'var(--text-secondary)' }}>
          Scenes approved. {scenes.length} scenes with images finalized.
          <button
            onClick={async () => {
              await unapproveStage(episodeId, 'stage_3_scenes');
              setScenesApproved(false);
              setCurrentStage('stage_3_scenes');
              setPhase('editing');
            }}
            style={{ ...btnStyle, marginLeft: 16, borderColor: 'var(--text-dim)', color: 'var(--text-dim)' }}
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
  padding: '4px 12px',
  fontFamily: 'var(--font-mono)',
  fontSize: 12,
  cursor: 'pointer',
  borderRadius: 2,
};

registerStage({
  id: 'stage_3_scenes',
  order: 3,
  name: 'Scenes',
  component: ScenesStage,
});

export default ScenesStage;
