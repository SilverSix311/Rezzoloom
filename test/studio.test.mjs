import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openStudio, compositionKey, suggest } from '../src/studio.mjs';

async function setup(t) {
  const dir = await mkdtemp(join(tmpdir(), 'rezzo-studio-')); t.after(() => rm(dir, { recursive: true, force: true }));
  let time = 1000000;
  const composition = { name: { id: 1, value: 'Test' }, layers: [{ id: 2, clips: [{ id: 3, connected: { value: 'Empty' } }] }] };
  const available = { compositionKey: compositionKey(composition), compositionName: 'Test', slots: [{ id: 3, layerId: 2, label: 'Layer 1 slot 1' }], sources: [{ id: 's', name: 'Lines', description: 'Neon lines' }], effects: [{ id: 'e', name: 'Blur', description: 'Soft haze' }] };
  const calls = [];
  const options = { now: () => time, discover: async () => structuredClone(available), inspect: async () => ({ composition: structuredClone(composition) }), write: async (...args) => { calls.push(args); composition.layers[0].clips[0].connected.value = 'Disconnected'; composition.layers[0].clips[0].video = { description: 'Lines', effects: [{ name: 'Blur' }] }; } };
  const studio = await openStudio(dir, options);
  const instance = { id: 'arena-a', endpoint: 'http://localhost:8080' };
  const input = { prompt: 'Neon lines', mode: 'light', clipId: 3, sourceId: 's', effectIds: ['e'] };
  return { dir, studio, instance, input, available, calls, options, composition, age: () => { time += 600001; } };
}
test('approved builds persist prompts, commands and observations and cannot run twice', async t => {
  const f = await setup(t); const plan = await f.studio.plan(f.instance, f.input);
  assert.equal(f.calls.length, 0);
  await assert.rejects(f.studio.execute(plan.id, f.instance, false), /approval/);
  await assert.rejects(f.studio.execute(plan.id, { ...f.instance, id: 'arena-b' }, true), /another Arena/);
  const result = await f.studio.execute(plan.id, f.instance, true);
  assert.equal(result.status, 'applied'); assert.equal(result.steps.length, 2);
  assert.deepEqual(f.calls.map(x => x.slice(1)), [['/composition/clips/by-id/3/open', 'source:///video/Lines'], ['/composition/clips/by-id/3/effects/video/add', 'effect:///video/Blur']]);
  await assert.rejects(f.studio.execute(plan.id, f.instance, true), /already been attempted/);
  const reopened = await openStudio(f.dir, f.options); assert.equal(reopened.get(plan.id).prompt, f.input.prompt);
  assert.ok(reopened.get(plan.id).before); assert.ok(reopened.get(plan.id).after);
});
test('expiry, occupied slots, changed composition and fabricated resources reject before writes', async t => {
  const f = await setup(t);
  await assert.rejects(f.studio.plan(f.instance, { ...f.input, sourceId: 'made-up' }), /available/);
  await assert.rejects(f.studio.plan(f.instance, { ...f.input, effectIds: ['e', 'e'] }), /at most/);
  const plan = await f.studio.plan(f.instance, f.input);
  f.available.slots = []; await assert.rejects(f.studio.execute(plan.id, f.instance, true), /changed/);
  f.available.slots = [{ id: 3 }]; f.available.compositionKey = 'changed'; await assert.rejects(f.studio.execute(plan.id, f.instance, true), /changed/);
  f.age(); await assert.rejects(f.studio.execute(plan.id, f.instance, true), /expired/); assert.equal(f.calls.length, 0);
});
test('failed writes are archived uncertain and never automatically retried', async t => {
  const f = await setup(t); f.options.write = async () => { throw new Error('Timed out after send'); };
  const studio = await openStudio(f.dir, f.options); const plan = await studio.plan(f.instance, f.input);
  const result = await studio.execute(plan.id, f.instance, true); assert.equal(result.status, 'uncertain'); assert.equal(result.steps[0].status, 'sending');
  await assert.rejects(studio.execute(plan.id, f.instance, true), /already been attempted/);
  const partial = { ...result, status: 'executing' };
  await writeFile(join(f.dir, 'gallery', `${plan.id}.json`), JSON.stringify(partial));
  assert.equal((await openStudio(f.dir, f.options)).get(plan.id).status, 'interrupted');
});
test('concurrent execution is serialized per target', async t => {
  const f = await setup(t); let release;
  f.options.write = async () => new Promise(resolve => { release = resolve; });
  const studio = await openStudio(f.dir, f.options); const plan = await studio.plan(f.instance, { ...f.input, effectIds: [] });
  const first = studio.execute(plan.id, f.instance, true);
  while (!release) await new Promise(resolve => setTimeout(resolve, 1));
  await assert.rejects(studio.execute(plan.id, f.instance, true), /already been attempted|already executing/);
  release(); await first;
});
test('catalog matcher ranks real entries and does not invent a match', () => {
  const items = [{ id: '1', name: 'Lines', description: 'Neon pattern' }];
  assert.equal(suggest('neon lines', items)[0].id, '1'); assert.deepEqual(suggest('unrelated', items), []);
});

test('successful HTTP acknowledgement without matching source/effect readback remains uncertain', async t => {
  const f = await setup(t); f.options.write = async () => {};
  const studio = await openStudio(f.dir, f.options); const plan = await studio.plan(f.instance, f.input);
  const result = await studio.execute(plan.id, f.instance, true);
  assert.equal(result.status, 'uncertain'); assert.match(result.error, /readback/);
});
