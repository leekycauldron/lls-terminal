import { useEffect, useState } from 'react';
import { useCaptionsStore } from './captionsStore';
import { getCaptionsConfig, updateCaptionsConfig, listCaptionsPresets } from './api';
import { TEXT_ELEMENT_KEYS, TEXT_ELEMENT_LABELS } from './types';
import type { TextElementKey } from './types';
import TextStyleEditor from './TextStyleEditor';
import CaptionPreview from './CaptionPreview';

export default function CaptionsDesigner() {
  const { config, presets, dirty, setConfig, setPresets, updateTextStyle, applyPreset, markClean } =
    useCaptionsStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        const [cfg, prs] = await Promise.all([getCaptionsConfig(), listCaptionsPresets()]);
        if (cancelled) return;
        setConfig(cfg);
        setPresets(prs);
      } catch (err: unknown) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load captions config');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    init();
    return () => { cancelled = true; };
  }, []);

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    try {
      await updateCaptionsConfig(config);
      markClean();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ color: 'var(--text-dim)', padding: 16 }}>Loading captions config...</div>;
  }

  if (error) {
    return (
      <div style={{ padding: 16 }}>
        <div style={{ color: 'var(--danger)', marginBottom: 8 }}>Error: {error}</div>
        <button
          onClick={() => { setError(null); setLoading(true); }}
          style={linkStyle}
        >
          [retry]
        </button>
      </div>
    );
  }

  if (!config) return null;

  return (
    <div style={{ display: 'flex', gap: 20, height: '100%' }}>
      {/* Left: editors */}
      <div style={{ flex: 1, overflowY: 'auto', minWidth: 0 }}>
        <div style={{ color: 'var(--text-primary)', fontSize: 13, marginBottom: 12 }}>
          Caption Style Designer
        </div>

        {/* Preset bar */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ color: 'var(--text-dim)', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
            Presets
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {Object.keys(presets).map((name) => (
              <button
                key={name}
                onClick={() => applyPreset(name)}
                style={{
                  background: config.preset_name === name ? 'var(--accent)' : 'var(--bg-primary)',
                  color: config.preset_name === name ? 'var(--bg-primary)' : 'var(--text-secondary)',
                  border: '1px solid var(--border-color)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  padding: '4px 10px',
                  cursor: 'pointer',
                  borderRadius: 2,
                  transition: 'all 0.2s',
                }}
              >
                {name.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Text style editors */}
        {TEXT_ELEMENT_KEYS.map((key) => (
          <TextStyleEditor
            key={key}
            label={TEXT_ELEMENT_LABELS[key]}
            style={config[key]}
            onChange={(updates) => updateTextStyle(key as TextElementKey, updates)}
          />
        ))}

        {/* Save button */}
        <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={handleSave}
            disabled={saving || !dirty}
            style={{
              background: dirty ? 'var(--accent)' : 'var(--bg-secondary)',
              color: dirty ? 'var(--bg-primary)' : 'var(--text-dim)',
              border: '1px solid var(--border-color)',
              fontFamily: 'var(--font-mono)',
              fontSize: 13,
              padding: '6px 20px',
              cursor: dirty && !saving ? 'pointer' : 'default',
              borderRadius: 2,
              opacity: saving ? 0.5 : 1,
              transition: 'all 0.2s',
            }}
          >
            {saving ? '> Saving...' : '> Save'}
          </button>
          {dirty && (
            <span style={{ color: 'var(--warning, #f0ad4e)', fontSize: 11 }}>
              unsaved changes
            </span>
          )}
        </div>
      </div>

      {/* Right: preview */}
      <div style={{ width: 290, flexShrink: 0, position: 'sticky', top: 0, alignSelf: 'flex-start' }}>
        <div style={{ color: 'var(--text-dim)', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
          Preview (1080x1920)
        </div>
        <CaptionPreview config={config} />
      </div>
    </div>
  );
}

const linkStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  fontFamily: 'var(--font-mono)',
  fontSize: 13,
  cursor: 'pointer',
  padding: 0,
  color: 'var(--text-secondary)',
};
