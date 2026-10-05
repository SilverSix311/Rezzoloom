# Product brief

## Confirmed direction — updated 2026-10-04

- Project name: Rezzoloom; Rezzo for short.
- The user reports local Arena working on Linux for functional testing (2026-10-04), with low performance; Windows testing remains planned; connect to Arena on every supported Arena OS (currently Windows/macOS). Rezzo can run separately with local, LAN, or remote connectivity.
- Reuse official Resolume MCP where possible, adding controls and filling gaps.
- Create new visuals from built-in Arena sources and effects; no external AI image/video generation initially.
- Offer review and admin-toggled auto approval, with automatic approval for trusted members.
- Separate Full and Light creative modes; Full may replace the entire composition.
- Offer lightweight local and community installs, both with saved-prompt web galleries and animated previews. Community adds Google/Discord/Twitch sign-in, optional Patreon linking, and user upvotes; see [gallery plan](GALLERY_AND_INSTALLS.md).
- Users bring a working Resolume Arena installation.
- Connect, configure, and control Arena's visual feed with AI and MCP.
- Provide an operator web UI and an API for chat bot integrations.
- Parse `!rezz` requests, starting with Twitch; design for YouTube, Kick, and other platforms.
- Complete planning before application implementation.
- MVP model support: both local Laya and hosted Jev by TypeSafe AI (confirmed 2026-10-01).
- Repository visibility: public (user selected option 2).

## Proposed first experience

1. Operator connects to Arena and checks the detected composition and capabilities.
2. Operator selects Full or Light mode and catalogs built-in sources/effects with concepts such as synthwave, neon grid, warm, or ambient.
3. Operator connects Twitch, chooses trusted members and rate limits, and selects review or automatic approval.
4. Viewer submits the example prompt from the README.
5. Rezzoloom proposes matching content, a palette, compatible effects, and a transition duration. It explains missing capabilities rather than inventing clips or effect names.
6. Approval policy permits execution; the executor rechecks the live state, applies the plan, and reports its outcome.
7. Operator can enable bounded automatic execution after validating the show configuration.

## MVP scope proposal

Start validation with one Arena connection and Twitch channel, then validate both install profiles. Use built-in elements to construct new looks, with one active execution per Arena connection at a time. Support clip selection, bounded effect parameters, palette controls where the asset supports them, and controlled transitions. Include a manual prompt box, a request queue, dry-run plans, status, pause, and recovery.

## Later

YouTube/Kick adapters, multiple channels, richer visual analysis, and beat-aware scheduling. Patreon/Twitch subscription priority is confirmed; gallery votes do not affect viewer-request priority. Each requires a separate scope decision.

## Outside the first version

Video generation on demand, automatic asset downloads, native Arena preset authoring, advanced output mapping, full streaming/broadcast encoding and a custom billing system. Integrations for verified direct-donation events are in scope, with providers still to be validated. Short gallery preview capture/encoding and community hosting are required; shared multi-community tenancy remains undecided.

## Evidence of success

A real Twitch command changes an approved Arena target; unsupported requests receive a useful result; duplicate delivery cannot execute twice; a moderator can stop queued work; manual Arena edits do not get silently overwritten. Measure interpretation latency, execution latency, queue age, model cost, and recovery outcomes before setting release targets.

## Confirmed gallery and playback behavior

Everything created/used is saved automatically. Community access requires sign-in but registration is open to anyone. Link additional accounts in settings. Playback defaults to 60 seconds, adjustable by admins; approved requests wait their turn. Admin requests score 1000; all other requests use configurable tier starting scores, aging, bulk penalties and event adjustments within -100..100. Qualifying direct donations boost and protect a request. Viewer requests precede shuffle. FIFO breaks ties. Shuffle cycles contain no repeats until all eligible compositions play. See [gallery plan](GALLERY_AND_INSTALLS.md).

Gallery downloads, five-second previews, auto/user tags with community +1/-1 confirmation, credited remixes, and training-friendly archives are confirmed. Training use is disclosed in signup terms. See [queue policy](QUEUE_POLICY.md) and [archive plan](TRAINING_ARCHIVE.md).
