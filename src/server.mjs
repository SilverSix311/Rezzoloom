import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { openTwitch } from './twitch.mjs';
import { openPlayback } from './playback.mjs';
import { openQueue, LOCAL_OPERATOR } from './queue-store.mjs';
import { openStore } from './store.mjs';
import { openStudio, suggest } from './studio.mjs';
import { AppError, inspectArena } from './arena.mjs';

const assets = new Map([
  ...[400, 600, 800].map(weight => [`/fonts/manrope-${weight}.ttf`, [`fonts/manrope-${weight}.ttf`, 'font/ttf']]),
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
  ['/style.css', ['style.css', 'text/css; charset=utf-8']],
]);
async function body(req) {
  if (!(req.headers['content-type'] ?? '').startsWith('application/json')) throw new AppError('JSON content type required.', 415);
  let size = 0; const parts = [];
  for await (const chunk of req) { size += chunk.length; if (size > 16_384) throw new AppError('Request too large.', 413); parts.push(chunk); }
  try { return JSON.parse(Buffer.concat(parts).toString('utf8')); } catch { throw new AppError('Invalid JSON.'); }
}
export async function createApp({ dataDir, probe = inspectArena, studioOptions, playbackOptions, twitchOptions } = {}) {
  const store = await openStore(dataDir);
  const studio = await openStudio(dataDir, studioOptions);
  const queue = await openQueue(dataDir, { resolveRecipe: id => studio.get(id) });
  const twitch = await openTwitch(dataDir, {queue,store,...twitchOptions});
  const token = randomBytes(32).toString('hex');
  const statuses = new Map(); const busy = new Set();
  const playback = await openPlayback({ queue, store, studio, busy, ...playbackOptions });
  const server = createServer({ requestTimeout: 10_000, headersTimeout: 10_000 }, async (req, res) => {
    const send = (status, value) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(value)); };
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    try {
      const port = server.address()?.port;
      const allowed = [`127.0.0.1:${port}`, `localhost:${port}`];
      if (!allowed.includes(req.headers.host)) throw new AppError('Invalid host.', 403);
      const origin = `http://${req.headers.host}`;
      if (req.headers.origin && req.headers.origin !== origin) throw new AppError('Cross-origin requests are not allowed.', 403);
      if (req.headers['sec-fetch-site'] && !['same-origin', 'none'].includes(req.headers['sec-fetch-site'])) throw new AppError('Cross-site requests are not allowed.', 403);
      const path = new URL(req.url, origin).pathname;
      if (req.method === 'GET' && assets.has(path)) {
        const [file, type] = assets.get(path);
        res.writeHead(200, { 'Content-Type': type });
        res.end(await readFile(fileURLToPath(new URL(`../public/${file}`, import.meta.url)))); return;
      }
      if (req.method === 'GET' && path === '/api/session') return send(200, { token, mode: 'local', version: '0.2.0' });
      if (req.headers.authorization !== `Bearer ${token}`) throw new AppError('Local session required. Reload the console.', 401);
      if (req.method === 'GET' && path === '/api/twitch') return send(200, twitch.status());
      if (req.method === 'POST' && path === '/api/twitch') {
        const input = await body(req);
        if (!input || Object.keys(input).some(k => !['operation','config'].includes(k))) throw new AppError('Unexpected Twitch fields.');
        return send(200, await twitch.command(input.operation,input.config));
      }
      if (req.method === 'GET' && path === '/api/instances') return send(200, store.list().map(item => ({ ...item, status: statuses.get(item.id) ?? { state: 'unchecked' } })));
      if (req.method === 'POST' && path === '/api/instances') return send(201, await store.add(await body(req)));
      if (req.method === 'GET' && path === '/api/gallery') return send(200, studio.list());
      const playbackMatch = path.match(/^\/api\/instances\/([a-f0-9-]+)\/playback$/);
      if (playbackMatch && req.method === 'POST') {
        const input = await body(req);
        if (!input || Object.keys(input).some(x => !['operation', 'confirmed'].includes(x)) || (input.operation === 'resume' && input.confirmed !== true)) throw new AppError('Explicit approval is required to start queued playback.');
        return send(200, await playback.command(playbackMatch[1], input.operation));
      }
      const queueMatch = path.match(/^\/api\/instances\/([a-f0-9-]+)\/queue$/);
      if (queueMatch) {
        const id = queueMatch[1]; store.get(id);
        if (req.method === 'GET') return send(200, queue.snapshot(id));
        if (req.method === 'POST') return send(200, await queue.command(id, await body(req), LOCAL_OPERATOR));
      }
      const recipeMatch = path.match(/^\/api\/gallery\/([a-f0-9-]+)$/);
      if (req.method === 'GET' && recipeMatch) return send(200, studio.get(recipeMatch[1]));
      const studioMatch = path.match(/^\/api\/instances\/([a-f0-9-]+)\/(catalog|suggest|plan|execute)$/);
      if (studioMatch && req.method === 'POST') {
        const [, id, action] = studioMatch;
        const item = store.get(id);
        if (busy.has(id) || busy.size >= 4) throw new AppError('This connection is busy. Try again shortly.', 409);
        busy.add(id);
        try {
          if (action === 'catalog') return send(200, await studio.discover(item.endpoint));
          const input = await body(req);
          if (action === 'suggest') {
            if (typeof input?.prompt !== 'string' || input.prompt.length > 2000) throw new AppError('Prompt must be at most 2000 characters.');
            const available = await studio.discover(item.endpoint);
            return send(200, { planner: 'catalog-keyword-matcher', sources: suggest(input.prompt, available.sources), effects: suggest(input.prompt, available.effects) });
          }
          if (action === 'plan') return send(201, await studio.plan(item, input));
          return send(200, await studio.execute(input?.planId, item, input?.approved));
        } finally { busy.delete(id); }
      }
      const match = path.match(/^\/api\/instances\/([a-f0-9-]+)(?:\/(inspect|snapshot))?$/);
      if (match) {
        const [, id, action] = match;
        const item = store.get(id);
        if (!action && req.method === 'DELETE') { if (twitch.usesTarget(id)) throw new AppError('Stop Twitch listening before removing its target.',409); if (queue.snapshot(id).requests.some(x => ['pending', 'playing'].includes(x.status))) throw new AppError('Remove pending requests and reconcile playback before removing this connection.', 409); if (busy.has(id)) throw new AppError('Wait for this connection check to finish.', 409); await store.remove(id); statuses.delete(id); return send(200, { removed: true }); }
        if (req.method === 'POST' && ['inspect', 'snapshot'].includes(action)) {
          if (busy.has(id) || busy.size >= 4) throw new AppError('A connection check is already running. Try again shortly.', 409);
          busy.add(id);
          try {
            const result = await probe(item.endpoint);
            const status = { state: 'connected', ...result.summary };
            statuses.set(id, status);
            if (action === 'inspect') return send(200, status);
            return send(200, { schemaVersion: 1, kind: 'rezzo-arena-state-snapshot', replayable: false, instance: item, capturedAt: result.summary.checkedAt, product: result.product, composition: result.composition });
          } catch (error) {
            statuses.set(id, { state: 'offline', checkedAt: new Date().toISOString(), message: error instanceof AppError ? error.message : 'Arena check failed.' });
            throw error;
          } finally { busy.delete(id); }
        }
      }
      throw new AppError('Route not found.', 404);
    } catch (error) { if (!res.headersSent) send(error.status ?? 500, { error: error.status ? error.message : 'Local service error. Check the data directory is writable.' }); else res.end(); }
  });
  server.on('close', () => { playback.close(); twitch.close(); });
  return server;
}
