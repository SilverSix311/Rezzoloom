import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readdir, readFile, writeFile, rename, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { AppError, inspectArena, readJson } from './arena.mjs';

const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function compositionKey(c) {
  return hash({ nameId: c.name.id, name: c.name.value, decks: c.decks?.filter(x => x.selected?.value).map(x => x.id), layers: c.layers.map(x => [x.id, x.clips.map(y => y.id)]) });
}
export async function catalog(endpoint) {
  const [state, sources, effects] = await Promise.all([inspectArena(endpoint), readJson(`${endpoint}/api/v1/sources`), readJson(`${endpoint}/api/v1/effects`)]);
  if (!Array.isArray(sources.video) || !Array.isArray(effects.video)) throw new AppError('Arena returned an unsupported catalog.', 502);
  const clean = items => items.filter(x => typeof x.idstring === 'string' && typeof x.name === 'string').map(({ idstring, name, description, category }) => ({ id: idstring, name, description: description ?? '', category }));
  return {
    compositionKey: compositionKey(state.composition), compositionName: state.summary.compositionName,
    // Deliberately exclude capture devices and external media from the first control boundary.
    sources: clean(sources.video).filter(x => x.category === 'Video Sources'), effects: clean(effects.video),
    slots: state.composition.layers.flatMap((l, li) => l.clips.filter(c => c.connected?.value === 'Empty').map(c => ({ id: c.id, layerId: l.id, label: `Layer ${li + 1} · slot ${l.clips.indexOf(c) + 1}` }))),
  };
}
export function suggest(prompt, items) {
  const words = [...new Set(prompt.toLowerCase().match(/[a-z]{3,}/g) ?? [])].filter(x => !['the', 'and', 'with', 'for', 'some'].includes(x));
  return items.map(item => ({ ...item, score: words.reduce((score, word) => score + (item.name.toLowerCase().includes(word) ? 4 : item.description.toLowerCase().includes(word) ? 1 : 0), 0) })).filter(x => x.score > 0).sort((a, b) => b.score - a.score || a.name.localeCompare(b.name)).slice(0, 8);
}
export async function writeArena(endpoint, path, value) {
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(`${endpoint}/api/v1${path}`, { method: 'POST', redirect: 'error', signal: controller.signal, headers: { 'Content-Type': 'text/plain' }, ...(value === undefined ? {} : { body: value }) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    await response.body?.cancel();
  } catch (error) { throw new AppError(`Arena write outcome may be uncertain (${error.name === 'AbortError' ? 'timeout' : error.message}). Inspect Arena before creating another plan.`, 502); }
  finally { clearTimeout(timer); }
}
export async function openStudio(directory, { discover = catalog, inspect = inspectArena, write = writeArena, now = Date.now } = {}) {
  const folder = join(directory, 'gallery'); await mkdir(folder, { recursive: true, mode: 0o700 });
  const entries = new Map(); const locks = new Set();
  async function save(entry) {
    const path = join(folder, `${entry.id}.json`); const tmp = `${path}.${randomUUID()}.tmp`;
    try { await writeFile(tmp, JSON.stringify(entry, null, 2) + '\n', { mode: 0o600 }); await rename(tmp, path); }
    catch (error) { await unlink(tmp).catch(() => {}); throw error; }
    entries.set(entry.id, structuredClone(entry)); return structuredClone(entry);
  }
  for (const file of await readdir(folder)) {
    if (!/^[a-f0-9-]+\.json$/.test(file)) continue;
    const entry = JSON.parse(await readFile(join(folder, file), 'utf8'));
    if (entry.schemaVersion !== 1 || file !== `${entry.id}.json`) throw new Error('Invalid gallery archive. Preserve and repair the data.');
    if (entry.status === 'executing') { entry.status = 'interrupted'; entry.error = 'Service stopped during execution. Inspect Arena; this plan cannot be retried.'; await save(entry); }
    else entries.set(entry.id, entry);
  }
  function get(id) { const entry = entries.get(id); if (!entry) throw new AppError('Recipe not found.', 404); return structuredClone(entry); }
  return {
    list: () => [...entries.values()].map(({ before, after, ...entry }) => structuredClone(entry)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)), get, discover,
    async plan(instance, input, decision) {
      if (typeof input?.prompt !== 'string' || !input.prompt.trim() || input.prompt.length > 2000) throw new AppError('A prompt of 1–2000 characters is required.');
      if (!['light', 'full'].includes(input.mode)) throw new AppError('Choose Light or Full mode.');
      const available = await discover(instance.endpoint);
      if (decision && (decision.compositionKey !== available.compositionKey || decision.catalogHash !== hash({sources:available.sources,effects:available.effects}))) throw new AppError('Arena catalog changed after the model decision. Request a fresh suggestion.',409);
      const source = available.sources.find(x => x.id === input.sourceId);
      const slot = available.slots.find(x => x.id === input.clipId);
      const limit = input.mode === 'light' ? 1 : 4;
      if (!source || !slot) throw new AppError('Select an available built-in source and empty clip slot. Refresh the catalog.', 409);
      if (!Array.isArray(input.effectIds) || input.effectIds.length > limit || new Set(input.effectIds).size !== input.effectIds.length) throw new AppError(`Choose at most ${limit} distinct effects for this mode.`);
      const effects = input.effectIds.map(id => available.effects.find(x => x.id === id));
      if (effects.some(x => !x)) throw new AppError('An effect is no longer available.', 409);
      const id = randomUUID();
      return save({ schemaVersion: 1, kind: 'rezzo-recipe', id, filename: `Operator.${id.slice(0, 8)}.rezzo.json`, creator: 'Operator', prompt: input.prompt.trim(), mode: input.mode, planner: decision ? 'model-catalog-v1' : 'operator-catalog-v1', ...(decision ? {decision} : {}), instance, compositionKey: available.compositionKey, compositionName: available.compositionName, slot, source, effects, status: 'planned', createdAt: new Date(now()).toISOString(), expiresAt: new Date(now() + 600000).toISOString(), replayable: false, steps: [] });
    },
    async execute(id, instance, approved) {
      const entry = get(id);
      if (approved !== true) throw new AppError('Explicit operator approval is required.');
      if (entry.instance.id !== instance.id || entry.instance.endpoint !== instance.endpoint) throw new AppError('Recipe belongs to another Arena instance.', 409);
      if (entry.status !== 'planned') throw new AppError('This recipe has already been attempted. Create a new plan instead.', 409);
      if (now() >= Date.parse(entry.expiresAt)) throw new AppError('Plan expired. Create a new plan.', 409);
      if (locks.has(instance.id)) throw new AppError('This Arena is already executing a recipe.', 409);
      locks.add(instance.id);
      try {
        const available = await discover(instance.endpoint);
        if (available.compositionKey !== entry.compositionKey || !available.slots.some(x => x.id === entry.slot.id) || !available.sources.some(x => x.id === entry.source.id && x.name === entry.source.name) || entry.effects.some(e => !available.effects.some(x => x.id === e.id && x.name === e.name))) throw new AppError('Arena changed since planning. Refresh and create a new plan.', 409);
        entry.before = (await inspect(instance.endpoint)).composition;
        if (compositionKey(entry.before) !== entry.compositionKey || !entry.before.layers.some(l => l.clips.some(c => c.id === entry.slot.id && c.connected?.value === 'Empty'))) throw new AppError('The target changed during validation.', 409);
        entry.status = 'executing'; await save(entry);
        const root = `/composition/clips/by-id/${entry.slot.id}`;
        try {
          const commands = [{ label: `Load ${entry.source.name}`, path: `${root}/open`, value: `source:///video/${encodeURIComponent(entry.source.name)}` }, ...entry.effects.map(e => ({ label: `Add ${e.name}`, path: `${root}/effects/video/add`, value: `effect:///video/${encodeURIComponent(e.name)}` }))];
          for (const command of commands) {
            entry.steps.push({ label: command.label, status: 'sending', at: new Date(now()).toISOString() }); await save(entry);
            await write(instance.endpoint, command.path, command.value);
            entry.steps.at(-1).status = 'acknowledged'; await save(entry);
          }
          entry.after = (await inspect(instance.endpoint)).composition;
          const clip = entry.after.layers.flatMap(l => l.clips).find(c => c.id === entry.slot.id);
          if (!clip || clip.connected?.value === 'Empty' || clip.video?.description !== entry.source.name || entry.effects.some(e => !clip.video?.effects?.some(actual => actual.name === e.name))) throw new Error('Source or effect readback did not match the recipe. Inspect Arena.');
          entry.status = 'applied'; entry.finishedAt = new Date(now()).toISOString();
        } catch (error) { entry.status = 'uncertain'; entry.error = error.message; }
        return await save(entry);
      } finally { locks.delete(instance.id); }
    },
  };
}
