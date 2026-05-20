import { gameSettingsService } from '../game-settings.service.js';
import type { CachedGameSettings } from './types.js';
import { toCachedSettings } from './types.js';

const CACHE_TTL_MS = 30_000;

let cached: CachedGameSettings | null = null;
let cachedAt = 0;

export async function getCachedGameSettings(): Promise<CachedGameSettings> {
  const now = Date.now();
  if (cached && now - cachedAt < CACHE_TTL_MS) {
    return cached;
  }

  const settings = await gameSettingsService.getSettings();
  cached = toCachedSettings(settings);
  cachedAt = now;
  return cached;
}

export function invalidateSettingsCache(): void {
  cached = null;
  cachedAt = 0;
}
