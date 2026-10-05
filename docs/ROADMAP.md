# Roadmap

Implementation started 2026-10-04. Use [TODO.md](../TODO.md) as the active checklist and handoff; this document records milestone outcomes. [Development status](DEVELOPMENT.md) distinguishes usable features from internal foundations. A milestone is complete only when its exit criteria are verified.

## 0 — Prove the connection and resolve integration scope

Local REST inspection and source/effect creation are verified against Arena 7.28 under Wine. Official MCP initialization and discovery returned 22 tools. Both Laya and Jev, built-in visual construction, local/remote targets and all Rezzo host OS families are confirmed directions.

Exit: documented compatibility, controllable targets and recovery limits. Remaining evidence includes MCP mutation routing, model contracts/budgets, clip playback/reconnect, supported platform/version matrix and complete Light/Full limits. Repository licensing remains an owner decision.

## 1 — Local operator prototype

Connection setup, catalog discovery, operator-selected plans, validation/review, serialized clip construction and local recipe archive are implemented. Keyword matching is not semantic AI. Tested queue policy and command parsing now exist as internal modules, without persistent intake/playback wiring.

Exit: the sample prompt creates a look from available built-ins; invalid/stale plans cause no writes; partial failures remain visible; the operator can pause and take over. Next work includes real provider decisions, color/motion plans and controlled playback.

## 2 — Twitch vertical slice

Connect verified Twitch events to linked identities, bounded/deduplicated intake, persistent requests, configuration and review, score-based scheduling and optional bot replies. The original strict subscriber priority classes are superseded by [queue policy](QUEUE_POLICY.md).

Exit: a real `!rezz` message progresses through review to a visible change; redelivery, spam, token revocation and reconnect do not cause surprise scene changes. Donation/subscription claims require verified provider evidence. No chat adapter is connected yet.

## 3 — Gallery, automatic operation and deployment

Extend the local archive with five-second animated previews, truthful export/reconstruction, attribution/remixes, tags and training provenance. Add bounded auto/trusted policies, configurable duration and ranked shuffle without repeats. Community adds Google/Discord/Twitch login, optional account/Patreon linking, authenticated-only access, moderation and social ranking.

Exit: persistent operations reconcile safely after restart, storage/retention is controlled, and installable/portable local/community profiles run on supported Windows/macOS/Linux targets. Validate remote pairing/revocation, per-instance isolation, upgrades, backups and restores. Keep community dependencies optional for local users.

## 4 — Additional chat platforms

Research and implement YouTube then Kick (order revisitable), plus scoped external-bot integration. Verify authorization, quotas, delivery guarantees and role mapping for each platform rather than assuming parity.

## Verification throughout

Use mock adapters and disposable storage for policy/contracts, duplicate delivery, reconnect and partial-write tests. Use browser checks for changed user flows and opt-in development Arena checks for hardware behavior. Never point CI at a live show. Cross-platform CI and release packaging remain outstanding tasks in the checklist.

Related requirements: [gallery](GALLERY_AND_INSTALLS.md), [training archive](TRAINING_ARCHIVE.md), [portability](PORTABILITY.md), [decisions](DECISIONS.md).
