export interface ShortSummary {
  id: string;
  theme: string;
  topic: string;
  title: string;
  date: string;
  completed: boolean;
}

export interface ShortConfig {
  voice_id: string;
  tts_speed: number;
  music_file: string;
  music_volume: number;
  art_style: string;
}

export interface FlashcardItem {
  id: string;
  order: number;
  word_zh: string;
  word_pinyin: string;
  word_en: string;
  sentence_zh: string;
  sentence_pinyin: string;
  sentence_en: string;
  image_prompt: string;
  image_file: string;
  image_generated: boolean;
  tts_answer_file: string;
  tts_sentence_file: string;
  tts_answer_duration_ms: number;
  tts_sentence_duration_ms: number;
  tts_generated: boolean;
}

export interface ShortState {
  id: string;
  theme: string;
  topic: string;
  title: string;
  current_step: string;
  config: ShortConfig;
  items: FlashcardItem[];
  content_approved: boolean;
  assets_approved: boolean;
  tts_question_file: string;
  tts_question_duration_ms: number;
  output_file: string;
  completed: boolean;
}
