import { useState, useRef } from 'react';

interface AudioPlayerProps {
  src: string;
  durationMs: number;
}

export default function AudioPlayer({ src, durationMs }: AudioPlayerProps) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const toggle = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio(src);
      audioRef.current.onended = () => setPlaying(false);
    }
    if (playing) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setPlaying(false);
    } else {
      audioRef.current.play();
      setPlaying(true);
    }
  };

  const durationStr = (durationMs / 1000).toFixed(1) + 's';

  return (
    <button
      onClick={toggle}
      style={{
        background: 'none',
        border: '1px solid var(--accent)',
        color: 'var(--accent)',
        fontFamily: 'var(--font-mono)',
        fontSize: 11,
        padding: '2px 8px',
        cursor: 'pointer',
        borderRadius: 2,
        whiteSpace: 'nowrap',
      }}
      title={playing ? 'Stop' : `Play (${durationStr})`}
    >
      {playing ? '■' : '▶'} {durationStr}
    </button>
  );
}
