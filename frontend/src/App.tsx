import { useEffect, useState } from 'react';
import TerminalLayout from './terminal/TerminalLayout';
import TerminalHeader from './terminal/TerminalHeader';
import StageRouter from './stages/StageRouter';
import EpisodeMenu from './components/EpisodeMenu';
import ShortsMenu from './shorts/ShortsMenu';
import ShortsWorkflow from './shorts/ShortsWorkflow';
import { useEpisodeStore } from './state/episodeStore';
import { useShortsStore } from './shorts/shortsStore';
import { listStages, getEpisode } from './api/stages';
import { getShort } from './shorts/api';

interface StageInfo {
  id: string;
  order: number;
  name: string;
}

type AppMode = 'episodes' | 'shorts';

export default function App() {
  const [stages, setStages] = useState<StageInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<AppMode>('episodes');

  const { episodeId, currentStage, setEpisodeId, setState, setCurrentStage } =
    useEpisodeStore();

  const { shortId, setShortId, setState: setShortState } = useShortsStore();

  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        const stageList = await listStages();
        if (cancelled) return;
        setStages(stageList);
      } catch (err: unknown) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to connect to server');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    init();
    return () => { cancelled = true; };
  }, []);

  const handleSelectEpisode = async (epId: string) => {
    try {
      setLoading(true);
      setError(null);
      setEpisodeId(epId);
      const state = await getEpisode(epId);
      setState(state);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load episode');
      setEpisodeId(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectShort = async (sId: string) => {
    try {
      setLoading(true);
      setError(null);
      setShortId(sId);
      const state = await getShort(sId);
      setShortState(state);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load short');
      setShortId(null);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToMenu = () => {
    if (mode === 'episodes') {
      setEpisodeId(null);
      setState(null);
    } else {
      setShortId(null);
      setShortState(null);
    }
  };

  const handleSwitchMode = (newMode: AppMode) => {
    // Clear any active selections
    setEpisodeId(null);
    setState(null);
    setShortId(null);
    setShortState(null);
    setMode(newMode);
  };

  const handleAdvance = () => {
    const currentOrder = stages.find((s) => s.id === currentStage)?.order ?? -1;
    const next = stages.find((s) => s.order === currentOrder + 1);
    if (next) {
      setCurrentStage(next.id);
    }
  };

  const isActive = mode === 'episodes' ? !!episodeId : !!shortId;

  if (error && !isActive) {
    return (
      <TerminalLayout
        header={<TerminalHeader stages={stages} currentStage="" />}
      >
        <div style={{ color: 'var(--danger)' }}>
          Connection error: {error}
          <br />
          <span style={{ color: 'var(--text-dim)', fontSize: 12 }}>
            Make sure the backend is running: cd backend && uvicorn app:app --reload
          </span>
        </div>
      </TerminalLayout>
    );
  }

  const showMenu = !loading && !isActive;

  return (
    <TerminalLayout
      header={
        <TerminalHeader
          stages={stages}
          currentStage={episodeId ? currentStage : ''}
          episodeId={episodeId}
          onStageClick={(stageId) => setCurrentStage(stageId)}
        />
      }
      footer={
        isActive ? (
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              padding: '4px 16px',
              background: 'var(--bg-secondary)',
              borderTop: '1px solid var(--border-color)',
              fontSize: 11,
            }}
          >
            <button
              onClick={handleBackToMenu}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-dim)',
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                cursor: 'pointer',
              }}
            >
              [menu]
            </button>
          </div>
        ) : undefined
      }
    >
      {loading ? (
        <div style={{ color: 'var(--text-dim)' }}>Connecting...</div>
      ) : showMenu ? (
        <div>
          {/* Mode tabs */}
          <div style={{
            display: 'flex',
            gap: 0,
            marginBottom: 16,
            borderBottom: '1px solid var(--border-color)',
          }}>
            {(['episodes', 'shorts'] as const).map((m) => (
              <button
                key={m}
                onClick={() => handleSwitchMode(m)}
                style={{
                  background: 'none',
                  border: 'none',
                  borderBottom: mode === m ? '2px solid var(--accent)' : '2px solid transparent',
                  color: mode === m ? 'var(--accent)' : 'var(--text-dim)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 13,
                  padding: '8px 16px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  textTransform: 'capitalize',
                }}
              >
                {m}
              </button>
            ))}
          </div>

          {/* Menu content */}
          {mode === 'episodes' ? (
            <EpisodeMenu onSelect={handleSelectEpisode} />
          ) : (
            <ShortsMenu onSelect={handleSelectShort} />
          )}
        </div>
      ) : mode === 'episodes' && episodeId ? (
        <StageRouter
          currentStage={currentStage}
          episodeId={episodeId}
          onAdvance={handleAdvance}
        />
      ) : mode === 'shorts' && shortId ? (
        <ShortsWorkflow shortId={shortId} />
      ) : null}
    </TerminalLayout>
  );
}
