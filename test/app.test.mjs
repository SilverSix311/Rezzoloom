import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer, request as httpRequest } from 'node:http';
import { createApp } from '../src/server.mjs';
import { openStore } from '../src/store.mjs';
import { inspectArena, normalizeEndpoint, readJson } from '../src/arena.mjs';
async function fixture(t, probe) {
  const dir = await mkdtemp(join(tmpdir(), 'rezzo-test-'));
  const app = await createApp({ dataDir: dir, probe });
  await new Promise(resolve => app.listen(0, '127.0.0.1', resolve));
  t.after(async () => { await new Promise(resolve => { app.close(resolve); app.closeAllConnections(); }); await rm(dir, { recursive: true, force: true }); });
  const base = `http://127.0.0.1:${app.address().port}`;
  const { token } = await fetch(`${base}/api/session`).then(r => r.json());
  const request = (path, method = 'GET', data, headers = {}) => fetch(`${base}${path}`, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...headers }, ...(data ? { body: JSON.stringify(data) } : {}) });
  return { dir, base, request };
}
test('persistent connections, duplicates and isolated target dispatch', async t => {
  const calls = [];
  const { dir, request } = await fixture(t, async endpoint => {
    calls.push(endpoint);
    if (endpoint.endsWith(':9002')) throw Object.assign(new Error('Offline target'), { status: 502 });
    return { product: { name: 'Arena' }, composition: { layers: [] }, summary: { compositionName: 'A', layers: [], checkedAt: '2026-10-04T00:00:00Z' } };
  });
  const a = await request('/api/instances', 'POST', { name: 'A', endpoint: 'http://localhost:9001' }).then(r => r.json());
  const b = await request('/api/instances', 'POST', { name: 'B', endpoint: 'http://localhost:9002' }).then(r => r.json());
  assert.equal((await request('/api/instances', 'POST', { name: 'Duplicate', endpoint: 'http://localhost:9001/' })).status, 409);
  assert.equal((await request(`/api/instances/${a.id}/inspect`, 'POST')).status, 200);
  assert.equal((await request(`/api/instances/${b.id}/inspect`, 'POST')).status, 502);
  const list = await request('/api/instances').then(r => r.json());
  assert.equal(list[0].status.state, 'connected'); assert.equal(list[1].status.state, 'offline');
  assert.deepEqual(calls, ['http://localhost:9001', 'http://localhost:9002']);
  const snapshot = await request(`/api/instances/${a.id}/snapshot`, 'POST').then(r => r.json());
  assert.equal(snapshot.replayable, false); assert.equal(snapshot.instance.id, a.id);
  const reopened = await openStore(dir); assert.equal(reopened.list().length, 2);
  assert.equal((await request(`/api/instances/${b.id}`, 'DELETE')).status, 200);
  assert.equal((await openStore(dir)).list().length, 1);
});
test('local browser boundary, bearer authentication and validation', async t => {
  const { base, request } = await fixture(t);
  assert.equal((await fetch(`${base}/api/instances`)).status, 401);
  assert.equal((await fetch(`${base}/api/session`, { headers: { Origin: 'https://example.com' } })).status, 403);
  assert.equal(await new Promise((resolve, reject) => { const req = httpRequest(`${base}/api/session`, { headers: { Host: 'evil.example' } }, res => { res.resume(); resolve(res.statusCode); }); req.on('error', reject); req.end(); }), 403);
  assert.equal((await fetch(`${base}/api/session`, { headers: { 'Sec-Fetch-Site': 'cross-site' } })).status, 403);
  assert.equal((await request('/api/instances', 'POST', { name: '', endpoint: 'file:///etc/passwd' })).status, 400);
  assert.equal((await request('/api/instances', 'POST', { name: 'X', endpoint: 'http://user:secret@localhost' })).status, 400);
  assert.equal((await request('/api/instances', 'POST', { name: 'x'.repeat(20000), endpoint: 'http://localhost' })).status, 413);
  const page = await fetch(base); assert.match(page.headers.get('content-security-policy'), /frame-ancestors 'none'/);
});
test('concurrent saves are serialized and corrupt data is preserved', async t => {
  const { dir } = await fixture(t);
  const store = await openStore(dir);
  await Promise.all(Array.from({ length: 8 }, (_, i) => store.add({ name: `Target ${i}`, endpoint: `http://localhost:${9000 + i}` })));
  assert.equal((await openStore(dir)).list().length, 8);
  await writeFile(join(dir, 'connections.json'), '{broken');
  await assert.rejects(openStore(dir), /preserve and repair/);
});
test('Arena protocol reads only, response validation, timeout and size bounds', async t => {
  const seen = [];
  const mock = createServer((req, res) => {
    seen.push([req.method, req.url]);
    res.setHeader('Content-Type', 'application/json');
    if (req.url === '/api/v1/product') return res.end(JSON.stringify({ name: 'Arena', major: 7, minor: 28, micro: 0 }));
    if (req.url === '/api/v1/composition') return res.end(JSON.stringify({ name: { value: '<script>bad</script>' }, layers: [{ id: 1, name: { value: 'Layer 1' }, clips: [] }], columns: [] }));
    if (req.url === '/large') return res.end('x'.repeat(1000));
    if (req.url === '/slow') return;
    if (req.url === '/redirect') { res.writeHead(302, { Location: '/api/v1/product' }); return res.end(); }
    res.end('{}');
  });
  await new Promise(resolve => mock.listen(0, '127.0.0.1', resolve));
  t.after(() => { mock.close(); mock.closeAllConnections(); });
  const base = `http://127.0.0.1:${mock.address().port}`;
  const result = await inspectArena(base);
  assert.equal(result.summary.version, '7.28.0'); assert.equal(result.summary.layers.length, 1);
  assert.ok(seen.every(([method]) => method === 'GET'));
  await assert.rejects(readJson(`${base}/large`, { limit: 100 }), /size limit/);
  await assert.rejects(readJson(`${base}/slow`, { timeout: 30 }), /timed out/);
  await assert.rejects(readJson(`${base}/redirect`), /failed/);
  await assert.rejects(inspectArena(`${base}/wrong`), /supported Arena/);
  assert.throws(() => normalizeEndpoint('http://localhost/api/v1'), /origin only/);
});

test('studio HTTP routes preserve approval, authentication, saved target and archive boundaries', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'rezzo-http-studio-'));
  const composition = { name: { id: 1, value: 'Mock' }, layers: [{ id: 2, clips: [{ id: 3, connected: { value: 'Empty' } }] }] };
  const { compositionKey } = await import('../src/studio.mjs');
  const app = await createApp({ dataDir: dir, studioOptions: {
    discover: async () => ({ compositionName: 'Mock', compositionKey: compositionKey(composition), slots: [{ id: 3 }], sources: [{ id: 's', name: 'Lines', description: 'Neon' }], effects: [] }),
    inspect: async () => ({ composition: structuredClone(composition) }),
    write: async () => { composition.layers[0].clips[0] = { id: 3, connected: { value: 'Disconnected' }, video: { description: 'Lines', effects: [] } }; },
  } });
  await new Promise(resolve => app.listen(0, '127.0.0.1', resolve));
  t.after(async () => { await new Promise(resolve => { app.close(resolve); app.closeAllConnections(); }); await rm(dir, { recursive: true, force: true }); });
  const base = `http://127.0.0.1:${app.address().port}`;
  const { token } = await fetch(`${base}/api/session`).then(r => r.json());
  const request = (path, data) => fetch(`${base}${path}`, { method: data ? 'POST' : 'GET', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, ...(data ? { body: JSON.stringify(data) } : {}) });
  assert.equal((await fetch(`${base}/api/gallery`)).status, 401);
  const instance = await request('/api/instances', { name: 'Test', endpoint: 'http://localhost:8080' }).then(r => r.json());
  const root = `/api/instances/${instance.id}`;
  const plan = await request(`${root}/plan`, { prompt: 'Lines', sourceId: 's', clipId: 3, effectIds: [], mode: 'light' }).then(r => r.json());
  assert.equal((await request(`${root}/execute`, { planId: plan.id })).status, 400);
  const result = await request(`${root}/execute`, { planId: plan.id, approved: true }).then(r => r.json()); assert.equal(result.status, 'applied');
  assert.equal((await request(`${root}/execute`, { planId: plan.id, approved: true })).status, 409);
  const entries = await request('/api/gallery').then(r => r.json()); assert.equal(entries.length, 1); assert.equal(entries[0].before, undefined);
  const archived = await request(`/api/gallery/${plan.id}`).then(r => r.json()); assert.ok(archived.before); assert.ok(archived.after);
});
