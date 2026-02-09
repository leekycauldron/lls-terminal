import { useEffect, useState } from 'react';
import type { StageComponentProps, ContextData } from '../types';
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

function ExpandableLog({ label, items }: { label: string; items: string[] }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          color: 'var(--text-secondary)',
          fontSize: 13,
          lineHeight: 1.8,
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        {expanded ? '▼' : '▶'} {label}
      </div>
      {expanded && (
        <div style={{ paddingLeft: 24, fontSize: 12, lineHeight: 1.6 }}>
          {items.map((item, i) => (
            <div key={i} style={{ color: 'var(--text-dim)' }}>
              {item}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ContextStage({ episodeId, onAdvance }: StageComponentProps) {
  const [bootLines, setBootLines] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contextLoaded, setContextLoaded] = useState(false);
  const [contextData, setContextData] = useState<ContextData | null>(null);
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
        setContextData(ctx);

        const charCount = Object.keys(ctx.characters).length;
        const settingCount = Object.keys(ctx.settings).length;
        const histCount = ctx.episode_history.length;

        setBootLines((prev) => [
          ...prev,
          `__expandable_chars__`,
          `__expandable_settings__`,
          `__expandable_history__`,
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

  const renderLine = (line: string, i: number) => {
    if (line === '__expandable_chars__' && contextData) {
      const chars = Object.keys(contextData.characters);
      return (
        <ExpandableLog
          key={i}
          label={`✓ ${chars.length} characters loaded`}
          items={chars.map((name) => {
            const info = contextData.characters[name];
            return `${name} — ${info.role}`;
          })}
        />
      );
    }
    if (line === '__expandable_settings__' && contextData) {
      const settings = Object.entries(contextData.settings);
      return (
        <ExpandableLog
          key={i}
          label={`✓ ${settings.length} settings loaded`}
          items={settings.map(([key, info]) => `${key} — ${info.name_en}`)}
        />
      );
    }
    if (line === '__expandable_history__' && contextData) {
      const history = contextData.episode_history;
      return (
        <ExpandableLog
          key={i}
          label={`✓ ${history.length} previous episodes loaded`}
          items={
            history.length > 0
              ? history.map((ep) => `${ep.id}: ${ep.title}`)
              : ['(none)']
          }
        />
      );
    }

    return (
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
    );
  };

  return (
    <div>
      {bootLines.map((line, i) => renderLine(line, i))}

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
