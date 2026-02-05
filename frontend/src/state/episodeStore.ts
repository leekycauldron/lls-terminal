import { create } from 'zustand';
import type {
  EpisodeState,
  ContextData,
  ScriptLine,
  TTSData,
  TTSLineStatus,
  ScenesData,
  Scene,
  TimelineData,
  TimelineClip,
} from '../stages/types';

interface EpisodeStore {
  episodeId: string | null;
  state: EpisodeState | null;
  currentStage: string;

  setEpisodeId: (id: string) => void;
  setState: (state: EpisodeState) => void;
  setCurrentStage: (stage: string) => void;
  setContext: (context: ContextData) => void;
  setScriptLines: (lines: ScriptLine[]) => void;
  setScriptIdea: (idea: string) => void;
  setScriptSeed: (seed: string) => void;
  setScriptApproved: (approved: boolean) => void;

  // TTS
  setTTSData: (tts: TTSData) => void;
  setTTSLineStatus: (lineId: string, status: Partial<TTSLineStatus>) => void;
  setTTSMode: (mode: string) => void;
  setTTSApproved: (approved: boolean) => void;

  // Scenes
  setScenesData: (scenes: ScenesData) => void;
  setScenes: (scenes: Scene[]) => void;
  updateScene: (sceneId: string, updates: Partial<Scene>) => void;
  setScenesApproved: (approved: boolean) => void;

  // Timeline
  setTimelineData: (timeline: TimelineData) => void;
  setTimelineClips: (clips: TimelineClip[]) => void;
  updateClip: (clipId: string, updates: Partial<TimelineClip>) => void;
}

export const useEpisodeStore = create<EpisodeStore>((set) => ({
  episodeId: null,
  state: null,
  currentStage: 'stage_0_context',

  setEpisodeId: (id) => set({ episodeId: id }),

  setState: (state) => set({ state, currentStage: state.current_stage }),

  setCurrentStage: (stage) =>
    set((s) => ({
      currentStage: stage,
      state: s.state ? { ...s.state, current_stage: stage } : null,
    })),

  setContext: (context) =>
    set((s) => ({
      state: s.state ? { ...s.state, context } : null,
    })),

  setScriptLines: (lines) =>
    set((s) => ({
      state: s.state
        ? { ...s.state, script: { ...s.state.script, lines } }
        : null,
    })),

  setScriptIdea: (idea) =>
    set((s) => ({
      state: s.state
        ? { ...s.state, script: { ...s.state.script, idea } }
        : null,
    })),

  setScriptSeed: (seed) =>
    set((s) => ({
      state: s.state
        ? { ...s.state, script: { ...s.state.script, seed } }
        : null,
    })),

  setScriptApproved: (approved) =>
    set((s) => ({
      state: s.state
        ? { ...s.state, script: { ...s.state.script, approved } }
        : null,
    })),

  // TTS
  setTTSData: (tts) =>
    set((s) => ({
      state: s.state ? { ...s.state, tts } : null,
    })),

  setTTSLineStatus: (lineId, status) =>
    set((s) => {
      if (!s.state) return {};
      const statuses = s.state.tts.line_statuses.map((ls) =>
        ls.line_id === lineId ? { ...ls, ...status } : ls
      );
      return { state: { ...s.state, tts: { ...s.state.tts, line_statuses: statuses } } };
    }),

  setTTSMode: (mode) =>
    set((s) => ({
      state: s.state ? { ...s.state, tts: { ...s.state.tts, mode } } : null,
    })),

  setTTSApproved: (approved) =>
    set((s) => ({
      state: s.state ? { ...s.state, tts: { ...s.state.tts, approved } } : null,
    })),

  // Scenes
  setScenesData: (scenes) =>
    set((s) => ({
      state: s.state ? { ...s.state, scenes } : null,
    })),

  setScenes: (scenes) =>
    set((s) => ({
      state: s.state ? { ...s.state, scenes: { ...s.state.scenes, scenes } } : null,
    })),

  updateScene: (sceneId, updates) =>
    set((s) => {
      if (!s.state) return {};
      const scenes = s.state.scenes.scenes.map((sc) =>
        sc.id === sceneId ? { ...sc, ...updates } : sc
      );
      return { state: { ...s.state, scenes: { ...s.state.scenes, scenes } } };
    }),

  setScenesApproved: (approved) =>
    set((s) => ({
      state: s.state ? { ...s.state, scenes: { ...s.state.scenes, approved } } : null,
    })),

  // Timeline
  setTimelineData: (timeline) =>
    set((s) => ({
      state: s.state ? { ...s.state, timeline } : null,
    })),

  setTimelineClips: (clips) =>
    set((s) => ({
      state: s.state ? { ...s.state, timeline: { ...s.state.timeline, clips } } : null,
    })),

  updateClip: (clipId, updates) =>
    set((s) => {
      if (!s.state) return {};
      const clips = s.state.timeline.clips.map((c) =>
        c.id === clipId ? { ...c, ...updates } : c
      );
      return { state: { ...s.state, timeline: { ...s.state.timeline, clips } } };
    }),
}));
