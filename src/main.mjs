import { join, resolve } from 'node:path';
import { homedir } from 'node:os';
import { createApp } from './server.mjs';

const dataDir = resolve(process.env.REZZO_DATA_DIR || join(homedir(), '.rezzoloom'));
const port = Number(process.env.REZZO_PORT || 4310);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('REZZO_PORT must be between 1 and 65535.');
const app = await createApp({ dataDir });
app.on('error', error => { console.error(`Rezzo could not start: ${error.message}`); process.exitCode = 1; });
app.listen(port, '127.0.0.1', () => console.log(`Rezzo: http://127.0.0.1:${port}\nLocal data: ${dataDir}\nOperator-reviewed clip builds. Ctrl+C to stop.`));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { app.close(); app.closeIdleConnections(); });
