export interface EpisodeSummary {
  id: string;
  title: string;
  summary: string;
  date: string;
}

export interface ScriptLine {
  id: string;
  order: number;
  character_id: string;
  text_zh: string;
  text_en: string;
  text_pinyin: string;
  direction?: string | null;
}

export interface ContextData {
  characters: Record<string, {
    role: string;
    personality: string;
    visual: string;
    voice_id: string;
    reference: string;
  }>;
  settings: Record<string, {
    name_zh: string;
    name_en: string;
    reference: string;
  }>;
  episode_history: EpisodeSummary[];
}

export interface ScriptData {
  seed: string;
  idea: string;
  lines: ScriptLine[];
  approved: boolean;
}

export interface TTSLineStatus {
  line_id: string;
  audio_file: string;
  duration_ms: number;
  generated: boolean;
}

export interface TTSData {
  line_statuses: TTSLineStatus[];
  mode: string;
  speed: number;
  approved: boolean;
}

export interface Scene {
  id: string;
  order: number;
  prompt: string;
  setting_id: string;
  character_ids: string[];
  line_ids: string[];
  image_file: string;
  generated: boolean;
}

export interface ScenesData {
  scenes: Scene[];
  mode: string;
  approved: boolean;
}

export interface TimelineClip {
  id: string;
  type: string;
  source_id: string;
  source_file: string;
  track: string;
  start_ms: number;
  duration_ms: number;
  order: number;
  zoom_start: number;
  zoom_end: number;
}

export interface TimelineData {
  clips: TimelineClip[];
  total_duration_ms: number;
  output_file: string;
  approved: boolean;
}

export interface ThumbnailData {
  prompt: string;
  image_file: string;
  generated: boolean;
  approved: boolean;
}

export interface EpisodeState {
  id: string;
  current_stage: string;
  art_style: string;
  context: ContextData;
  script: ScriptData;
  tts: TTSData;
  scenes: ScenesData;
  timeline: TimelineData;
  thumbnail: ThumbnailData;
}

export interface StageComponentProps {
  episodeId: string;
  onAdvance: () => void;
}

export interface StageRegistryEntry {
  id: string;
  order: number;
  name: string;
  component: React.ComponentType<StageComponentProps>;
}
