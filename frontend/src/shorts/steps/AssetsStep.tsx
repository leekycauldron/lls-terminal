import { useState } from 'react';
import { useShortsStore } from '../shortsStore';
import { generateImage, generateAllImages, revertImage, generateTTS, approveAssets } from '../api';

interface AssetsStepProps {
  shortId: string;
}

const STATIC_BASE = 'http://localhost:8000/static/shorts';

export default function AssetsStep({ shortId }: AssetsStepProps) {
  const { state, setState, setItems, updateItem, setCurrentStep } = useShortsStore();
  const [generatingImage, setGeneratingImage] = useState<string | null>(null);
  const [generatingAll, setGeneratingAll] = useState(false);
  const [generatingTTS, setGeneratingTTS] = useState(false);
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const items = state?.items || [];
  const allImagesGenerated = items.every((i) => i.image_generated);
  const allTTSGenerated = items.every((i) => i.tts_generated) && !!state?.tts_question_file;

  const handleGenerateImage = async (itemId: string) => {
    setGeneratingImage(itemId);
    setError(null);
    try {
      const updated = await generateImage(shortId, itemId);
      updateItem(itemId, updated);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to generate image');
    } finally {
      setGeneratingImage(null);
    }
  };

  const handleGenerateAll = async () => {
    setGeneratingAll(true);
    setError(null);
    try {
      const result = await generateAllImages(shortId);
      setItems(result.items);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to generate images');
    } finally {
      setGeneratingAll(false);
    }
  };

  const handleRevertImage = async (itemId: string) => {
    try {
      const updated = await revertImage(shortId, itemId);
      updateItem(itemId, updated);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to revert image');
    }
  };

  const handleGenerateTTS = async () => {
    setGeneratingTTS(true);
    setError(null);
    try {
      const updated = await generateTTS(shortId);
      setState(updated);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to generate TTS');
    } finally {
      setGeneratingTTS(false);
    }
  };

  const handleApprove = async () => {
    setApproving(true);
    setError(null);
    try {
      await approveAssets(shortId);
      if (state) {
        setState({ ...state, assets_approved: true, current_step: 'export' });
      }
      setCurrentStep('export');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to approve assets');
    } finally {
      setApproving(false);
    }
  };

  return (
    <div>
      <div style={{ color: 'var(--text-primary)', fontSize: 14, marginBottom: 16 }}>
        Asset Generation
      </div>

      {/* Image section */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
            Images ({items.filter((i) => i.image_generated).length}/{items.length})
          </div>
          <button
            onClick={handleGenerateAll}
            disabled={generatingAll || allImagesGenerated}
            style={linkBtnStyle}
          >
            {generatingAll ? '[generating all...]' : '[generate all images]'}
          </button>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: 12,
        }}>
          {items.map((item) => (
            <div
              key={item.id}
              style={{
                border: '1px solid var(--border-color)',
                borderRadius: 2,
                overflow: 'hidden',
              }}
            >
              <div style={{
                width: '100%',
                aspectRatio: '1',
                background: 'var(--bg-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
              }}>
                {item.image_generated && item.image_file ? (
                  <img
                    src={`${STATIC_BASE}/${shortId}/${item.image_file}?t=${Date.now()}`}
                    alt={item.word_en}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : generatingImage === item.id || generatingAll ? (
                  <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>Generating...</span>
                ) : (
                  <span style={{ color: 'var(--text-dim)', fontSize: 24 }}>?</span>
                )}
              </div>
              <div style={{ padding: '6px 8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--accent)', fontSize: 16 }}>{item.word_zh}</span>
                  <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>{item.word_en}</span>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  {item.image_generated ? (
                    <>
                      <button
                        onClick={() => handleGenerateImage(item.id)}
                        disabled={generatingImage === item.id}
                        style={linkBtnStyle}
                      >
                        [regen]
                      </button>
                      <button
                        onClick={() => handleRevertImage(item.id)}
                        style={{ ...linkBtnStyle, color: 'var(--danger)' }}
                      >
                        [revert]
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleGenerateImage(item.id)}
                      disabled={generatingImage !== null || generatingAll}
                      style={linkBtnStyle}
                    >
                      [generate]
                    </button>
                  )}
                </div>
                {/* TTS status */}
                <div style={{ marginTop: 4, fontSize: 10, color: item.tts_generated ? 'var(--success)' : 'var(--text-dim)' }}>
                  TTS: {item.tts_generated ? 'done' : 'pending'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* TTS section */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
            TTS Audio ({items.filter((i) => i.tts_generated).length}/{items.length} items
            {state?.tts_question_file ? ' + question' : ''})
          </div>
          <button
            onClick={handleGenerateTTS}
            disabled={generatingTTS || allTTSGenerated}
            style={linkBtnStyle}
          >
            {generatingTTS ? '[generating TTS...]' : '[generate all TTS]'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ color: 'var(--danger)', fontSize: 12, marginBottom: 12 }}>
          {error}
        </div>
      )}

      <button
        onClick={handleApprove}
        disabled={approving || !allImagesGenerated || !allTTSGenerated}
        style={{
          ...btnStyle,
          opacity: !allImagesGenerated || !allTTSGenerated ? 0.5 : 1,
        }}
      >
        {approving ? '> Approving...' : '> Approve Assets'}
      </button>

      {(!allImagesGenerated || !allTTSGenerated) && (
        <div style={{ color: 'var(--text-dim)', fontSize: 11, marginTop: 8 }}>
          {!allImagesGenerated && 'Generate all images'}
          {!allImagesGenerated && !allTTSGenerated && ' and '}
          {!allTTSGenerated && 'generate all TTS'}
          {' before approving.'}
        </div>
      )}
    </div>
  );
}

const linkBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  fontFamily: 'var(--font-mono)',
  fontSize: 11,
  cursor: 'pointer',
  padding: 0,
  color: 'var(--text-secondary)',
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
