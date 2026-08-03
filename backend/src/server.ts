import { createServer } from 'node:http';

import { createApp } from './app';
import { loadConfig } from './config/env';

export function startServer(config = loadConfig()) {
  const app = createApp(config);
  const server = createServer(app);

  server.listen(config.apiPort, () => {
    console.log(`deManage API running on ${config.apiPort}`);
  });

  return server;
}

if (require.main === module) {
  startServer();
}
