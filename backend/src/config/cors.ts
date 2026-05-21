const DEFAULT_ORIGINS = [
  'https://aviator-sand.vercel.app',
  'http://localhost:3000',
  'https://aviator.farcast.app',
];

export function getCorsOrigins(): (string | RegExp)[] {
  const origins: (string | RegExp)[] = [...DEFAULT_ORIGINS];

  if (process.env.CORS_ORIGINS) {
    for (const origin of process.env.CORS_ORIGINS.split(',')) {
      const trimmed = origin.trim();
      if (trimmed) origins.push(trimmed);
    }
  }

  if (process.env.NGROK_URL) {
    origins.push(process.env.NGROK_URL);
  }

  origins.push(/^https:\/\/.*\.ngrok(?:-free)?\.app$/);

  return origins;
}
