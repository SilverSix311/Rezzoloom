# Roadmap

Each milestone is proposed; no application work has started.

## 0 — Resolve scope and prove the connection

- [ ] Identify the exact Laya/Jev projects, deployment machine, Arena version, and model budget.
- [ ] Choose first-show assets, controllable targets, and review versus automatic mode.
- [ ] Inspect official MCP capabilities and compare a constrained wrapper with a custom adapter.
- [ ] Verify reads, one clip trigger, one effect change, state updates, and reconnect on a real Arena installation.
- [ ] Record compatibility, measured latency, and gaps; select minimum version and implementation stack.
- [ ] Choose repository license before inviting broad code contributions.

Exit: a documented integration experiment demonstrates controllable targets and recovery limits without claiming unsupported vendor features.

## 1 — Local operator prototype

Build connection setup, catalog, a manual prompt input, structured plans, validation, review, serialized execution, status, and pause. A fake Arena adapter supports development without Arena.

Exit: the sample prompt maps to actual prepared content; invalid or stale plans cause no writes; a partial failure is visible and recoverable where supported.

## 2 — Twitch vertical slice

Add authorization, verified chat events, parsing, deduplication, scoped intake API, queue/cooldowns, and optional bot responses. Keep one channel and one executor.

Exit: a real `!rezz` message progresses through review to a visible change; redelivery, spam, token revocation, and reconnect do not cause surprise scene changes.

## 3 — Bounded automatic mode and packaging

Add show profiles, spending limits, plan expiry, retention controls, recovery UI, and target-OS install instructions. Benchmark under realistic chat volume and Arena load.

Exit: operator can pause and take over; reconnect/restart never silently replay stale work; supported OS/Arena versions and observed latency are documented.

## 4 — Additional platforms

Research and implement YouTube then Kick (order revisitable), plus an external-bot integration guide. Verify each platform's authorization, quotas, delivery guarantees, and role mapping independently.

## Validation strategy when code exists

Parser cases and schema/policy rejection tests; contract tests against a fake adapter; replay/reconnect/partial-write scenarios; browser tests for setup and operator controls; opt-in hardware smoke tests against a disposable Arena composition. Never point CI at a live show. No runtime CI or fabricated passing tests are included in this documentation-only stub.
