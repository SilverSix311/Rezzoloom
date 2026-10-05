# Rezzoloom TODO

Active implementation checklist. Keep completed items backed by code/tests; update this file at each milestone. [Roadmap](docs/ROADMAP.md) describes milestone outcomes, [development status](docs/DEVELOPMENT.md) describes usable features, and the linked design documents preserve requirements. Checked work does not imply an entire feature is production-ready.

## Current work

- [x] Implement and test the shared `!rezz` parser: command boundaries, quotes, Unicode and configurable length limits.
- [x] Implement and test queue scoring: decimal aging, tier bases, dynamic bulk penalties, donation-protection exclusions, admin priority and FIFO ties.
- [x] Persist local operator queue requests/events and approvals; deduplicate events before resolving their target.
- [ ] Add verified external identity/payment adapters to queue intake (local operator only today).
- [x] Expose queue and score breakdowns in the operator UI with a Queue Configuration page.
- [x] Attach successfully built recipes to requests and require fresh playback approval.
- [x] Schedule built clips without interruption, with per-request duration and pause/stop controls.
- [x] Pause on restart/uncertain outcomes and provide read-only reconciliation and owned-clip stop.

## AI and Arena control

- [ ] Verify current Laya and Jev contracts, configuration, availability, latency and budgets; implement both behind one decision interface.
- [ ] Replace keyword matching with grounded structured intent plans, including explicit unsupported intent.
- [ ] Add discovered color/motion parameter controls and validate ranges before execution.
- [ ] Define complete Light/Full policies independently of approval policy; add bounded auto/trusted approvals.
- [ ] Prove MCP target routing before vendor mutations; preserve the shared validator for every control path.
- [x] Verify clip activation, timed stop/advancement and restart recovery on development Arena; add operator pause.
- [ ] Broaden playback compatibility beyond Own Layer/Normal/no-snap/no-transition clips; test reconnect on Windows/macOS.
- [ ] Support composition construction/replacement and recovery without claiming transactional rollback.
- [ ] Establish supported Arena versions and test Windows/macOS alongside Linux-hosted Rezzo.

## Chat, queue and events

- [x] Add local Twitch public-client authorization, Configuration UI and verified-sender chat intake into the review queue (offline-tested).
- [ ] Verify live Twitch authorization/chat with a configured public application; link Twitch identities to community Rezzo accounts.
- [x] Persist Twitch message deduplication and intake limits; handle server reconnect handoff and revocation.
- [ ] Add automatic recovery after unexpected disconnects, secure token persistence/refresh, configurable intake limits and scoped external-bot API.
- [ ] Apply extensible positive/negative triggers to the user's next request; prevent redelivery from targeting a later request.
- [ ] Verify Patreon/Twitch tiers and snapshot their configured starting score at submission.
- [ ] Verify direct-donation provider events, currency rules, attribution and refund handling; implement configurable boost/protection.
- [ ] Add ranked shuffle with persisted no-repeat cycles, only when no eligible viewer request is ready.
- [ ] Add YouTube and Kick adapters after checking current platform contracts.

Details: [queue policy](docs/QUEUE_POLICY.md), [chat contract](docs/CHAT_AND_API.md).

## Gallery and training archive

- [ ] Capture five-second GIF/WebM previews; measure encoding cost and handle capture failures.
- [ ] Verify native composition export/import or implement truthful portable Rezzo reconstruction downloads.
- [ ] Archive content created/used outside the current recipe flow; support user attribution and credited remix ancestry.
- [ ] Add editable tags, community tag confirmation, composition upvotes and user/tag/rating filters.
- [ ] Add schema-versioned training exports, terms provenance, deletion/retention, backup and storage limits.
- [ ] Verify download delivery in supported browsers and larger-gallery pagination.

Details: [gallery and installs](docs/GALLERY_AND_INSTALLS.md), [training archive](docs/TRAINING_ARCHIVE.md).

## Community, security and distribution

- [ ] Add Google/Discord/Twitch sign-in, open registration, optional identity linking and Patreon linking.
- [ ] Require community login for service/gallery access; enforce owner/mod/admin permissions and session security.
- [ ] Add authenticated encrypted remote connectors with target pairing and revocation.
- [ ] Package lightweight local and community profiles for Windows/macOS/Linux, including portable releases.
- [ ] Verify clean install, upgrade/migration, backup/restore and uninstall on each platform.
- [ ] Select a repository license with the owner.

Details: [portability](docs/PORTABILITY.md), [open decisions](docs/DECISIONS.md).

## Completed foundation

- [x] Install Impeccable skill and refine the local UI into responsive Gallery, Studio and Connections views; record the design system.

- [x] Local web console, saved multiple Arena targets, isolated inspection and diagnostic snapshots.
- [x] Live source/effect/empty-slot discovery and explicitly labeled keyword suggestions.
- [x] Operator-reviewed recipes, expiry/stale-state checks, serialized writes and uncertain-outcome handling.
- [x] Local recipe archive with search/sort/reuse and JSON download controls.
- [x] Official MCP SDK discovery; 22 vendor tool schemas verified.
- [x] Browser build of Lines + Blur in an empty development slot, confirmed by Arena readback.
- [x] Automated connection/studio tests and syntax checks. No claim of full cross-platform verification.

## Current handoff

UI refinement now provides distinct hash-routed views, local gallery status/search filters, a side-by-side desktop recipe review, responsive mobile navigation, self-hosted Manrope and reduced-motion support. Backend authorization and review controls remain intact. Impeccable was installed as a user skill; no paid Figma workflow or continuous design service was added. DESIGN.md records the system. Browser verification and final validation are recorded in the development guide.

Persistent local operator queue and event receipts now accompany the parser/scoring core. Queue and Configuration pages support approval/removal, manual next-request adjustments, tier starting values and aging/bulk settings. Built-clip attachment, playback approval, timed advancement and pause/stop/reconciliation are now implemented. Twitch local sender identity intake is implemented; live provider verification and community identity/payment linkage remain next. Laya/Jev contracts and grounded parameter planning remain outstanding. The queue can now play operator-built clips; no complete AI, live Twitch validation, full-composition generation, capture or community-login claims.

Twitch checkpoint (2026-10-05): Configuration saves public app ID/channel/Arena target. Device authorization is memory-only and chat-read-only. Requests are held for recipe attachment/approval; badges never grant priority or protection. Forty automated tests pass; desktop/mobile configuration and required-field states checked. Live consent/chat remains untested until the operator configures their app. See [Twitch setup](docs/TWITCH.md).
