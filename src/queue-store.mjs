import { mkdir, readFile, writeFile, rename, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { AppError, normalizeEndpoint } from './arena.mjs';
import { parseRezzCommand } from './chat.mjs';
import { DEFAULT_QUEUE_CONFIG, rankRequests, applyAdjustment } from './queue.mjs';

export const LOCAL_OPERATOR = Object.freeze({ id: 'local:operator', role: 'operator' });
const defaults = () => ({ ...DEFAULT_QUEUE_CONFIG, tierBases: [25, 50, 75] });
function fail(message, status = 400) { throw new AppError(message, status); }
function object(value, keys) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(k => !keys.includes(k))) fail('Unexpected queue fields.');
}
function text(value, name, max = 2000) {
  if (typeof value !== 'string' || !value.trim() || value.length > max) fail(`${name} must contain 1–${max} characters.`);
  return value.trim();
}
function config(value) {
  object(value, ['bulkPenalty', 'agingPoints', 'agingIntervalMs', 'tierBases']);
  if (Object.keys(value).length !== 4) fail('All queue settings are required.');
  if (!Array.isArray(value.tierBases) || value.tierBases.length !== 3 || value.tierBases.some(x => typeof x !== 'number' || !Number.isFinite(x) || x < 0 || x > 100 || Math.abs(x * 1e6 - Math.round(x * 1e6)) > 1e-7)) fail('Three tier bases between 0 and 100 are required (six decimal places maximum).');
  try { rankRequests([], { instanceId: 'validate', now: 0, config: value }); } catch (e) { fail(e.message); }
  return structuredClone(value);
}
function operator(actor) { if (actor?.id !== LOCAL_OPERATOR.id || actor?.role !== 'operator') fail('Verified local operator required.', 403); }

/** One process owns this file. Requests and their idempotency receipts commit together.
 * Twitch intake is internal to the authenticated provider adapter; HTTP commands remain operator-only.
 */
export async function openQueue(directory, { now = Date.now, resolveRecipe } = {}) {
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const filename = join(directory, 'queue.json');
  let data;
  try { data = JSON.parse(await readFile(filename, 'utf8')); }
  catch (error) { if (error.code !== 'ENOENT') throw new Error(`Cannot read queue store; preserve and repair ${filename}.`, { cause: error }); data = { schemaVersion: 1, revision: 0, requests: [], events: [], configs: {} }; }
  try {
    if (data.schemaVersion !== 1 || !Number.isSafeInteger(data.revision) || data.revision < 0 || !Array.isArray(data.requests) || !Array.isArray(data.events) || !data.configs || typeof data.configs !== 'object' || Array.isArray(data.configs)) throw Error();
    const ids = new Set();
    for (const r of data.requests) {
      text(r.id, 'id', 100); text(r.instanceId, 'target', 100); text(r.prompt, 'prompt');
      if (ids.has(r.id) || !(r.userId === LOCAL_OPERATOR.id || /^twitch:[0-9]+$/.test(r.userId)) || r.protected !== false) throw Error(); ids.add(r.id);
    }
    for (const id of new Set(data.requests.map(r => r.instanceId))) rankRequests(data.requests, { instanceId: id, now: now() });
    const keys = new Set();
    for (const event of data.events) {
      text(event.key, 'event key', 200); text(event.fingerprint, 'fingerprint', 10000);
      if (keys.has(event.key) || !event.result || !(event.actorId === LOCAL_OPERATOR.id || /^twitch:[0-9]+$/.test(event.actorId))) throw Error(); keys.add(event.key);
    }
    for (const setting of Object.values(data.configs)) config(setting);
  } catch (error) { throw new Error(`Invalid queue store; preserve and repair ${filename}.`, { cause: error }); }
  data.playback ??= {};
  if (typeof data.playback !== 'object' || Array.isArray(data.playback)) throw new Error('Invalid playback store.');
  for (const [id, state] of Object.entries(data.playback)) {
    if (!state || typeof state.paused !== 'boolean') throw new Error('Invalid playback state; preserve the queue store.');
    const active = state.active;
    if (active) {
      const request = data.requests.find(x => x.id === active.requestId && x.instanceId === id && x.status === 'playing');
      if (!request || request.recipeId !== active.recipeId || !['starting', 'playing', 'stopping', 'uncertain'].includes(active.phase) || !Number.isSafeInteger(active.durationMs) || active.durationMs < 1000 || active.durationMs > 3600000 || !Number.isSafeInteger(active.startedAt) || (active.phase === 'playing' && !Number.isSafeInteger(active.endsAt))) throw new Error('Invalid active playback; preserve the queue store.');
      normalizeEndpoint(active.endpoint);
    }
  }
  for (const request of data.requests) {
    if (request.recipeId && (typeof request.recipeId !== 'string' || !Number.isSafeInteger(request.durationMs) || request.durationMs < 1000 || request.durationMs > 3600000)) throw new Error('Invalid attached recipe.');
    if (request.status === 'playing' && data.playback[request.instanceId]?.active?.requestId !== request.id) throw new Error('Playing request has no recovery record.');
  }
  let pending = Promise.resolve();
  function mutate(instanceId, input, actor, reduce) {
    if (!(actor?.id === LOCAL_OPERATOR.id && actor.role === 'operator') && !(actor?.role === 'viewer' && /^twitch:[0-9]+$/.test(actor.id))) fail('Verified identity required.', 403);
    text(instanceId, 'Target', 100); text(input.eventId, 'Event ID', 120);
    const key = `${actor.id}:${input.eventId}`;
    // Canonical key order makes retries independent of JSON property order.
    const fingerprint = JSON.stringify([input.operation === 'twitch' ? 'twitch-message' : instanceId, Object.entries(input).filter(([k]) => k !== 'eventId').sort(([a], [b]) => a.localeCompare(b))]);
    const job = pending.then(async () => {
      const prior = data.events.find(x => x.key === key);
      if (prior) { if (prior.fingerprint !== fingerprint) fail('Event ID was already used for a different operation.', 409); return structuredClone(prior.result); }
      if (data.events.length >= 10000 && input.operation !== 'playback') fail('Queue event archive limit reached. Preserve the archive before maintenance.', 409);
      const draft = structuredClone(data); const timestamp = now();
      const result = reduce(draft, timestamp);
      draft.revision++;
      draft.events.push({ key, fingerprint, actorId: actor.id, instanceId, at: timestamp, operation: input.operation, input: structuredClone(input), result });
      const temporary = `${filename}.${randomUUID()}.tmp`;
      try { await writeFile(temporary, `${JSON.stringify(draft, null, 2)}\n`, { mode: 0o600 }); await rename(temporary, filename); }
      catch (error) { await unlink(temporary).catch(() => {}); throw error; }
      data = draft; return structuredClone(result);
    });
    pending = job.catch(() => {}); return job;
  }
  return {
    targets: () => [...new Set([...data.requests.map(x => x.instanceId), ...Object.keys(data.playback)])],
    updatePlayback(instanceId, reduce) {
      return mutate(instanceId, { eventId: randomUUID(), operation: 'playback' }, LOCAL_OPERATOR, (draft, timestamp) => {
        draft.playback[instanceId] ??= { paused: true, active: null };
        return reduce(draft.playback[instanceId], draft.requests.filter(x => x.instanceId === instanceId), timestamp);
      });
    },
    snapshot(instanceId) {
      const settings = data.configs[instanceId] ?? defaults();
      const requests = data.requests.filter(x => x.instanceId === instanceId);
      const sampledAt = now();
      const ranked = rankRequests(requests, { instanceId, now: sampledAt, config: settings });
      // Show scores for awaiting-review rows too without changing eligibility.
      const scores = rankRequests(requests.map(x => ({ ...x, approved: true })), { instanceId, now: sampledAt, config: settings });
      return structuredClone({ revision: data.revision, sampledAt, config: settings, playback: data.playback[instanceId] ?? { paused: true, active: null }, ranked, requests: requests.map(x => ({ ...x, ranking: scores.find(s => s.id === x.id) ?? null })), events: data.events.filter(x => x.instanceId === instanceId).slice(-50) });
    },
    // Internal adapter entry point only. There is deliberately no HTTP event-injection route.
    ingestTwitch(instanceId, event) {
      object(event, ['channelId', 'messageId', 'userId', 'login', 'text']);
      if (typeof event.channelId !== 'string' || typeof event.userId !== 'string' || typeof event.messageId !== 'string' || typeof event.login !== 'string' || typeof event.text !== 'string' || !/^[0-9]{1,30}$/.test(event.channelId) || !/^[0-9]{1,30}$/.test(event.userId) || !/^[a-zA-Z0-9_-]{1,80}$/.test(event.messageId) || !/^[a-z0-9_]{1,25}$/.test(event.login)) fail('Invalid Twitch event identity.');
      const parsed = parseRezzCommand(event.text);
      if (parsed.disposition !== 'accepted') return Promise.resolve({ outcome: parsed.disposition, reason: parsed.reason });
      const actor = { id: `twitch:${event.userId}`, role: 'viewer' };
      const input = { operation: 'twitch', eventId: `${event.channelId}:${event.messageId}`, prompt: parsed.prompt, channelId: event.channelId, login: event.login };
      return mutate(instanceId, input, actor, (draft, timestamp) => {
        const pending = draft.requests.filter(x => ['pending','playing'].includes(x.status));
        if (pending.filter(x => x.userId === actor.id && x.instanceId === instanceId).length >= 5) return { outcome: 'user_queue_limit' };
        if (pending.filter(x => x.instanceId === instanceId).length >= 500) return { outcome: 'queue_limit' };
        const prior = draft.requests.filter(x => x.source?.channelId === event.channelId);
        if (prior.some(x => x.userId === actor.id && timestamp - x.createdAt < 10000)) return { outcome: 'cooldown' };
        if (prior.filter(x => timestamp - x.createdAt < 60000).length >= 60) return { outcome: 'channel_rate_limit' };
        const request = { id: randomUUID(), instanceId, userId: actor.id, displayName: event.login, source: { provider:'twitch', channelId:event.channelId, messageId:event.messageId }, prompt:parsed.prompt, priority:'standard', baseScore:0, admin:false, protected:false, approved:false, status:'pending', createdAt:timestamp, sequence:draft.revision+1, adjustments:[] };
        draft.requests.push(request); return { requestId:request.id, outcome:'queued', instanceId };
      });
    },
    command(instanceId, input, actor) {
      operator(actor);
      object(input, ['eventId', 'operation', 'prompt', 'priority', 'requestId', 'delta', 'config', 'revision', 'recipeId', 'durationSeconds']);
      const allowed = { enqueue: ['prompt', 'priority'], attach: ['requestId', 'recipeId', 'durationSeconds'], approve: ['requestId'], remove: ['requestId'], adjustNext: ['delta'], configure: ['config', 'revision'] };
      const fields = Object.hasOwn(allowed, input.operation) ? allowed[input.operation] : null; if (!fields) fail('Unsupported queue operation.');
      object(input, ['eventId', 'operation', ...fields]);
      return mutate(instanceId, input, actor, (draft, timestamp) => {
        const settings = draft.configs[instanceId] ?? defaults();
        if (input.operation === 'enqueue') {
          const priority = input.priority ?? 'standard';
          if (!['standard', 'tier1', 'tier2', 'tier3', 'admin'].includes(priority)) fail('Invalid priority class.');
          if (draft.requests.filter(x => x.instanceId === instanceId && x.status === 'pending').length >= 500) fail('Pending queue limit reached (500).', 409);
          const request = { id: randomUUID(), instanceId, userId: actor.id, prompt: text(input.prompt, 'Prompt'), priority, baseScore: priority.startsWith('tier') ? settings.tierBases[Number(priority.slice(-1)) - 1] : 0, admin: priority === 'admin', protected: false, approved: false, status: 'pending', createdAt: timestamp, sequence: draft.revision + 1, adjustments: [] };
          draft.requests.push(request); return { requestId: request.id, outcome: 'queued' };
        }
        if (input.operation === 'configure') {
          if (input.revision !== draft.revision) fail('Queue changed. Reload settings before saving.', 409);
          draft.configs[instanceId] = config(input.config); return { outcome: 'configured', config: draft.configs[instanceId] };
        }
        let request;
        if (input.operation === 'adjustNext') {
          // Validate even when no pending request exists. Resolve only after deduplication.
          try { applyAdjustment({ admin: false, protected: false, status: 'pending', adjustments: [] }, input.delta); } catch (e) { fail(e.message); }
          request = draft.requests.filter(x => x.instanceId === instanceId && x.userId === actor.id && x.status === 'pending').sort((a,b) => a.createdAt-b.createdAt || a.sequence-b.sequence)[0];
          if (!request) return { outcome: 'no_pending_request', requestId: null };
          const adjustment = applyAdjustment(request, input.delta);
          if (adjustment.applied) request.adjustments = adjustment.request.adjustments;
          return { requestId: request.id, outcome: adjustment.applied ? 'adjusted' : adjustment.reason };
        }
        request = draft.requests.find(x => x.instanceId === instanceId && x.id === input.requestId);
        if (!request) fail('Queue request not found for this target.', 404);
        if (request.status !== 'pending') fail('Only pending requests can be changed.', 409);
        if (input.operation === 'attach') {
          const recipe = resolveRecipe?.(input.recipeId);
          if (!recipe || recipe.status !== 'applied' || recipe.instance.id !== instanceId) fail('Choose a successfully built recipe on this target.', 409);
          const duration = input.durationSeconds ?? 60;
          if (typeof duration !== 'number' || !Number.isFinite(duration) || duration < 1 || duration > 3600 || Math.abs(duration * 1000 - Math.round(duration * 1000)) > Number.EPSILON * Math.max(1, duration * 1000) * 2) fail('Duration must be 1–3600 seconds in millisecond steps.');
          request.recipeId = recipe.id; request.durationMs = Math.round(duration * 1000); request.approved = false;
          return { requestId: request.id, outcome: 'recipe_attached_review_required' };
        }
        if (input.operation === 'approve') {
          const recipe = request.recipeId && resolveRecipe?.(request.recipeId);
          if (!recipe || recipe.status !== 'applied' || recipe.instance.id !== instanceId) fail('Attach a successfully built recipe on this target before approval.', 409);
          request.approved = true;
        }
        else request.status = 'removed';
        return { requestId: request.id, outcome: input.operation === 'approve' ? 'approved' : 'removed' };
      });
    },
  };
}
