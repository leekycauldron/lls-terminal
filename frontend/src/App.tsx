import { useEffect, useState } from 'react';
import TerminalLayout from './terminal/TerminalLayout';
import TerminalHeader from './terminal/TerminalHeader';
import StageRouter from './stages/StageRouter';
import EpisodeMenu from './components/EpisodeMenu';
import { useEpisodeStore } from './state/episodeStore';
import { listStages, getEpisode } from './api/stages';

interface StageInfo {
  id: string;
  order: number;
  name: string;
}

export default function App() {
  const [stages, setStages] = useState<StageInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { episodeId, currentStage, setEpisodeId, setState, setCurrentStage } =
    useEpisodeStore();

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

  const handleBackToMenu = () => {
    setEpisodeId(null);
    setState(null);
  };

  const handleAdvance = () => {
    const currentOrder = stages.find((s) => s.id === currentStage)?.order ?? -1;
    const next = stages.find((s) => s.order === currentOrder + 1);
    if (next) {
      setCurrentStage(next.id);
    }
  };

  if (error && !episodeId) {
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

  const showMenu = !loading && !episodeId;

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
        episodeId ? (
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
              [episodes]
            </button>
          </div>
        ) : undefined
      }
    >
      {loading ? (
        <div style={{ color: 'var(--text-dim)' }}>Connecting...</div>
      ) : showMenu ? (
        <EpisodeMenu onSelect={handleSelectEpisode} />
      ) : episodeId ? (
        <StageRouter
          currentStage={currentStage}
          episodeId={episodeId}
          onAdvance={handleAdvance}
        />
      ) : null}
    </TerminalLayout>
  );
}
