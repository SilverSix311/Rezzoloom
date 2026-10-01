# Product brief

## Confirmed direction — 2026-10-01

- Project name: Rezzoloom.
- Users bring a working Resolume Arena installation.
- Connect, configure, and control Arena's visual feed with AI and MCP.
- Provide an operator web UI and an API for chat bot integrations.
- Parse `!rezz` requests, starting with Twitch; design for YouTube, Kick, and other platforms.
- Complete planning before application implementation.
- Model candidates: “Laya” for local use or “TypeScript’s Jev model”; exact references remain unverified.
- Repository visibility: public (user selected option 2).

## Proposed first experience

1. Operator connects to Arena and checks the detected composition and capabilities.
2. Operator identifies chat-controllable layers and tags prepared clips/sources with concepts such as synthwave, neon grid, warm, or ambient.
3. Operator connects Twitch, chooses allowed users and rate limits, and starts in review mode.
4. Viewer submits the example prompt from the README.
5. Rezzoloom proposes matching content, a palette, compatible effects, and a transition duration. It explains missing capabilities rather than inventing clips or effect names.
6. Operator approves; the executor rechecks the live state, applies the plan, and reports its outcome.
7. Operator can enable bounded automatic execution after validating the show configuration.

## MVP scope proposal

One operator, one Arena composition, one Twitch channel, prepared assets, one active execution at a time. Support clip selection, bounded effect parameters, palette controls where the asset supports them, and controlled transitions. Include a manual prompt box, a request queue, dry-run plans, status, pause, and recovery.

## Later

YouTube/Kick adapters, voting or paid priority policies, multiple channels, reusable show profiles, richer visual analysis, beat-aware scheduling, and optional generated assets. Each requires a separate scope decision.

## Outside the first version

Video generation on demand, automatic asset downloads, native Arena preset authoring, advanced output mapping, streaming/encoding, billing, and unattended multi-tenant hosting.

## Evidence of success

A real Twitch command changes an approved Arena target; unsupported requests receive a useful result; duplicate delivery cannot execute twice; a moderator can stop queued work; manual Arena edits do not get silently overwritten. Measure interpretation latency, execution latency, queue age, model cost, and recovery outcomes before setting release targets.
