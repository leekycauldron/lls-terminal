import { useState, useRef } from 'react';
import type { IntroData, ContextData } from '../types';
import { uploadIntroImage, updateIntro, generateIntroTTS, generateIntroTitle } from '../../api/stages';

interface IntroPanelProps {
  episodeId: string;
  episodeNumber: number;
  seed: string;
  intro: IntroData;
  characters: ContextData['characters'];
  onIntroUpdate: (intro: IntroData) => void;
}

export default function IntroPanel({
  episodeId,
  episodeNumber,
  seed,
  intro,
  characters,
  onIntroUpdate,
}: IntroPanelProps) {
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatingTitle, setGeneratingTitle] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [cacheBust, setCacheBust] = useState(Date.now());

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const result = await uploadIntroImage(episodeId, file);
      onIntroUpdate(result);
      setCacheBust(Date.now());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleCharacterChange = async (charId: string) => {
    setError(null);
    try {
      const result = await updateIntro(episodeId, { character_id: charId });
      onIntroUpdate(result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Update failed');
    }
  };

  const handleGenerateTitle = async () => {
    setGeneratingTitle(true);
    setError(null);
    try {
      const result = await generateIntroTitle(episodeId);
      onIntroUpdate(result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Title generation failed');
    } finally {
      setGeneratingTitle(false);
    }
  };

  const handleTitleChange = async (field: 'title_zh' | 'title_en', value: string) => {
    setError(null);
    try {
      const result = await updateIntro(episodeId, { [field]: value });
      onIntroUpdate(result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Update failed');
    }
  };

  const handleTextChange = async (text: string) => {
    setError(null);
    try {
      const result = await updateIntro(episodeId, { tts_text: text });
      onIntroUpdate(result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Update failed');
    }
  };

  const handleGenerateTTS = async () => {
    setGenerating(true);
    setError(null);
    try {
      const result = await generateIntroTTS(episodeId);
      onIntroUpdate(result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'TTS generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const characterEntries = Object.entries(characters);

  return (
    <div
      style={{
        marginBottom: 16,
        padding: 12,
        border: '1px solid var(--border-color)',
        borderRadius: 2,
        background: 'var(--bg-secondary)',
      }}
    >
      <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 8 }}>
        INTRO CARD
      </div>

      <div style={{ fontSize: 13, color: 'var(--text-primary)', marginBottom: 12 }}>
        Episode {episodeNumber} &middot; Seed: {seed}
      </div>

      {error && (
        <div style={{ color: 'var(--danger)', marginBottom: 8, fontSize: 12 }}>
          {error}
        </div>
      )}

      {/* Title generation + editing */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
        <button
          onClick={handleGenerateTitle}
          disabled={generatingTitle}
          style={{ ...btnStyle, opacity: generatingTitle ? 0.5 : 1 }}
        >
          {generatingTitle ? 'Generating...' : 'Generate Title'}
        </button>
        <input
          type="text"
          value={intro.title_zh}
          onChange={(e) => handleTitleChange('title_zh', e.target.value)}
          placeholder="中文标题..."
          style={{
            flex: 1,
            background: 'var(--bg-primary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-color)',
            padding: '4px 8px',
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            borderRadius: 2,
          }}
        />
        <input
          type="text"
          value={intro.title_en}
          onChange={(e) => handleTitleChange('title_en', e.target.value)}
          placeholder="English title..."
          style={{
            flex: 1,
            background: 'var(--bg-primary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-color)',
            padding: '4px 8px',
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            borderRadius: 2,
          }}
        />
      </div>

      {/* Template download + image upload */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
        <a
          href="http://localhost:8000/static/templates/template.png"
          target="_blank"
          rel="noopener noreferrer"
          style={{ ...btnStyle, textDecoration: 'none', display: 'inline-block' }}
        >
          View Template
        </a>
        <button onClick={() => fileRef.current?.click()} style={btnStyle} disabled={uploading}>
          {uploading ? 'Uploading...' : 'Upload Image'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={handleUpload}
          style={{ display: 'none' }}
        />
        {intro.image_uploaded && (
          <span style={{ color: 'var(--success, #4caf50)', fontSize: 12 }}>
            ✓ Image uploaded
          </span>
        )}
      </div>

      {/* Image preview */}
      {intro.image_uploaded && (
        <div style={{ marginBottom: 12 }}>
          <img
            src={`http://localhost:8000/static/episodes/${episodeId}/intro.png?t=${cacheBust}`}
            alt="Intro card"
            style={{ maxWidth: 320, border: '1px solid var(--border-color)', borderRadius: 2 }}
          />
        </div>
      )}

      {/* Character dropdown + TTS text */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
        <select
          value={intro.character_id}
          onChange={(e) => handleCharacterChange(e.target.value)}
          style={{
            background: 'var(--bg-primary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-color)',
            padding: '4px 8px',
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            borderRadius: 2,
          }}
        >
          <option value="">Select narrator...</option>
          {characterEntries.map(([id, char]) => (
            <option key={id} value={id}>
              {id} ({char.role})
            </option>
          ))}
        </select>

        <input
          type="text"
          value={intro.tts_text}
          onChange={(e) => handleTextChange(e.target.value)}
          placeholder="TTS text..."
          style={{
            flex: 1,
            background: 'var(--bg-primary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-color)',
            padding: '4px 8px',
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            borderRadius: 2,
          }}
        />

        <button
          onClick={handleGenerateTTS}
          disabled={generating || !intro.character_id || !intro.tts_text}
          style={{
            ...btnStyle,
            opacity: generating || !intro.character_id || !intro.tts_text ? 0.5 : 1,
          }}
        >
          {generating ? 'Generating...' : 'Generate TTS'}
        </button>

        {intro.tts_generated && (
          <span style={{ color: 'var(--success, #4caf50)', fontSize: 12 }}>
            ✓ TTS ready
          </span>
        )}
      </div>

      {/* Audio preview */}
      {intro.tts_generated && intro.audio_file && (
        <audio
          controls
          src={`http://localhost:8000/static/episodes/${episodeId}/${intro.audio_file}?t=${cacheBust}`}
          style={{ height: 28 }}
        />
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
