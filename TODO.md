# Rezzoloom TODO

Active implementation checklist. Keep completed items backed by code/tests; update this file at each milestone. [Roadmap](docs/ROADMAP.md) describes milestone outcomes, [development status](docs/DEVELOPMENT.md) describes usable features, and the linked design documents preserve requirements. Checked work does not imply an entire feature is production-ready.

## Current work

- [x] Implement and test the shared `!rezz` parser: command boundaries, quotes, Unicode and configurable length limits.
- [x] Implement and test queue scoring: decimal aging, tier bases, dynamic bulk penalties, donation-protection exclusions, admin priority and FIFO ties.
- [ ] Add persistent queue requests/events and verified identity/approval boundaries; deduplicate events before resolving their target.
- [ ] Expose queue and score breakdowns in the operator UI with a Queue Configuration page.
- [ ] Connect reviewed plans to non-interrupting playback, configurable duration, pause/stop and restart reconciliation.

## AI and Arena control

- [ ] Verify current Laya and Jev contracts, configuration, availability, latency and budgets; implement both behind one decision interface.
- [ ] Replace keyword matching with grounded structured intent plans, including explicit unsupported intent.
- [ ] Add discovered color/motion parameter controls and validate ranges before execution.
- [ ] Define complete Light/Full policies independently of approval policy; add bounded auto/trusted approvals.
- [ ] Prove MCP target routing before vendor mutations; preserve the shared validator for every control path.
- [ ] Verify clip playback/stop, reconnect and recovery on development Arena; add operator pause.
- [ ] Support composition construction/replacement and recovery without claiming transactional rollback.
- [ ] Establish supported Arena versions and test Windows/macOS alongside Linux-hosted Rezzo.

## Chat, queue and events

- [ ] Implement Twitch authorization and verified chat ingestion, linking chat identity to Rezzo identity.
- [ ] Add event deduplication, intake limits, reconnect/revocation handling and scoped external-bot API.
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

Parser and pure queue policy are implemented and tested, but persistence, verified event intake, configuration UI and playback wiring remain next. Laya/Jev contracts and grounded parameter planning remain outstanding. No complete AI, live queue, capture or community-login claims.
