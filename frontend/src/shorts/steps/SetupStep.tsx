import { useState } from 'react';
import { useShortsStore } from '../shortsStore';
import { updateSetup, updateConfig, generateContent } from '../api';
import type { ShortConfig } from '../types';

interface SetupStepProps {
  shortId: string;
}

const VOICES = [
  { id: 'CeSqqesYaA9g4mWOa8oU', label: '思源 (Boy, 8yo)' },
  { id: 'jqcCZkN6Knx8BJ5TBdYR', label: '思琪 (Girl, 19yo)' },
  { id: 'lxYfHSkYm1EzQzGhdbfc', label: '佳敏 (Mother)' },
  { id: 'W8lBaQb9YIoddhxfQNLP', label: '明浩 (Father)' },
  { id: 'nbgrpUZbqLXi2uvstbYP', label: '南珍 (Grandmother)' },
];

export default function SetupStep({ shortId }: SetupStepProps) {
  const { state, setState, setCurrentStep } = useShortsStore();
  const [topic, setTopic] = useState(state?.topic || '');
  const [voiceId, setVoiceId] = useState(state?.config.voice_id || VOICES[0].id);
  const [ttsSpeed, setTtsSpeed] = useState(state?.config.tts_speed ?? 1.0);
  const [artStyle, setArtStyle] = useState(state?.config.art_style || '');
  const [wordCount, setWordCount] = useState(6);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!topic.trim()) {
      setError('Please enter a topic');
      return;
    }
    setGenerating(true);
    setError(null);
    try {
      // Save setup
      const updated = await updateSetup(shortId, { topic: topic.trim() });

      // Save config
      const config: ShortConfig = {
        voice_id: voiceId,
        tts_speed: ttsSpeed,
        music_file: '',
        music_volume: 0.15,
        art_style: artStyle,
      };
      await updateConfig(shortId, config);

      // Generate content
      const result = await generateContent(shortId, wordCount);
      setState({
        ...updated,
        config,
        items: result.items,
        current_step: 'content',
      });
      setCurrentStep('content');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to generate content');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div style={{ maxWidth: 500 }}>
      <div style={{ color: 'var(--text-primary)', fontSize: 14, marginBottom: 16 }}>
        Short Setup
      </div>

      {/* Theme */}
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Theme</label>
        <select
          value="whats_this"
          disabled
          style={{ ...inputStyle, opacity: 0.6 }}
        >
          <option value="whats_this">这是什么？ (What is this?)</option>
        </select>
        <div style={{ color: 'var(--text-dim)', fontSize: 11, marginTop: 4 }}>
          Object flashcard shorts — more themes coming soon
        </div>
      </div>

      {/* Topic */}
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Topic</label>
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder='e.g., "fruits", "kitchen items", "animals"'
          style={inputStyle}
        />
      </div>

      {/* Voice */}
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Voice</label>
        <select
          value={voiceId}
          onChange={(e) => setVoiceId(e.target.value)}
          style={inputStyle}
        >
          {VOICES.map((v) => (
            <option key={v.id} value={v.id}>{v.label}</option>
          ))}
        </select>
      </div>

      {/* TTS Speed */}
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>TTS Speed: {ttsSpeed.toFixed(1)}x</label>
        <input
          type="range"
          min="0.5"
          max="2.0"
          step="0.1"
          value={ttsSpeed}
          onChange={(e) => setTtsSpeed(parseFloat(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      {/* Word Count */}
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Words per Short: {wordCount}</label>
        <input
          type="range"
          min="4"
          max="10"
          step="1"
          value={wordCount}
          onChange={(e) => setWordCount(parseInt(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      {/* Art Style (optional) */}
      <div style={{ marginBottom: 24 }}>
        <label style={labelStyle}>Art Style (optional)</label>
        <input
          type="text"
          value={artStyle}
          onChange={(e) => setArtStyle(e.target.value)}
          placeholder='e.g., "watercolor", "anime", "3D render"'
          style={inputStyle}
        />
      </div>

      {error && (
        <div style={{ color: 'var(--danger)', fontSize: 12, marginBottom: 12 }}>
          {error}
        </div>
      )}

      <button
        onClick={handleGenerate}
        disabled={generating}
        style={btnStyle}
      >
        {generating ? '> Generating Content...' : '> Generate Content'}
      </button>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  color: 'var(--text-secondary)',
  fontSize: 12,
  fontFamily: 'var(--font-mono)',
  marginBottom: 4,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--bg-primary)',
  border: '1px solid var(--border-color)',
  color: 'var(--text-primary)',
  fontFamily: 'var(--font-mono)',
  fontSize: 13,
  padding: '6px 8px',
  borderRadius: 2,
  boxSizing: 'border-box',
};

const btnStyle: React.CSSProperties = {
  background: 'none',
  border: '1px solid var(--accent)',
  color: 'var(--accent)',
  padding: '6px 16px',
  fontFamily: 'var(--font-mono)',
  fontSize: 13,
  cursor: 'pointer',
  borderRadius: 2,
  transition: 'all 0.2s',
};
