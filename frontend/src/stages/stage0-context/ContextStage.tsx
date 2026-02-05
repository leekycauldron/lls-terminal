import { useEffect, useState } from 'react';
import type { StageComponentProps } from '../types';
import { loadContext } from '../../api/stages';
import { useEpisodeStore } from '../../state/episodeStore';
import ProgressBar from '../../components/ProgressBar';
import { registerStage } from '../stageRegistry';

type BootLine = { text: string; delay: number };

const BOOT_SEQUENCE: BootLine[] = [
  { text: 'LLS Terminal v1.0', delay: 100 },
  { text: 'Initializing context module...', delay: 300 },
  { text: 'Loading character registry...', delay: 200 },
  { text: 'Loading settings registry...', delay: 200 },
  { text: 'Loading episode history...', delay: 200 },
];

function ContextStage({ episodeId, onAdvance }: StageComponentProps) {
  const [bootLines, setBootLines] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contextLoaded, setContextLoaded] = useState(false);
  const setContext = useEpisodeStore((s) => s.setContext);
  const setCurrentStage = useEpisodeStore((s) => s.setCurrentStage);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      // Play boot animation
      for (const line of BOOT_SEQUENCE) {
        if (cancelled) return;
        await new Promise((r) => setTimeout(r, line.delay));
        if (cancelled) return;
        setBootLines((prev) => [...prev, line.text]);
      }

      // Load actual context
      try {
        const ctx = await loadContext(episodeId);
        if (cancelled) return;
        setContext(ctx);

        const charCount = Object.keys(ctx.characters).length;
        const settingCount = Object.keys(ctx.settings).length;
        const histCount = ctx.episode_history.length;

        setBootLines((prev) => [
          ...prev,
          `  ✓ ${charCount} characters loaded`,
          `  ✓ ${settingCount} settings loaded`,
          `  ✓ ${histCount} previous episodes loaded`,
          '',
          'Context loaded. Ready to proceed.',
        ]);
        setContextLoaded(true);
      } catch (err: unknown) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : 'Unknown error';
        setBootLines((prev) => [...prev, `  ✗ Error: ${msg}`]);
        setError(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    boot();
    return () => { cancelled = true; };
  }, [episodeId, setContext]);

  const handleAdvance = () => {
    setCurrentStage('stage_1_script');
    onAdvance();
  };

  return (
    <div>
      {bootLines.map((line, i) => (
        <div
          key={i}
          className="flicker"
          style={{
            color: line.startsWith('  ✓')
              ? 'var(--text-secondary)'
              : line.startsWith('  ✗')
                ? 'var(--danger)'
                : 'var(--text-primary)',
            fontSize: 13,
            lineHeight: 1.8,
          }}
        >
          {line || '\u00A0'}
        </div>
      ))}

      {loading && <ProgressBar label="Loading context..." />}
      {error && (
        <div style={{ color: 'var(--danger)', marginTop: 8 }}>
          Failed to load context: {error}
        </div>
      )}

      {contextLoaded && (
        <div style={{ marginTop: 16 }}>
          <button
            onClick={handleAdvance}
            style={{
              background: 'none',
              border: '1px solid var(--accent)',
              color: 'var(--accent)',
              padding: '6px 16px',
              fontFamily: 'var(--font-mono)',
              fontSize: 13,
              cursor: 'pointer',
              borderRadius: 2,
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 0 8px var(--border-glow)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            {'>'} Proceed to Script Generation
          </button>
        </div>
      )}
    </div>
  );
}

registerStage({
  id: 'stage_0_context',
  order: 0,
  name: 'Context',
  component: ContextStage,
});

export default ContextStage;
