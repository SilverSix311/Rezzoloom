import test from 'node:test';
import assert from 'node:assert/strict';
import { parseRezzCommand } from '../src/chat.mjs';
import { rankRequests, selectNextRequest, applyAdjustment } from '../src/queue.mjs';

const options = { instanceId: 'arena-a', now: 60_000 };
const request = (id, extra = {}) => ({ id: String(id), instanceId: 'arena-a', userId: 'viewer', createdAt: 0, sequence: id, status: 'pending', approved: true, admin: false, protected: false, baseScore: 0, adjustments: [], ...extra });
const scoreMap = rows => Object.fromEntries(rows.map(x => [x.id, x.score]));

test('chat parser accepts only bounded commands, preserving prompt punctuation as inert text', () => {
  for (const input of ['hello !rezz blue', '!rezzify blue', '!rezz-blue', '/rezz blue', '']) assert.equal(parseRezzCommand(input).disposition, 'ignored');
  assert.deepEqual(parseRezzCommand('  !REZZ  "Synthwave, purple. Neon grids!"  '), { disposition: 'accepted', prompt: 'Synthwave, purple. Neon grids!' });
  assert.equal(parseRezzCommand('!rezz neon grids').prompt, 'neon grids');
  assert.equal(parseRezzCommand('!rezz "say "blue" then fade"').prompt, 'say "blue" then fade');
  assert.equal(parseRezzCommand('!rezz https://example.com; rm -rf /').prompt, 'https://example.com; rm -rf /');
  for (const input of ['!rezz', '!rezz   ', '!rezz ""', '!rezz "   "']) assert.equal(parseRezzCommand(input).reason, 'empty_prompt');
  for (const input of ['!rezz "blue', '!rezz blue"', '!rezz "']) assert.equal(parseRezzCommand(input).reason, 'unmatched_quotes');
});
test('prompt limits count code points and reject malformed configuration', () => {
  assert.equal(parseRezzCommand('!rezz ' + '💜'.repeat(500)).disposition, 'accepted');
  assert.equal(parseRezzCommand('!rezz ' + '💜'.repeat(501)).reason, 'prompt_too_long');
  assert.equal(parseRezzCommand('!rezz cyan', { maxCodePoints: 3 }).reason, 'prompt_too_long');
  for (const value of [0, 2001, NaN, 1.5, '500']) assert.throws(() => parseRezzCommand('hello', { maxCodePoints: value }), TypeError);
  assert.throws(() => parseRezzCommand(null), TypeError);
});
test('bulk penalties shrink on completion/removal, retaining earned points and waiting for playing requests to finish', () => {
  const rows = [request(1), request(2, { adjustments: [{ delta: 3 }] }), request(3)];
  assert.deepEqual(scoreMap(rankRequests(rows, { ...options, now: 0 })), { 1: 0, 2: -7, 3: -20 });
  rows[0].status = 'playing';
  assert.deepEqual(scoreMap(rankRequests(rows, { ...options, now: 0 })), { 2: -7, 3: -20 });
  rows[0].status = 'completed';
  assert.deepEqual(scoreMap(rankRequests(rows, { ...options, now: 0 })), { 2: 3, 3: -10 });
  rows[1].status = 'removed';
  assert.equal(rankRequests(rows, { ...options, now: 0 })[0].score, 0);
});
test('protected/admin requests neither receive nor cause bulk penalties', () => {
  const rows = [request(1), request(2, { protected: true, baseScore: 25 }), request(3, { admin: true }), request(4)];
  assert.deepEqual(scoreMap(rankRequests(rows, { ...options, now: 0 })), { 1: 0, 2: 25, 3: 1000, 4: -10 });
  assert.equal(rankRequests(rows, options)[1].components.aging, 1);
  const debit = applyAdjustment(rows[1], -20); assert.equal(debit.applied, false); assert.equal(debit.reason, 'donation_protected');
  const credit = applyAdjustment(rows[1], 2.5); assert.equal(credit.applied, true); assert.equal(credit.request.adjustments[0].delta, 2.5); assert.deepEqual(rows[1].adjustments, []);
  assert.equal(applyAdjustment(rows[2], 10).reason, 'admin_fixed_priority');
  assert.equal(applyAdjustment(request(5, { status: 'completed' }), 10).reason, 'not_pending');
});
test('decimal aging is continuous, all pending requests age, and caps do not erase earned history', () => {
  const rows = [request(1, { baseScore: 99.9, adjustments: [{ delta: 0.1 }, { delta: 0.2 }] }), request(2)];
  const ranked = rankRequests(rows, { ...options, now: 30_000, config: { agingPoints: 0.25, agingIntervalMs: 60_000 } });
  assert.equal(ranked[0].score, 100); assert.equal(ranked[0].components.adjustments, 0.3);
  assert.equal(ranked[1].components.aging, 0.125); assert.equal(ranked[1].score, -9.875);
  const sabotaged = applyAdjustment(rows[0], -0.2).request;
  assert.equal(rankRequests([sabotaged], { ...options, now: 0 })[0].score, 100);
  assert.equal(rankRequests([request(1, { adjustments: [{ delta: -1000 }] })], options)[0].score, -100);
  assert.equal(rankRequests([request(1, { createdAt: 90_000 })], options)[0].components.aging, 0);
});
test('ranked selection respects approvals, targets, admin precedence, FIFO ties and no interruption', () => {
  const rows = [request(1, { userId: 'a', baseScore: 100 }), request(2, { userId: 'b', baseScore: 100 }), request(3, { admin: true, approved: false }), request(4, { instanceId: 'arena-b', admin: true })];
  assert.deepEqual(rankRequests(rows, options).map(x => x.id), ['1', '2']);
  rows[2].approved = true; assert.equal(selectNextRequest(rows, options).id, '3');
  rows[0].status = 'playing'; assert.equal(selectNextRequest(rows, options), null);
  rows[0].status = 'completed'; assert.equal(selectNextRequest(rows, options).id, '3');
  assert.equal(selectNextRequest([request(1, { baseScore: -100 })], { ...options, now: 0 }).id, '1');
  assert.equal(selectNextRequest([], options), null);
});
test('held requests retain their place in bulk accounting; bases and historical debits remain intact', () => {
  const rows = [request(1, { approved: false }), request(2), request(3, { protected: true, baseScore: 50, adjustments: [{ delta: -5 }] })];
  assert.deepEqual(scoreMap(rankRequests(rows, { ...options, now: 0 })), { 2: -10, 3: 45 });
});
test('policy rejects non-finite/overprecise inputs, duplicate ordering keys and invalid states', () => {
  for (const value of [NaN, Infinity, '25', 100.000001]) assert.throws(() => rankRequests([request(1, { baseScore: value })], options), TypeError);
  assert.throws(() => rankRequests([request(1)], { ...options, config: { agingIntervalMs: 0 } }), TypeError);
  assert.throws(() => rankRequests([request(1)], { ...options, config: { agingPoints: 0.0000001 } }), TypeError);
  assert.throws(() => rankRequests([request(1), request(1)], options), /Duplicate/);
  assert.throws(() => rankRequests([request(1), request(2, { sequence: 1 })], options), /sequence/);
  assert.throws(() => rankRequests([request(1, { status: 'unknown' })], options), /status/);
  assert.throws(() => rankRequests([request(1, { createdAt: -1 })], options), /timestamp/);
  assert.throws(() => rankRequests([request(1, { approved: 'true' })], options), /boolean/);
  assert.throws(() => applyAdjustment(request(1), NaN), TypeError);
});
