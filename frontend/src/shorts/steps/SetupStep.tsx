import { useState, useEffect } from 'react';
import { useShortsStore } from '../shortsStore';
import { updateSetup, updateConfig, generateContent, listSfx } from '../api';
import type { ShortConfig } from '../types';
import { playDone } from '../../utils/sound';

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
  const [theme, setTheme] = useState(state?.theme || 'whats_this');
  const [topic, setTopic] = useState(state?.topic || '');
  const [voiceId, setVoiceId] = useState(state?.config.voice_id || VOICES[0].id);
  const [ttsSpeed, setTtsSpeed] = useState(state?.config.tts_speed ?? 1.0);
  const [artStyle, setArtStyle] = useState(state?.config.art_style || '');
  const [wordCount, setWordCount] = useState(6);
  const [pauseAfterQuestion, setPauseAfterQuestion] = useState(state?.config.pause_after_question ?? 1.0);
  const [pauseBetweenItems, setPauseBetweenItems] = useState(state?.config.pause_between_items ?? 0.8);
  const [sentenceMode, setSentenceMode] = useState(state?.config.sentence_mode || 'sentence');
  const [repeatCount, setRepeatCount] = useState(state?.config.repeat_count ?? 5);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sfxFiles, setSfxFiles] = useState<string[]>([]);
  const [sfxTimer, setSfxTimer] = useState(state?.config.sfx_timer || '');
  const [sfxReveal, setSfxReveal] = useState(state?.config.sfx_reveal || '');
  const [sfxCorrect, setSfxCorrect] = useState(state?.config.sfx_correct || '');
  const [sfxWrong, setSfxWrong] = useState(state?.config.sfx_wrong || '');
  const [sfxTransition, setSfxTransition] = useState(state?.config.sfx_transition || '');

  useEffect(() => {
    listSfx().then((r) => setSfxFiles(r.files)).catch(() => {});
  }, []);

  const isWhichOne = theme === 'which_one';

  const handleGenerate = async () => {
    if (!topic.trim()) {
      setError('Please enter a topic');
      return;
    }
    setGenerating(true);
    setError(null);
    try {
      // Save setup (including theme)
      const updated = await updateSetup(shortId, { topic: topic.trim(), theme });

      // Save config
      const config: ShortConfig = {
        voice_id: voiceId,
        tts_speed: ttsSpeed,
        music_file: '',
        music_volume: 0.15,
        art_style: isWhichOne ? '' : artStyle,
        pause_after_question: pauseAfterQuestion,
        pause_between_items: pauseBetweenItems,
        sentence_mode: isWhichOne ? 'sentence' : sentenceMode,
        repeat_count: repeatCount,
        timer_duration: 5.0,
        reveal_hold: 1.5,
        sfx_timer: sfxTimer,
        sfx_reveal: sfxReveal,
        sfx_correct: sfxCorrect,
        sfx_wrong: sfxWrong,
        sfx_transition: sfxTransition,
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
      playDone();
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
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          style={inputStyle}
        >
          <option value="whats_this">这是什么？ (What is this?)</option>
          <option value="which_one">哪个对？ (Which One Is Right?)</option>
        </select>
        <div style={{ color: 'var(--text-dim)', fontSize: 11, marginTop: 4 }}>
          {isWhichOne
            ? 'Text-only sentence correctness quiz with countdown timer'
            : 'Object flashcard shorts with images'}
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

      {/* Timing: Pause After Question */}
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Pause After Question: {pauseAfterQuestion.toFixed(1)}s</label>
        <input
          type="range"
          min="0.3"
          max="3.0"
          step="0.1"
          value={pauseAfterQuestion}
          onChange={(e) => setPauseAfterQuestion(parseFloat(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      {/* Timing: Pause Between Items */}
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Pause Between Items: {pauseBetweenItems.toFixed(1)}s</label>
        <input
          type="range"
          min="0.3"
          max="3.0"
          step="0.1"
          value={pauseBetweenItems}
          onChange={(e) => setPauseBetweenItems(parseFloat(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      {/* Art Style (only for whats_this) */}
      {!isWhichOne && (
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Art Style (optional)</label>
          <input
            type="text"
            value={artStyle}
            onChange={(e) => setArtStyle(e.target.value)}
            placeholder='e.g., "watercolor", "anime", "3D render"'
            style={inputStyle}
          />
        </div>
      )}

      {/* Sentence Mode (only for whats_this) */}
      {!isWhichOne && (
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>After Answer Reveal</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setSentenceMode('sentence')}
              style={{
                ...toggleBtnStyle,
                ...(sentenceMode === 'sentence' ? toggleActiveStyle : {}),
              }}
            >
              Sentence
            </button>
            <button
              onClick={() => setSentenceMode('repeat')}
              style={{
                ...toggleBtnStyle,
                ...(sentenceMode === 'repeat' ? toggleActiveStyle : {}),
              }}
            >
              Word Repeat
            </button>
          </div>
          <div style={{ color: 'var(--text-dim)', fontSize: 11, marginTop: 4 }}>
            {sentenceMode === 'sentence'
              ? 'Show example sentence after answer'
              : 'Repeat the word with different voices and random labels'}
          </div>
        </div>
      )}

      {/* Repeat Count (only when repeat mode) */}
      {!isWhichOne && sentenceMode === 'repeat' && (
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Repeat Count: {repeatCount}</label>
          <input
            type="range"
            min="3"
            max="8"
            step="1"
            value={repeatCount}
            onChange={(e) => setRepeatCount(parseInt(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>
      )}

      {/* SFX Assignments */}
      {sfxFiles.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Sound Effects</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {([
              { label: 'Timer', value: sfxTimer, set: setSfxTimer },
              { label: 'Reveal', value: sfxReveal, set: setSfxReveal },
              { label: 'Correct', value: sfxCorrect, set: setSfxCorrect },
              { label: 'Wrong', value: sfxWrong, set: setSfxWrong },
              { label: 'Transition', value: sfxTransition, set: setSfxTransition },
            ] as const).map(({ label, value, set }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, color: 'var(--text-dim)', width: 70, flexShrink: 0 }}>{label}</span>
                <select
                  value={value}
                  onChange={(e) => set(e.target.value)}
                  style={{ ...inputStyle, fontSize: 11, padding: '3px 4px' }}
                >
                  <option value="">-- none --</option>
                  {sfxFiles.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          <div style={{ color: 'var(--text-dim)', fontSize: 11, marginTop: 4 }}>
            Upload SFX files from the Shorts menu
          </div>
        </div>
      )}

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

const toggleBtnStyle: React.CSSProperties = {
  background: 'none',
  border: '1px solid var(--border-color)',
  color: 'var(--text-secondary)',
  padding: '4px 12px',
  fontFamily: 'var(--font-mono)',
  fontSize: 12,
  cursor: 'pointer',
  borderRadius: 2,
  transition: 'all 0.2s',
};

const toggleActiveStyle: React.CSSProperties = {
  borderColor: 'var(--accent)',
  color: 'var(--accent)',
};
