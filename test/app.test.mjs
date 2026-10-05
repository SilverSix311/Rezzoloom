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
