import { setTimeout as delay } from 'node:timers/promises';
import { AppError, inspectArena } from './arena.mjs';
import { compositionKey, writeArena } from './studio.mjs';

const connected = clip => ['Connected', 'Connected & previewing'].includes(clip?.connected?.value);
const disconnected = clip => ['Disconnected', 'Previewing'].includes(clip?.connected?.value);
const identity = clip => JSON.stringify({ id: clip.id, source: clip.video?.description, effects: clip.video?.effects?.map(e => [e.id, e.name]) });
function conflict(message) { throw new AppError(message, 409); }
function locate(composition, recipe) {
  if (compositionKey(composition) !== recipe.compositionKey) conflict('Composition changed. Rebuild and review the recipe.');
  const layer = composition.layers.find(x => x.id === recipe.slot.layerId);
  const clip = layer?.clips.find(x => x.id === recipe.slot.id);
  const built = recipe.after?.layers.find(x => x.id === recipe.slot.layerId)?.clips.find(x => x.id === recipe.slot.id);
  if (!clip || !built || identity(clip) !== identity(built)) conflict('The built clip changed. Inspect Arena and rebuild before playback.');
  return { layer, clip };
}
function checkRouting(c, layer, clip) {
  const inherited = (value, fallback) => value === 'Composition Determined' ? fallback : value;
  if (inherited(clip.target?.value, c.cliptarget?.value) !== 'Own Layer' || inherited(clip.triggerstyle?.value, c.cliptriggerstyle?.value) !== 'Normal' || inherited(clip.beatsnap?.value, c.clipbeatsnap?.value) !== 'None') conflict('Playback requires Own Layer targeting, Normal trigger style and no beat snapping. Configure these in Arena.');
  const duration = clip.transition?.layer_determined?.value ? layer.transition?.duration?.value : clip.transition?.duration?.value;
  const fader = clip.faderstart?.value === 'Layer Determined' ? layer.faderstart?.value : clip.faderstart?.value === 'On';
  if (duration !== 0 || fader !== false || layer.autopilot?.target?.value !== 'Off') conflict('Playback requires zero transition duration, fader start off and layer autopilot off. Configure these in Arena.');
}

/** Serialized with studio operations through the shared per-target busy set.
 * No replay of writes after timeout/restart. Persist intent before every Arena write.
 */
export async function openPlayback({ queue, store, studio, busy, inspect = inspectArena, write = writeArena, now = Date.now, automatic = true }) {
  let closed = false;
  async function update(id, fn) { return queue.updatePlayback(id, fn); }
  // A service restart never resumes or sends stop commands without operator review.
  for (const id of queue.targets()) await update(id, state => {
    state.paused = true;
    if (state.active) { state.active.phase = 'uncertain'; state.message = 'Service restarted. Reconcile Arena before resuming.'; }
    return { outcome: 'scheduler_paused_on_startup' };
  });
  async function locked(id, run) {
    if (busy.has(id) || busy.size >= 4) conflict('Target or playback service is busy. Try again shortly.');
    busy.add(id); try { return await run(); } finally { busy.delete(id); }
  }
  async function uncertain(id, error) {
    await update(id, state => { state.paused = true; state.message = error.message; if (state.active) state.active.phase = 'uncertain'; return { outcome: 'playback_needs_review', message: error.message }; });
  }
  async function confirm(endpoint, recipe, expected) {
    const deadline = Date.now() + 2500;
    for (let attempt = 0; attempt < 12 && Date.now() < deadline; attempt++) {
      const actual = locate((await inspect(endpoint, { timeout: Math.max(1, deadline - Date.now()) })).composition, recipe);
      if (actual.layer.clips.some(x => x.id !== actual.clip.id && connected(x))) conflict('Another clip became active. Inspect Arena.');
      if (expected(actual.clip)) return;
      if (attempt < 11) await delay(150);
    }
    conflict('Arena readback did not settle. Inspect Arena; the command will not be retried.');
  }
  async function start(id) {
    const snapshot = queue.snapshot(id);
    if (snapshot.playback.paused || snapshot.playback.active) return;
    const candidate = snapshot.ranked[0];
    if (!candidate) return;
    const request = snapshot.requests.find(x => x.id === candidate.id);
    if (!request.recipeId) conflict('Next approved request has no built recipe. Attach one and approve it again.');
    const instance = store.get(id); const recipe = studio.get(request.recipeId);
    if (recipe.status !== 'applied' || recipe.instance.id !== id || recipe.instance.endpoint !== instance.endpoint) conflict('Recipe target no longer matches the saved connection.');
    const c = (await inspect(instance.endpoint)).composition;
    const { layer, clip } = locate(c, recipe); checkRouting(c, layer, clip);
    if (!disconnected(clip) || layer.clips.some(connected)) conflict('The recipe layer is occupied. Rezzo will not interrupt it.');
    // Intake may have changed during inspection. Reserve only the same still-approved next request.
    await update(id, (state, requests, timestamp) => {
      const fresh = queue.snapshot(id);
      const target = requests.find(x => x.id === request.id);
      if (state.paused || state.active || target?.status !== 'pending' || !target.approved || target.recipeId !== recipe.id || target.durationMs !== request.durationMs || fresh.ranked[0]?.id !== request.id) conflict('Queue changed during playback validation. Try again.');
      target.status = 'playing';
      state.active = { requestId: target.id, recipeId: recipe.id, endpoint: instance.endpoint, phase: 'starting', durationMs: target.durationMs, startedAt: timestamp };
      state.message = ''; return { outcome: 'playback_starting', requestId: target.id };
    });
    await write(instance.endpoint, `/composition/clips/by-id/${clip.id}/connect`);
    await confirm(instance.endpoint, recipe, connected);
    await update(id, (state, requests, timestamp) => { state.active.phase = 'playing'; state.active.startedAt = timestamp; state.active.endsAt = timestamp + state.active.durationMs; return { outcome: 'playing', requestId: request.id }; });
  }
  async function finish(id, reason, pause = false) {
    await update(id, (state, requests, timestamp) => {
      const request = requests.find(x => x.id === state.active?.requestId);
      if (request) { request.status = 'completed'; request.playbackOutcome = reason; request.finishedAt = timestamp; }
      state.active = null; state.paused ||= pause; state.message = reason;
      return { outcome: reason, requestId: request?.id ?? null };
    });
  }
  async function stop(id, reconcileOnly = false) {
    const active = queue.snapshot(id).playback.active;
    if (!active) return;
    const instance = store.get(id);
    if (instance.endpoint !== active.endpoint) conflict('Saved endpoint changed. Inspect the original Arena before recovery.');
    const recipe = studio.get(active.recipeId);
    const c = (await inspect(instance.endpoint)).composition;
    let location;
    try { location = locate(c, recipe); } catch { await finish(id, 'manual_change_detected_no_write', true); return; }
    const { layer, clip } = location;
    if (layer.clips.some(x => x.id !== clip.id && connected(x))) { await finish(id, 'manual_takeover_no_write', true); return; }
    if (disconnected(clip)) { await finish(id, 'already_disconnected', true); return; }
    if (!connected(clip)) conflict('Unknown clip connection state. Inspect Arena.');
    if (reconcileOnly) {
      await update(id, state => { state.paused = true; state.message = 'Owned clip is still connected. Use Stop owned clip to release it.'; return { outcome: 'owned_clip_still_connected' }; }); return;
    }
    await update(id, state => { state.active.phase = 'stopping'; return { outcome: 'playback_stopping', requestId: active.requestId }; });
    await write(instance.endpoint, `/composition/layers/by-id/${layer.id}/clear`);
    await confirm(instance.endpoint, recipe, disconnected);
    await finish(id, 'played_and_stopped');
  }
  async function tick() {
    if (closed) return;
    for (const id of queue.targets()) {
      if (busy.has(id) || busy.size >= 4) continue;
      const state = queue.snapshot(id).playback;
      if ((state.active?.phase === 'playing' && now() >= state.active.endsAt) || (!state.paused && !state.active)) {
        await locked(id, async () => { try { if (queue.snapshot(id).playback.active) await stop(id); if (!closed) await start(id); } catch (e) { await uncertain(id, e); } });
      }
    }
  }
  const timer = automatic ? setInterval(() => { tick().catch(() => {}); }, 500) : null;
  timer?.unref();
  return {
    tick,
    close() { closed = true; if (timer) clearInterval(timer); },
    command(id, operation) {
      if (!['resume', 'pause', 'stop', 'reconcile'].includes(operation)) throw new AppError('Unknown playback action.');
      return locked(id, async () => {
        store.get(id);
        try {
          if (operation === 'resume') {
            const active = queue.snapshot(id).playback.active;
            if (active && active.phase !== 'playing') conflict('Reconcile or stop the uncertain clip before resuming.');
            await update(id, state => { state.paused = false; state.message = ''; return { outcome: 'scheduler_resumed' }; }); await start(id);
          } else {
            await update(id, state => { state.paused = true; return { outcome: 'scheduler_paused' }; });
            if (operation !== 'pause') await stop(id, operation === 'reconcile');
          }
        } catch (error) { await uncertain(id, error); throw error; }
        return queue.snapshot(id).playback;
      });
    },
  };
}
