# Queue, triggers, and donations

Confirmed product decisions through 2026-10-04. The pure ranking/selection and adjustment-policy core is implemented in `src/queue.mjs`; persistent scheduling, payment integration and Arena playback are not yet connected. This score-based policy supersedes the initial strict Patreon > Twitch > everyone ordering.

## Playback

Default composition duration is 60 seconds, configurable by admins. Approved requests wait until current playback finishes. Choose the highest current score among eligible approved requests; oldest arrival wins ties. Admin requests have fixed priority 1000. All other requests have scores clamped to -100 through 100, including decimal values. Autoshuffle runs only when no eligible viewer requests are ready.

Users may queue several requests. Users cannot cancel once queued; admins and moderators may remove requests. Pending-count caps and intake rate limits remain undecided, not implicitly unlimited.

## Score components

- Standard request base: 0.
- Patreon/Twitch tier bases: configurable mappings such as 25, 50, and 75, administered on a Queue Configuration page. These are starting values, not permanent priority classes.
- Bulk penalty: -10 per earlier unprotected pending request from the same user. First unprotected pending request has no penalty, second has -10, third -20, etc. Recalculate as earlier requests finish or are removed; earned points remain intact.
- Waiting time: all pending non-admin requests gain points. Default +1 per minute; both amount (including decimals) and interval are configurable.
- Activity/Bits: configurable positive or negative trigger adjustments. Positive activity/Bits earning targets only the user's next request; after it plays the next becomes eligible. Allow Bits-triggered sabotage against another user's next request.
- Direct donations: configurable fixed or amount-scaled positive bonus plus protection when the configured minimum donation is met.

Proposed calculation: for an unprotected request, clamp(base + aging + retained trigger adjustments - 10 * earlier_unprotected_pending_count, -100, 100). For a protected request, omit the bulk penalty and reject negative effects. Admin score remains 1000. Record components separately so recalculation does not erase earned points. The current core makes the implementation choices documented below; product configuration and event ingestion remain separate work.

## Donation protection

A qualifying direct money donation linked to the request both boosts and protects it. PayPal, Cash App, or another provider are desired candidates; supported integrations and event verification are untested. Bits, Patreon membership, and Twitch subscriptions alone do not grant donation protection.

Admins configure the minimum amount and fixed/scaled bonus. Protected requests are immune to negative triggers, exempt from the bulk penalty, and excluded from the count used to penalize the user's other requests. Protection does not interrupt playback, override admin priority, or prevent moderator removal. No maximum-wait protection is required for unpaid requests; sabotage may delay them indefinitely.

Currency handling, attribution of a payment to a specific request, provider availability, refunds/reversals and negative trigger adjustments that predate protection remain unresolved. Do not infer a payment from a chat message or screenshot.

## Extensible triggers — architecture proposal

Represent each event with a stable event ID, verified source, actor, target request, signed decimal adjustment, timestamp, reason, and configuration version. A trigger registry can add new event types without rewriting the scheduler. Use provider-specific verification and deduplication before awarding points; resolve the target once so redelivery cannot boost the next request after the original plays.

Keep trigger configuration server-authorized. Do not expose arbitrary code execution in the dashboard. Propose previewing score effects before saving configuration, showing score breakdowns in the queue, and retaining an auditable event ledger separate from public gallery data. Rules for eligible chat activity, cooldowns, Bits-to-points mappings, sabotage targeting syntax, membership refresh, and trigger action on an empty queue remain open.

## Shuffle

Favor higher-ranked gallery entries earlier without repeating a composition within a cycle. Start another cycle only once all eligible entries have played. Viewer-request priority is independent of gallery upvotes. Persist cycle progress as a proposed implementation. Determine how requested plays, new/remixed entries, removal, and incompatibility affect eligibility before implementation.

## Validation examples

- Three unprotected requests have bulk components 0/-10/-20; completion or moderator removal shifts remaining components to 0/-10 without losing earned points.
- A protected request between two unprotected requests gets no bulk penalty and does not increase the later request's penalty.
- Waiting raises every pending non-admin score, while activity affects only the current per-user target.
- At non-admin score 100, admin 1000 still wins; equal scores preserve arrival order.
- Duplicate payment/Bits events apply once; sabotage cannot reduce a protected request.
- Low/negative viewer scores still precede shuffle if eligible; no new request interrupts the current slot.

## Current core implementation choices

These are explicit starting choices for the implementation, not newly confirmed product requirements:

- Scores use six decimal places with integer arithmetic internally. Input values with greater precision are rejected. Aging accrues continuously as elapsed milliseconds divided by the configured interval, truncating only below six decimal places. It never awards negative waiting time.
- Keep base, aging, adjustments and bulk components separate. Clamp only the visible score; points accumulated above/below the cap remain in the components. Base scores are supplied as an intake snapshot. Changing the passed aging/bulk configuration recalculates all current requests; versioning configuration changes is still pending.
- An earlier ordinary request continues to count toward its user's bulk penalty while playing; the penalty shrinks when it completes or is removed. Awaiting-approval requests count too, but cannot be selected. Protected and admin requests are exempt and excluded from these counts.
- Protection rejects new negative adjustments. Earlier debits remain in history; protection is not a retroactive refund. Trusted donation attribution and refunds still require implementation.
- Equal scores use server enqueue timestamp, then a unique per-instance arrival sequence. Platform-provided message timestamps must not be used to backdate priority.
- `selectNextRequest` returns no candidate while the target has a playing request, and otherwise returns the highest-ranked approved pending request, including negative-score requests. A null result is not automatic permission to shuffle: the playback controller must distinguish busy from empty.
- `applyAdjustment` operates only on an already-resolved pending target and returns a new request. It does not deduplicate, choose a user's next request, or verify payment/identity. Those boundaries must exist before exposing any intake endpoint. Pure input records with `protected: true` are trusted internal state, never proof of a donation.

`test/intake-policy.test.mjs` covers scoring, target isolation, approval filtering, no interruption, quote parsing and decimal edge cases. Persistent local-operator event deduplication is now implemented in `src/queue-store.mjs`; external identity/payment verification and shuffle remain unimplemented. Built-clip attachment, timed scheduling and explicit recovery now use `src/playback.mjs`. See [development status](DEVELOPMENT.md) for the store and API boundaries. Track remaining tasks in [TODO.md](../TODO.md).
