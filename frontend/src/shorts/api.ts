import client from '../api/client';
import type { ShortSummary, ShortState, ShortConfig, FlashcardItem } from './types';

// --- CRUD ---

export async function listShorts(): Promise<ShortSummary[]> {
  const { data } = await client.get('/shorts');
  return data;
}

export async function createShort(theme?: string, topic?: string): Promise<ShortSummary> {
  const { data } = await client.post('/shorts', { theme: theme || 'whats_this', topic: topic || '' });
  return data;
}

export async function getShort(shortId: string): Promise<ShortState> {
  const { data } = await client.get(`/shorts/${shortId}`);
  return data;
}

export async function deleteShort(shortId: string): Promise<{ deleted: string }> {
  const { data } = await client.delete(`/shorts/${shortId}`);
  return data;
}

// --- Setup ---

export async function updateConfig(shortId: string, config: ShortConfig): Promise<ShortConfig> {
  const { data } = await client.put(`/shorts/${shortId}/config`, config);
  return data;
}

export async function updateSetup(shortId: string, updates: { topic?: string; theme?: string }): Promise<ShortState> {
  const { data } = await client.put(`/shorts/${shortId}/setup`, updates);
  return data;
}

// --- Content ---

export async function generateContent(shortId: string, count?: number): Promise<{ items: FlashcardItem[] }> {
  const { data } = await client.post(`/shorts/${shortId}/generate-content`, { count: count || 6 });
  return data;
}

export async function updateItems(shortId: string, items: FlashcardItem[]): Promise<{ items: FlashcardItem[] }> {
  const { data } = await client.put(`/shorts/${shortId}/items`, items);
  return data;
}

export async function approveContent(shortId: string): Promise<{ content_approved: boolean; current_step: string }> {
  const { data } = await client.post(`/shorts/${shortId}/approve-content`);
  return data;
}

// --- Assets ---

export async function generateImage(shortId: string, itemId: string): Promise<FlashcardItem> {
  const { data } = await client.post(`/shorts/${shortId}/generate-image/${itemId}`);
  return data;
}

export async function generateAllImages(shortId: string): Promise<{ items: FlashcardItem[] }> {
  const { data } = await client.post(`/shorts/${shortId}/generate-all-images`);
  return data;
}

export async function revertImage(shortId: string, itemId: string): Promise<FlashcardItem> {
  const { data } = await client.delete(`/shorts/${shortId}/revert-image/${itemId}`);
  return data;
}

export async function generateTTS(shortId: string): Promise<ShortState> {
  const { data } = await client.post(`/shorts/${shortId}/generate-tts`);
  return data;
}

export async function approveAssets(shortId: string): Promise<{ assets_approved: boolean; current_step: string }> {
  const { data } = await client.post(`/shorts/${shortId}/approve-assets`);
  return data;
}

// --- Export ---

export async function exportVideo(shortId: string): Promise<{ output_file: string }> {
  const { data } = await client.post(`/shorts/${shortId}/export`);
  return data;
}

export async function approveShort(shortId: string): Promise<{ completed: boolean }> {
  const { data } = await client.post(`/shorts/${shortId}/approve`);
  return data;
}
