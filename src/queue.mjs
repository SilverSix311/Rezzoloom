/** Pure scheduling policy. Callers must supply trusted, validated requests and event history.
 * This module performs no IO, platform verification, payment processing or Arena writes.
 */
const SCALE = 1_000_000n;
const LIMIT = 100n * SCALE;
export const DEFAULT_QUEUE_CONFIG = Object.freeze({ bulkPenalty: 10, agingPoints: 1, agingIntervalMs: 60_000 });

// Bounded, six-place fixed point avoids binary decimal drift in ordering comparisons.
function points(value, field, minimum = -1_000_000, maximum = 1_000_000) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < minimum || value > maximum) throw new TypeError(`${field} must be finite and between ${minimum} and ${maximum}.`);
  const scaled = Math.round(value * Number(SCALE));
  if (Math.abs(scaled / Number(SCALE) - value) > Number.EPSILON * Math.max(1, Math.abs(value)) * 2) throw new TypeError(`${field} supports at most six decimal places.`);
  return BigInt(scaled);
}
function timestamp(value, field) {
  if (!Number.isSafeInteger(value) || value < 0) throw new TypeError(`${field} must be a nonnegative integer timestamp in milliseconds.`);
  return value;
}
function text(value, field) {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError(`${field} is required.`);
}
const number = value => Number(value) / Number(SCALE);
const fifo = (a, b) => a.createdAt - b.createdAt || a.sequence - b.sequence;

/** Request shape: {id, instanceId, userId, createdAt, sequence, status, approved,
 * admin, protected, baseScore, adjustments:[{delta}]}. Base is snapshotted at intake.
 * Statuses are pending/playing/completed/removed. Only pending approved requests rank.
 */
export function rankRequests(requests, { instanceId, now, config = {} } = {}) {
  text(instanceId, 'instanceId'); timestamp(now, 'now');
  if (!Array.isArray(requests)) throw new TypeError('requests must be an array.');
  const settings = { ...DEFAULT_QUEUE_CONFIG, ...config };
  const bulk = points(settings.bulkPenalty, 'bulkPenalty', 0, 100);
  const aging = points(settings.agingPoints, 'agingPoints', 0, 100);
  if (!Number.isSafeInteger(settings.agingIntervalMs) || settings.agingIntervalMs < 1) throw new TypeError('agingIntervalMs must be a positive integer.');
  const ids = new Set(); const sequences = new Set();
  const target = [];
  for (const request of requests) {
    if (!request || typeof request !== 'object') throw new TypeError('Invalid request.');
    text(request.instanceId, 'request.instanceId');
    if (request.instanceId !== instanceId) continue;
    text(request.id, 'request.id'); text(request.userId, 'request.userId');
    if (ids.has(request.id)) throw new TypeError('Duplicate request ID within a target.');
    ids.add(request.id);
    timestamp(request.createdAt, 'createdAt'); timestamp(request.sequence, 'sequence');
    if (sequences.has(request.sequence)) throw new TypeError('Arrival sequence must be unique within a target.');
    sequences.add(request.sequence);
    if (!['pending', 'playing', 'completed', 'removed'].includes(request.status)) throw new TypeError('Invalid request status.');
    for (const field of ['approved', 'admin', 'protected']) if (typeof request[field] !== 'boolean') throw new TypeError(`${field} must be boolean.`);
    const base = points(request.baseScore, 'baseScore', -100, 100);
    if (!Array.isArray(request.adjustments)) throw new TypeError('adjustments must be an array.');
    let adjustments = 0n;
    for (const event of request.adjustments) {
      const delta = points(event?.delta, 'adjustment.delta');
      // The trusted event reducer rejects negative events once protection starts.
      // Historical debits are retained; granting protection is not a refund.
      adjustments += delta;
    }
    if (['pending', 'playing'].includes(request.status)) target.push({ request, base, adjustments });
  }
  target.sort((a, b) => fifo(a.request, b.request));
  const counts = new Map(); const ranked = [];
  for (const { request, base, adjustments } of target) {
    const earlier = counts.get(request.userId) ?? 0;
    const exempt = request.admin || request.protected;
    const penalty = exempt ? 0n : bulk * BigInt(earlier);
    if (!exempt) counts.set(request.userId, earlier + 1);
    // Continuous aging, truncated to six places. Future timestamps earn nothing.
    const wait = BigInt(Math.max(0, now - request.createdAt));
    const age = request.admin ? 0n : aging * wait / BigInt(settings.agingIntervalMs);
    const raw = base + age + adjustments - penalty;
    const score = request.admin ? 1000n * SCALE : raw < -LIMIT ? -LIMIT : raw > LIMIT ? LIMIT : raw;
    if (request.status === 'pending' && request.approved) ranked.push({ id: request.id, instanceId, userId: request.userId, score: number(score), components: { base: number(base), aging: number(age), adjustments: number(adjustments), bulkPenalty: number(penalty), earlierUnprotected: exempt ? 0 : earlier }, createdAt: request.createdAt, sequence: request.sequence });
  }
  return ranked.sort((a, b) => b.score - a.score || fifo(a, b));
}

/** Never interrupt a currently playing request, even if a higher-priority one arrives.
 * Completing the active request/duration tracking is the playback controller's job.
 */
export function selectNextRequest(requests, options) {
  const ranked = rankRequests(requests, options);
  if (requests.some(x => x.instanceId === options.instanceId && x.status === 'playing')) return null;
  return ranked[0] ?? null;
}

/** Apply a pre-verified event to an already-resolved request. Idempotency and user-next
 * resolution must happen in a persistent event reducer before calling this helper.
 */
export function applyAdjustment(request, delta) {
  points(delta, 'adjustment.delta');
  if (!request || typeof request.admin !== 'boolean' || typeof request.protected !== 'boolean' || !Array.isArray(request.adjustments)) throw new TypeError('Invalid adjustment target.');
  if (request.status !== 'pending') return { applied: false, reason: 'not_pending', request };
  if (request.admin) return { applied: false, reason: 'admin_fixed_priority', request };
  if (request.protected && delta < 0) return { applied: false, reason: 'donation_protected', request };
  return { applied: true, request: { ...request, adjustments: [...request.adjustments, { delta }] } };
}
