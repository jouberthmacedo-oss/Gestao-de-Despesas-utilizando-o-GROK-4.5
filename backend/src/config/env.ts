import dotenv from 'dotenv';

dotenv.config();

export type AppConfig = {
  nodeEnv: string;
  apiPort: number;
  appUrl: string;
};

const DEFAULT_API_PORT = 8888;
const DEFAULT_APP_URL = 'http://localhost:5180';

export function parseApiPort(value: string | undefined) {
  if (value === undefined) return DEFAULT_API_PORT;

  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('API_PORT must be an integer between 1 and 65535');
  }

  return port;
}

function parseAppUrl(value: string | undefined) {
  const appUrl = value?.trim() || DEFAULT_APP_URL;

  try {
    const url = new URL(appUrl);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
  } catch {
    throw new Error('APP_URL must be a valid http(s) URL');
  }

  return appUrl;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return {
    nodeEnv: env.NODE_ENV?.trim() || 'development',
    apiPort: parseApiPort(env.API_PORT),
    appUrl: parseAppUrl(env.APP_URL),
  };
}
