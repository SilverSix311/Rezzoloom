import { mkdir, readFile, writeFile, rename, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { AppError, normalizeEndpoint } from './arena.mjs';

export async function openStore(directory) {
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const filename = join(directory, 'connections.json');
  let data;
  try { data = JSON.parse(await readFile(filename, 'utf8')); }
  catch (error) { if (error.code !== 'ENOENT') throw new Error(`Cannot read connection store; preserve and repair ${filename}.`, { cause: error }); data = { schemaVersion: 1, instances: [] }; }
  if (data.schemaVersion !== 1 || !Array.isArray(data.instances)) throw new Error('Unsupported connection store version or shape.');
  const ids = new Set();
  for (const item of data.instances) {
    if (typeof item.id !== 'string' || ids.has(item.id) || typeof item.name !== 'string' || !item.name.trim()) throw new Error('Invalid connection store.');
    ids.add(item.id); normalizeEndpoint(item.endpoint);
  }
  let pending = Promise.resolve();
  async function mutate(change) {
    const job = pending.then(async () => {
      const draft = structuredClone(data); const result = change(draft);
      const temporary = `${filename}.${randomUUID()}.tmp`;
      try { await writeFile(temporary, `${JSON.stringify(draft, null, 2)}\n`, { mode: 0o600 }); await rename(temporary, filename); }
      catch (error) { await unlink(temporary).catch(() => {}); throw error; }
      data = draft; return result;
    });
    pending = job.catch(() => {}); return job;
  }
  return {
    list: () => structuredClone(data.instances),
    get(id) { const item = data.instances.find(x => x.id === id); if (!item) throw new AppError('Arena connection not found.', 404); return structuredClone(item); },
    add(input) {
      if (typeof input?.name !== 'string' || !input.name.trim() || input.name.trim().length > 80) throw new AppError('Name must contain 1–80 characters.');
      const endpoint = normalizeEndpoint(input.endpoint);
      return mutate(draft => {
        if (draft.instances.length >= 100) throw new AppError('Connection limit reached (100).');
        if (draft.instances.some(x => x.endpoint === endpoint)) throw new AppError('This Arena address is already saved.', 409);
        const item = { id: randomUUID(), name: input.name.trim(), endpoint, createdAt: new Date().toISOString() };
        draft.instances.push(item); return item;
      });
    },
    remove(id) { return mutate(draft => { const index = draft.instances.findIndex(x => x.id === id); if (index < 0) throw new AppError('Arena connection not found.', 404); draft.instances.splice(index, 1); }); },
  };
}
