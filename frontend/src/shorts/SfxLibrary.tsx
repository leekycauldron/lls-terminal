import { useState, useEffect, useRef } from 'react';
import { listSfx, uploadSfx, deleteSfx } from './api';

const SFX_BASE = 'http://localhost:8000/static/sfx';

export default function SfxLibrary() {
  const [files, setFiles] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playingFile, setPlayingFile] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const load = async () => {
    try {
      const result = await listSfx();
      setFiles(result.files);
    } catch {
      // silent
    }
  };

  useEffect(() => { load(); }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      for (let i = 0; i < fileList.length; i++) {
        await uploadSfx(fileList[i]);
      }
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleDelete = async (filename: string) => {
    try {
      await deleteSfx(filename);
      setFiles((prev) => prev.filter((f) => f !== filename));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const handlePlay = (filename: string) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    if (playingFile === filename) {
      setPlayingFile(null);
      return;
    }
    const audio = new Audio(`${SFX_BASE}/${filename}?t=${Date.now()}`);
    audio.onended = () => setPlayingFile(null);
    audio.play().catch(() => {});
    audioRef.current = audio;
    setPlayingFile(filename);
  };

  return (
    <div
      style={{
        border: '1px solid var(--border-color)',
        borderRadius: 2,
        padding: 12,
        marginBottom: 16,
        background: 'var(--bg-secondary)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>
          SFX AUDIO LIBRARY ({files.length} files)
        </span>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          style={btnStyle}
        >
          {uploading ? 'uploading...' : 'upload'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".mp3,.wav,.ogg"
          multiple
          onChange={handleUpload}
          style={{ display: 'none' }}
        />
      </div>

      {error && (
        <div style={{ color: 'var(--danger)', fontSize: 11, marginBottom: 8 }}>
          {error}
        </div>
      )}

      {files.length === 0 ? (
        <div style={{ color: 'var(--text-dim)', fontSize: 11, fontStyle: 'italic' }}>
          No SFX files yet. Upload .mp3, .wav, or .ogg files.
        </div>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {files.map((f) => (
            <div
              key={f}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '3px 8px',
                border: '1px solid var(--border-color)',
                borderRadius: 2,
                background: 'var(--bg-primary)',
                fontSize: 11,
                fontFamily: 'var(--font-mono)',
              }}
            >
              <button
                onClick={() => handlePlay(f)}
                style={{ ...iconBtnStyle, color: playingFile === f ? 'var(--accent)' : 'var(--text-secondary)' }}
                title="Play"
              >
                {playingFile === f ? '||' : '>'}
              </button>
              <span style={{ color: 'var(--text-primary)' }}>{f}</span>
              <button
                onClick={() => handleDelete(f)}
                style={{ ...iconBtnStyle, color: 'var(--danger)' }}
                title="Delete"
              >
                x
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  background: 'none',
  border: '1px solid var(--accent)',
  color: 'var(--accent)',
  padding: '2px 10px',
  fontFamily: 'var(--font-mono)',
  fontSize: 11,
  cursor: 'pointer',
  borderRadius: 2,
};

const iconBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  fontFamily: 'var(--font-mono)',
  fontSize: 11,
  cursor: 'pointer',
  padding: 0,
};
