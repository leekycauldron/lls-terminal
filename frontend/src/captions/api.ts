import client from '../api/client';
import type { CaptionConfig } from './types';

export async function getCaptionsConfig(): Promise<CaptionConfig> {
  const { data } = await client.get('/shorts/captions-config');
  return data;
}

export async function updateCaptionsConfig(config: CaptionConfig): Promise<CaptionConfig> {
  const { data } = await client.put('/shorts/captions-config', config);
  return data;
}

export async function listCaptionsPresets(): Promise<Record<string, CaptionConfig>> {
  const { data } = await client.get('/shorts/captions-presets');
  return data;
}
