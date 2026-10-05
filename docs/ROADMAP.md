# Roadmap

Implementation started 2026-10-04. The local connection manager, reviewed clip builder and recipe archive are implemented; remaining milestones are planned. See [current implementation](DEVELOPMENT.md).

## 0 — Resolve scope and prove the connection

- [x] Identify Laya and Jev by TypeSafe AI; confirm both for MVP support.
- [x] Confirm all Arena OSes targeted and local/LAN/remote connections; user reports Linux Arena available for functional tests.
- [x] Verify local Arena REST product/composition access: 7.28.0 under Wine on Linux.
- [x] Locate official MCP server and verify initialization + discovery of 22 tools (mutation routing still pending).
- [ ] Confirm model budget and supported Arena versions.
- [ ] Validate local Laya and hosted Jev against the same representative visual requests.
- [x] Confirm built-in visual construction, review/auto/trusted approvals, and Full/Light modes.
- [ ] Define concrete per-mode operations and intensity limits.
- [ ] Inspect official MCP capabilities and compare a constrained wrapper with a custom adapter.
- [ ] Verify reads, one clip trigger, one effect change, state updates, and reconnect on a real Arena installation.
- [ ] Record compatibility, measured latency, and gaps; select minimum version and implementation stack.
- [ ] Choose repository license before inviting broad code contributions.

Exit: a documented integration experiment demonstrates controllable targets and recovery limits without claiming unsupported vendor features.

## 1 — Local operator prototype

Build connection setup, catalog, a manual prompt input, structured plans, validation, review, serialized execution, status, and pause. A fake Arena adapter supports development without Arena.

Exit: the sample prompt creates a look from available built-in sources/effects; invalid or stale plans cause no writes; a partial failure is visible and recoverable where supported.

## 2 — Twitch vertical slice

Add authorization, verified chat events, parsing, deduplication, scoped intake API, queue/cooldowns, and optional bot responses. Keep one channel and one executor.

Exit: a real `!rezz` message progresses through review to a visible change; redelivery, spam, token revocation, and reconnect do not cause surprise scene changes.

## 3 — Bounded automatic mode and packaging

Add show profiles, spending limits, plan expiry, retention controls, recovery UI, and target-OS install instructions. Benchmark under realistic chat volume and Arena load.

Exit: operator can pause and take over; reconnect/restart never silently replay stale work; supported OS/Arena versions and observed latency are documented.

## 4 — Additional platforms

Research and implement YouTube then Kick (order revisitable), plus an external-bot integration guide. Verify each platform's authorization, quotas, delivery guarantees, and role mapping independently.

## Validation strategy when code exists

Parser cases and schema/policy rejection tests; contract tests against a fake adapter; replay/reconnect/partial-write scenarios; browser tests for setup and operator controls; opt-in hardware smoke tests against a disposable Arena composition. Never point CI at a live show. Runtime tests now cover the implemented local foundation and reviewed recipe execution; CI remains pending.

## Gallery and community workstreams — confirmed scope, sequencing pending

- [ ] Verify native composition save/load versus a Rezzo reconstruction artifact; choose truthful extensions and collision-safe user/hash names.
- [ ] Prove rendered-output capture on Windows/macOS and remote transfer; measure short WebM/GIF encoding impact.
- [ ] Implement local saved-prompt gallery, previews, metadata, filtering, and policy-checked reuse.
- [ ] Add community SSO/accounts, verified chat identity linking, roles, upvotes, moderation, and automatic gallery publishing with authenticated-only access.
- [ ] Implement Google/Discord/Twitch sign-in and optional provider linking; verify Patreon tiers and Twitch subscriptions.
- [ ] Validate 60-second configurable playback, non-interrupting score-based queues, and ranked shuffle without within-cycle repeats.
- [ ] Validate remote pairing/revocation, community data isolation, capture failures, filename collisions, duplicate votes, storage quotas, and restore/reuse compatibility.
- [ ] Package both profiles without imposing community services on local users.

- [ ] Implement/validate dynamic bulk penalties, decimal/time-configurable aging, extensible triggers, and verified donation protection under [queue policy](QUEUE_POLICY.md).
- [ ] Archive every entry with schema versions, lineage, truthful download format, and terms provenance; validate tag voting and credited remix behavior under [training archive](TRAINING_ARCHIVE.md).

## Portability workstream — confirmed scope

- [ ] Select installer and portable packages for Windows/macOS/Linux; define tested versions/architectures.
- [ ] Model explicit instance IDs throughout commands, approvals, queues and capture attribution.
- [ ] Validate two simulated targets with isolated scheduling, failures and state.
- [ ] Verify cross-host connections, separate connector packaging, authenticated pairing/revocation and data migration.
- [ ] Validate clean install, portable launch, upgrade/backup/restore and uninstall behavior.

See [portability requirements](PORTABILITY.md). Single-target early milestones do not defer target identity/isolation architecture.

## Current handoff — 2026-10-04

Studio preview 0.2.0 adds discovered source/effect catalogs, keyword suggestions, operator-selected recipes, a shared validated REST execution boundary and searchable local recipe gallery. Plans bind target/composition/slot, expire, serialize and cannot be retried after execution. Partial failures and process interruption remain explicit. Official MCP SDK diagnostic verifies 22 tool schemas; vendor mutation routing remains pending. The service is local-only and does not yet implement community authentication.

Browser built Lines + Blur in development Arena layer 1 slot 6 and verified the gallery entry. Arena readback confirms the source/effect and stopped clip. Node tests and syntax checks pass; see [development guide](DEVELOPMENT.md) for detailed verification and remaining scope. Next integrate actual Laya/Jev decisions and color/motion plans, then controlled playback, Twitch/queue, captures, accounts and cross-platform packaging. Do not label the keyword matcher as AI or the recipe download as a native Arena composition.
