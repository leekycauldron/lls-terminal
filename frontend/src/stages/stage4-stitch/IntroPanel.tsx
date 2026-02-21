import { useState, useRef } from 'react';
import type { IntroData, ContextData } from '../types';
import { uploadIntroImage, uploadIntroVideo, updateIntro, generateIntroTTS, generateIntroTitle, fixIntroTitle } from '../../api/stages';

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
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatingTitle, setGeneratingTitle] = useState(false);
  const [fixingTitle, setFixingTitle] = useState(false);
  const [lastEditedField, setLastEditedField] = useState<'title_zh' | 'title_en' | 'title_pinyin' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
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

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingVideo(true);
    setError(null);
    try {
      const result = await uploadIntroVideo(episodeId, file);
      onIntroUpdate(result);
      setCacheBust(Date.now());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Video upload failed');
    } finally {
      setUploadingVideo(false);
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

  const handleFixTitle = async () => {
    setFixingTitle(true);
    setError(null);
    try {
      const result = await fixIntroTitle(episodeId, lastEditedField);
      onIntroUpdate(result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Fix title failed');
    } finally {
      setFixingTitle(false);
    }
  };

  const handleTitleChange = async (field: 'title_zh' | 'title_en' | 'title_pinyin', value: string) => {
    setLastEditedField(field);
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
      setCacheBust(Date.now());
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
        <button
          onClick={handleFixTitle}
          disabled={fixingTitle}
          style={{ ...btnStyle, opacity: fixingTitle ? 0.5 : 1 }}
        >
          {fixingTitle ? 'Fixing...' : 'Fix Title'}
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
          value={intro.title_pinyin}
          onChange={(e) => handleTitleChange('title_pinyin', e.target.value)}
          placeholder="Pīnyīn..."
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

      {/* Template download + image upload + video upload */}
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
        <button onClick={() => videoRef.current?.click()} style={btnStyle} disabled={uploadingVideo}>
          {uploadingVideo ? 'Uploading...' : 'Upload Video'}
        </button>
        <input
          ref={videoRef}
          type="file"
          accept="video/*"
          onChange={handleVideoUpload}
          style={{ display: 'none' }}
        />
        {intro.video_uploaded && (
          <span style={{ color: 'var(--success, #4caf50)', fontSize: 12 }}>
            ✓ Video uploaded ({(intro.video_duration_ms / 1000).toFixed(1)}s)
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

      {/* Video preview */}
      {intro.video_uploaded && (
        <div style={{ marginBottom: 12 }}>
          <video
            controls
            src={`http://localhost:8000/static/episodes/${episodeId}/${intro.video_file}?t=${cacheBust}`}
            style={{ maxWidth: 480, border: '1px solid var(--border-color)', borderRadius: 2 }}
          />
        </div>
      )}

      {/* Recording timing guide */}
      {intro.tts_generated && (
        <div
          style={{
            marginBottom: 12,
            padding: 8,
            border: '1px solid var(--border-color)',
            borderRadius: 2,
            background: 'var(--bg-primary)',
            fontSize: 12,
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-dim)',
          }}
        >
          TTS starts at 500ms &middot; Duration: {(intro.audio_duration_ms / 1000).toFixed(1)}s
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

        <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>
          Speed: {(intro.speed ?? 1.0).toFixed(2)}x
        </span>
        <input
          type="range"
          min={0.25}
          max={4.0}
          step={0.05}
          value={intro.speed ?? 1.0}
          onChange={async (e) => {
            const speed = parseFloat(e.target.value);
            try {
              const result = await updateIntro(episodeId, { speed });
              onIntroUpdate(result);
            } catch {}
          }}
          style={{ width: 100 }}
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
