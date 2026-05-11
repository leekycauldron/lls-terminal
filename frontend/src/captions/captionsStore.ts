import { create } from 'zustand';
import type { CaptionConfig, TextStyle, TextElementKey } from './types';

interface CaptionsStore {
  config: CaptionConfig | null;
  presets: Record<string, CaptionConfig>;
  dirty: boolean;

  setConfig: (config: CaptionConfig) => void;
  setPresets: (presets: Record<string, CaptionConfig>) => void;
  updateTextStyle: (key: TextElementKey, updates: Partial<TextStyle>) => void;
  applyPreset: (name: string) => void;
  markClean: () => void;
}

export const useCaptionsStore = create<CaptionsStore>((set, get) => ({
  config: null,
  presets: {},
  dirty: false,

  setConfig: (config) => set({ config, dirty: false }),

  setPresets: (presets) => set({ presets }),

  updateTextStyle: (key, updates) =>
    set((s) => {
      if (!s.config) return {};
      return {
        config: {
          ...s.config,
          [key]: { ...s.config[key], ...updates },
        },
        dirty: true,
      };
    }),

  applyPreset: (name) => {
    const preset = get().presets[name];
    if (preset) {
      set({ config: { ...preset }, dirty: true });
    }
  },

  markClean: () => set({ dirty: false }),
}));
