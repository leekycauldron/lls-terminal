const STATIC_BASE = 'http://localhost:8000/static/episodes';

interface VideoPreviewProps {
  episodeId: string;
  outputFile: string;
}

export default function VideoPreview({ episodeId, outputFile }: VideoPreviewProps) {
  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 8 }}>
        Preview
      </div>
      <video
        key={outputFile}
        controls
        style={{
          width: '100%',
          maxHeight: 400,
          borderRadius: 2,
          border: '1px solid var(--border-color)',
          background: '#000',
        }}
      >
        <source
          src={`${STATIC_BASE}/${episodeId}/${outputFile}`}
          type="video/mp4"
        />
      </video>
    </div>
  );
}
