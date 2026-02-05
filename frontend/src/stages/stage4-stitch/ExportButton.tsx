interface ExportButtonProps {
  onExport: () => void;
  exporting: boolean;
  outputFile: string;
  episodeId: string;
}

export default function ExportButton({
  onExport,
  exporting,
  outputFile,
  episodeId,
}: ExportButtonProps) {
  const downloadUrl = outputFile
    ? `http://localhost:8000/api/episodes/${episodeId}/timeline/download`
    : '';

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <button
        onClick={onExport}
        disabled={exporting}
        style={{
          background: 'none',
          border: '1px solid var(--accent)',
          color: 'var(--accent)',
          padding: '4px 12px',
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
          cursor: exporting ? 'wait' : 'pointer',
          borderRadius: 2,
          opacity: exporting ? 0.5 : 1,
        }}
      >
        {exporting ? 'Exporting...' : 'Export MP4'}
      </button>

      {outputFile && (
        <a
          href={downloadUrl}
          download
          style={{
            color: 'var(--accent)',
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            textDecoration: 'underline',
          }}
        >
          Download
        </a>
      )}
    </div>
  );
}
