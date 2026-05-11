export interface TextStyle {
  font_size: number;
  font_color: string;
  font_weight: 'bold' | 'regular';
  border_width: number;
  border_color: string;
  shadow_x: number;
  shadow_y: number;
  shadow_color: string;
  y_position: number;
  alignment: 'left' | 'center' | 'right';
  opacity: number;
  background_color: string;
  background_padding: number;
}

export interface CaptionConfig {
  preset_name: string;
  question: TextStyle;
  answer_word: TextStyle;
  answer_pinyin: TextStyle;
  answer_english: TextStyle;
  sentence_zh: TextStyle;
  sentence_pinyin: TextStyle;
  sentence_en: TextStyle;
}

export const TEXT_ELEMENT_KEYS = [
  'question',
  'answer_word',
  'answer_pinyin',
  'answer_english',
  'sentence_zh',
  'sentence_pinyin',
  'sentence_en',
] as const;

export type TextElementKey = (typeof TEXT_ELEMENT_KEYS)[number];

export const TEXT_ELEMENT_LABELS: Record<TextElementKey, string> = {
  question: 'Question',
  answer_word: 'Answer Word',
  answer_pinyin: 'Answer Pinyin',
  answer_english: 'Answer English',
  sentence_zh: 'Sentence (Chinese)',
  sentence_pinyin: 'Sentence (Pinyin)',
  sentence_en: 'Sentence (English)',
};
