import client from './client';
import type {
  EpisodeSummary,
  EpisodeState,
  ContextData,
  ScriptLine,
  TTSData,
  TTSLineStatus,
  Scene,
  ScenesData,
  TimelineData,
  TimelineClip,
  ThumbnailData,
} from '../stages/types';

// --- Episodes ---

export async function listEpisodes(): Promise<EpisodeSummary[]> {
  const { data } = await client.get('/episodes');
  return data;
}

export async function createEpisode(title?: string): Promise<EpisodeSummary> {
  const { data } = await client.post('/episodes', { title: title || '' });
  return data;
}

export async function getEpisode(epId: string): Promise<EpisodeState> {
  const { data } = await client.get(`/episodes/${epId}`);
  return data;
}

export async function deleteEpisode(epId: string): Promise<{ deleted: string }> {
  const { data } = await client.delete(`/episodes/${epId}`);
  return data;
}

export async function unapproveStage(epId: string, stage: string): Promise<{ stage: string; approved: boolean }> {
  const { data } = await client.post(`/episodes/${epId}/unapprove`, { stage });
  return data;
}

// --- Stages ---

export async function listStages(): Promise<{ id: string; order: number; name: string }[]> {
  const { data } = await client.get('/stages');
  return data;
}

// --- Context (Stage 0) ---

export async function loadContext(epId: string): Promise<ContextData> {
  const { data } = await client.get(`/episodes/${epId}/context`);
  return data;
}

// --- Script (Stage 1) ---

export async function checkSeed(epId: string, seed: string) {
  const { data } = await client.post(`/episodes/${epId}/script/check-seed`, { seed });
  return data as {
    has_conflicts: boolean;
    conflicts: { episode_id: string; episode_title: string; similarity: string }[];
    suggestion: string;
  };
}

export async function generateIdea(epId: string, seed: string) {
  const { data } = await client.post(`/episodes/${epId}/script/generate-idea`, { seed });
  return data as {
    idea: string;
    characters_used: string[];
    settings_used: string[];
  };
}

export async function generateScript(epId: string, idea: string): Promise<ScriptLine[]> {
  const { data } = await client.post(`/episodes/${epId}/script/generate-script`, { idea });
  return data;
}

export async function updateLines(epId: string, lines: ScriptLine[]): Promise<ScriptLine[]> {
  const { data } = await client.put(`/episodes/${epId}/script/lines`, lines);
  return data;
}

export async function addLine(epId: string, position: number, line: ScriptLine): Promise<ScriptLine[]> {
  const { data } = await client.post(`/episodes/${epId}/script/lines`, { position, line });
  return data;
}

export async function deleteLine(epId: string, lineId: string): Promise<ScriptLine[]> {
  const { data } = await client.delete(`/episodes/${epId}/script/lines/${lineId}`);
  return data;
}

export async function approveScript(epId: string) {
  const { data } = await client.post(`/episodes/${epId}/script/approve`);
  return data as { approved: boolean; current_stage: string };
}

// --- TTS (Stage 2) ---

export async function initializeTTS(epId: string): Promise<TTSData> {
  const { data } = await client.post(`/episodes/${epId}/tts/initialize`);
  return data;
}

export async function generateTTSLine(epId: string, lineId: string): Promise<TTSLineStatus> {
  const { data } = await client.post(`/episodes/${epId}/tts/generate/${lineId}`);
  return data;
}

export async function generateAllTTS(epId: string): Promise<TTSLineStatus[]> {
  const { data } = await client.post(`/episodes/${epId}/tts/generate-all`);
  return data;
}

export async function revertTTSLine(epId: string, lineId: string) {
  const { data } = await client.delete(`/episodes/${epId}/tts/revert/${lineId}`);
  return data;
}

export async function setTTSMode(epId: string, mode: string) {
  const { data } = await client.put(`/episodes/${epId}/tts/mode`, { mode });
  return data;
}

export async function setTTSSpeed(epId: string, speed: number): Promise<{ speed: number }> {
  const { data } = await client.put(`/episodes/${epId}/tts/speed`, { speed });
  return data;
}

export async function updateTTSLines(epId: string, lines: ScriptLine[]): Promise<ScriptLine[]> {
  const { data } = await client.put(`/episodes/${epId}/tts/lines`, lines);
  return data;
}

export async function addTTSLine(epId: string, position: number, line: ScriptLine): Promise<ScriptLine[]> {
  const { data } = await client.post(`/episodes/${epId}/tts/lines`, { position, line });
  return data;
}

export async function deleteTTSLine(epId: string, lineId: string): Promise<ScriptLine[]> {
  const { data } = await client.delete(`/episodes/${epId}/tts/lines/${lineId}`);
  return data;
}

export async function approveTTS(epId: string) {
  const { data } = await client.post(`/episodes/${epId}/tts/approve`);
  return data as { approved: boolean; current_stage: string };
}

// --- Scenes (Stage 3) ---

export async function setArtStyle(epId: string, artStyle: string) {
  const { data } = await client.put(`/episodes/${epId}/scenes/art-style`, { art_style: artStyle });
  return data as { art_style: string };
}

export async function generateSceneBreakdown(epId: string): Promise<ScenesData> {
  const { data } = await client.post(`/episodes/${epId}/scenes/generate-breakdown`);
  return data;
}

export async function updateScenes(epId: string, scenes: Scene[]): Promise<Scene[]> {
  const { data } = await client.put(`/episodes/${epId}/scenes/scenes`, scenes);
  return data;
}

export async function addScene(epId: string, scene: Scene): Promise<Scene[]> {
  const { data } = await client.post(`/episodes/${epId}/scenes/scenes`, scene);
  return data;
}

export async function deleteScene(epId: string, sceneId: string): Promise<Scene[]> {
  const { data } = await client.delete(`/episodes/${epId}/scenes/scenes/${sceneId}`);
  return data;
}

export async function generateSceneImage(epId: string, sceneId: string): Promise<Scene> {
  const { data } = await client.post(`/episodes/${epId}/scenes/generate-image/${sceneId}`);
  return data;
}

export async function generateAllSceneImages(epId: string): Promise<Scene[]> {
  const { data } = await client.post(`/episodes/${epId}/scenes/generate-all-images`);
  return data;
}

export async function revertSceneImage(epId: string, sceneId: string) {
  const { data } = await client.delete(`/episodes/${epId}/scenes/revert-image/${sceneId}`);
  return data;
}

export async function setScenesMode(epId: string, mode: string) {
  const { data } = await client.put(`/episodes/${epId}/scenes/mode`, { mode });
  return data;
}

export async function approveScenes(epId: string) {
  const { data } = await client.post(`/episodes/${epId}/scenes/approve`);
  return data as { approved: boolean; current_stage: string };
}

// --- Timeline (Stage 4) ---

export async function initializeTimeline(epId: string): Promise<TimelineData> {
  const { data } = await client.post(`/episodes/${epId}/timeline/initialize`);
  return data;
}

export async function updateTimelineClips(epId: string, clips: TimelineClip[]): Promise<TimelineClip[]> {
  const { data } = await client.put(`/episodes/${epId}/timeline/clips`, clips);
  return data;
}

export async function updateTimelineClip(epId: string, clipId: string, updates: Partial<TimelineClip>): Promise<TimelineClip> {
  const { data } = await client.put(`/episodes/${epId}/timeline/clips/${clipId}`, updates);
  return data;
}

export async function exportTimeline(epId: string) {
  const { data } = await client.post(`/episodes/${epId}/timeline/export`);
  return data as { output_file: string; total_duration_ms: number };
}

export async function approveTimeline(epId: string) {
  const { data } = await client.post(`/episodes/${epId}/timeline/approve`);
  return data as { approved: boolean; current_stage: string };
}

// --- Thumbnail (Stage 5) ---

export async function initializeThumbnail(epId: string): Promise<ThumbnailData> {
  const { data } = await client.post(`/episodes/${epId}/thumbnail/initialize`);
  return data;
}

export async function updateThumbnailPrompt(epId: string, prompt: string): Promise<ThumbnailData> {
  const { data } = await client.put(`/episodes/${epId}/thumbnail/prompt`, { prompt });
  return data;
}

export async function generateThumbnail(epId: string): Promise<ThumbnailData> {
  const { data } = await client.post(`/episodes/${epId}/thumbnail/generate`);
  return data;
}

export async function revertThumbnail(epId: string) {
  const { data } = await client.delete(`/episodes/${epId}/thumbnail/revert`);
  return data;
}

export async function approveThumbnail(epId: string) {
  const { data } = await client.post(`/episodes/${epId}/thumbnail/approve`);
  return data as { approved: boolean; current_stage: string };
}
