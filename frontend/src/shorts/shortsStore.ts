import { create } from 'zustand';
import type { ShortState, FlashcardItem } from './types';

interface ShortsStore {
  shortId: string | null;
  state: ShortState | null;
  currentStep: string;

  setShortId: (id: string | null) => void;
  setState: (state: ShortState | null) => void;
  setCurrentStep: (step: string) => void;
  setItems: (items: FlashcardItem[]) => void;
  updateItem: (itemId: string, updates: Partial<FlashcardItem>) => void;
}

export const useShortsStore = create<ShortsStore>((set) => ({
  shortId: null,
  state: null,
  currentStep: 'setup',

  setShortId: (id) => set({ shortId: id }),

  setState: (state) =>
    set({ state, currentStep: state?.current_step ?? 'setup' }),

  setCurrentStep: (step) =>
    set((s) => ({
      currentStep: step,
      state: s.state ? { ...s.state, current_step: step } : null,
    })),

  setItems: (items) =>
    set((s) => ({
      state: s.state ? { ...s.state, items } : null,
    })),

  updateItem: (itemId, updates) =>
    set((s) => {
      if (!s.state) return {};
      const items = s.state.items.map((i) =>
        i.id === itemId ? { ...i, ...updates } : i
      );
      return { state: { ...s.state, items } };
    }),
}));
