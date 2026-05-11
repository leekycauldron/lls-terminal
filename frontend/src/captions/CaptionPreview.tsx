import type { CaptionConfig, TextStyle } from './types';

interface CaptionPreviewProps {
  config: CaptionConfig;
}

const SCALE = 4;
const W = 1080 / SCALE; // 270
const H = 1920 / SCALE; // 480

const SAMPLE_TEXT: Record<string, string> = {
  question: '\u8fd9\u662f\u4ec0\u4e48\uff1f',
  answer_word: '\u82f9\u679c',
  answer_pinyin: 'p\u00edng gu\u01d2',
  answer_english: 'apple',
  sentence_zh: '\u6211\u559c\u6b22\u5403\u82f9\u679c\u3002',
  sentence_pinyin: 'w\u01d2 x\u01d0 huan ch\u012b p\u00edng gu\u01d2.',
  sentence_en: 'I like to eat apples.',
};

function buildTextShadow(style: TextStyle): string {
  const shadows: string[] = [];

  // Border effect: 8 directional offsets
  if (style.border_width > 0) {
    const bw = style.border_width / SCALE;
    const bc = style.border_color;
    const offsets = [
      [bw, 0], [-bw, 0], [0, bw], [0, -bw],
      [bw, bw], [-bw, bw], [bw, -bw], [-bw, -bw],
    ];
    for (const [ox, oy] of offsets) {
      shadows.push(`${ox}px ${oy}px 0 ${bc}`);
    }
  }

  // Drop shadow
  if (style.shadow_x !== 0 || style.shadow_y !== 0) {
    shadows.push(`${style.shadow_x / SCALE}px ${style.shadow_y / SCALE}px 2px ${style.shadow_color}`);
  }

  return shadows.join(', ');
}

function TextElement({ style, elementKey }: { style: TextStyle; elementKey: string }) {
  const text = SAMPLE_TEXT[elementKey] || '';
  const fontSize = style.font_size / SCALE;
  const yPos = style.y_position / SCALE;

  const align =
    style.alignment === 'left' ? 'flex-start' :
    style.alignment === 'right' ? 'flex-end' : 'center';

  const textShadow = buildTextShadow(style);

  return (
    <div
      style={{
        position: 'absolute',
        top: yPos,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: align,
        padding: `0 ${5}px`,
      }}
    >
      <span
        style={{
          fontSize,
          fontWeight: style.font_weight === 'bold' ? 700 : 400,
          color: style.font_color,
          opacity: style.opacity,
          textShadow: textShadow || undefined,
          whiteSpace: 'nowrap',
          lineHeight: 1.2,
          ...(style.background_color ? {
            backgroundColor: style.background_color,
            padding: `${style.background_padding / SCALE}px`,
          } : {}),
        }}
      >
        {text}
      </span>
    </div>
  );
}

export default function CaptionPreview({ config }: CaptionPreviewProps) {
  const elements = [
    { key: 'question', style: config.question },
    { key: 'answer_word', style: config.answer_word },
    { key: 'answer_pinyin', style: config.answer_pinyin },
    { key: 'answer_english', style: config.answer_english },
    { key: 'sentence_zh', style: config.sentence_zh },
    { key: 'sentence_pinyin', style: config.sentence_pinyin },
    { key: 'sentence_en', style: config.sentence_en },
  ];

  return (
    <div
      style={{
        width: W,
        height: H,
        background: '#000',
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 4,
        border: '1px solid var(--border-color)',
        fontFamily: 'sans-serif',
        flexShrink: 0,
      }}
    >
      {/* Image placeholder (top half) */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 1080 / SCALE,
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span style={{ color: '#334', fontSize: 11 }}>[image]</span>
      </div>

      {/* Text elements */}
      {elements.map((el) => (
        <TextElement key={el.key} style={el.style} elementKey={el.key} />
      ))}
    </div>
  );
}
