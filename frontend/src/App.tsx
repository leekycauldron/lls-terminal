import { useEffect, useState } from 'react';
import TerminalLayout from './terminal/TerminalLayout';
import TerminalHeader from './terminal/TerminalHeader';
import StageRouter from './stages/StageRouter';
import { useEpisodeStore } from './state/episodeStore';
import {
  listStages,
  listEpisodes,
  createEpisode,
  getEpisode,
} from './api/stages';

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

        const episodes = await listEpisodes();
        if (cancelled) return;
        let epId: string;

        if (episodes.length > 0) {
          const latest = episodes[episodes.length - 1];
          epId = latest.id;
        } else {
          const ep = await createEpisode('Episode 1');
          if (cancelled) return;
          epId = ep.id;
        }

        setEpisodeId(epId);
        const state = await getEpisode(epId);
        if (cancelled) return;
        setState(state);
      } catch (err: unknown) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to connect to server');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    init();
    return () => { cancelled = true; };
  }, [setEpisodeId, setState]);

  const handleAdvance = () => {
    const currentOrder = stages.find((s) => s.id === currentStage)?.order ?? -1;
    const next = stages.find((s) => s.order === currentOrder + 1);
    if (next) {
      setCurrentStage(next.id);
    }
  };

  const handleNewEpisode = async () => {
    try {
      setLoading(true);
      const episodes = await listEpisodes();
      const ep = await createEpisode(`Episode ${episodes.length + 1}`);
      setEpisodeId(ep.id);
      const state = await getEpisode(ep.id);
      setState(state);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create episode');
    } finally {
      setLoading(false);
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

  return (
    <TerminalLayout
      header={
        <TerminalHeader
          stages={stages}
          currentStage={currentStage}
          episodeId={episodeId}
        />
      }
      footer={
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
            onClick={handleNewEpisode}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-dim)',
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              cursor: 'pointer',
            }}
          >
            [new episode]
          </button>
        </div>
      }
    >
      {loading ? (
        <div style={{ color: 'var(--text-dim)' }}>Connecting...</div>
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
