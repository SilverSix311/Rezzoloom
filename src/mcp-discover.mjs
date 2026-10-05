// Operator-only diagnostic CLI. No arbitrary process launch or vendor tool proxy is exposed over HTTP.
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

export async function discoverMcp(command, args = [], env = {}) {
  const client = new Client({ name: 'rezzoloom-discovery', version: '0.2.0' });
  const transport = new StdioClientTransport({ command, args, env, stderr: 'ignore' });
  try {
    await client.connect(transport, { timeout: 10000 });
    const tools = []; let cursor;
    for (let page = 0; page < 20; page++) {
      const result = await client.listTools(cursor ? { cursor } : {}, { timeout: 10000 });
      tools.push(...result.tools); cursor = result.nextCursor;
      if (!cursor) return { schemaVersion: 1, server: client.getServerVersion(), tools };
    }
    throw new Error('MCP catalog exceeded pagination limit.');
  } finally { await client.close(); await transport.close(); }
}
if (process.argv[1]?.endsWith('mcp-discover.mjs')) {
  const [command, ...args] = process.argv.slice(2);
  if (!command) { console.error('Usage: npm run mcp:discover -- /path/to/vendor-server [args...]'); process.exitCode = 1; }
  else {
    const env = Object.fromEntries(['WINEPREFIX', 'WINEDEBUG', 'WINEDLLOVERRIDES'].filter(key => process.env[key]).map(key => [key, process.env[key]]));
    try { console.log(JSON.stringify(await discoverMcp(command, args, env), null, 2)); }
    catch (error) { console.error(`MCP discovery failed: ${error.message}`); process.exitCode = 1; }
  }
}
