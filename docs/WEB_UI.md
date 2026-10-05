# Operator web UI proposal

## Setup

A guided connection screen for Arena address, connection test, detected version, composition, and available capabilities; clear diagnostics for offline/unsupported states. Follow with model configuration, Twitch connection, approved targets, visual catalog tagging, baseline selection, and a dry-run prompt. Offer local Laya and hosted Jev configuration; default selection remains undecided.

## Live console

- Persistent connection status, execution mode, and conspicuous pause control.
- Request queue with source, viewer, prompt, age, and disposition.
- Proposed changes with target names, parameters, transition, and missing capabilities.
- Approve, reject, admin/moderator removal, and manual prompt controls; users cannot cancel queued requests.
- Current observed state with a freshness indicator; clip thumbnails if supported.
- Execution results and partial-failure diagnostics with a baseline recovery action.

Show pause independently from approval and creative scope. Approval supports review, admin-enabled auto approval, and trusted-member auto approval. Creative scope supports Full and Light; Full can replace the whole composition. Show the active limits beside auto mode. A disconnected/stale state must never appear healthy. Manual takeover pauses automation until the operator resumes it.

## Show configuration

Choose controllable layers/effects, lock protected targets, tag assets, define allowed recipes and parameter ranges, set cooldowns and queue limits, and cap model spending. Profiles refer to stable IDs and must be revalidated when loaded into a different composition.

## UI boundaries

The MVP needs an understandable change summary more than a full Arena clone. Do not imply that thumbnails show the live rendered output. A continuous live video monitor is a later design decision. Short animated gallery previews are required. Use keyboard-accessible controls, non-color-only status indicators, and readable layouts during a live performance.

## Gallery and installation profiles

Both installs provide the [web gallery](GALLERY_AND_INSTALLS.md), with saved prompts, creator attribution, animated previews, user/tag filtering, date/rating sorting, and composition reuse. Community adds SSO, accounts, user upvotes, and moderation. Local mode retains its own gallery without requiring the community account infrastructure.

## Accounts and playback settings

Require Google, Discord, or Twitch sign-in for community service/gallery access; one is sufficient. Account settings allow linking the other providers and Patreon, and show verified membership/tier status. Registration is open. Gallery entries appear automatically, with previews pending if capture is unfinished. Admin settings control duration (60 seconds by default). Show the active composition, remaining time, prioritized request queue, and shuffle-cycle progress separately; new requests never automatically interrupt playback.

## Queue Configuration page

Admin controls for tier-to-base-score mappings (such as 25/50/75), decimal aging amount and configurable interval (default +1/minute), activity/Bits positive and negative triggers, and donation thresholds/bonuses with fixed and scalable options. Show bulk, age and event score components, protection state, and current ordering. User scores clamp to -100..100; admin stays 1000. New trigger types should be extensible. See [queue policy](QUEUE_POLICY.md).

## Gallery detail and account terms

Offer authenticated downloads, five-second previews, remix actions with parent credit, prompt history and tags. Creators edit their tags, admins/mods edit any, and members suggest/vote on tag accuracy separately from composition upvotes. Signup clearly discloses training use and records accepted terms version; training export is not an ordinary gallery download.

## Arena connection manager

Add, pair, name, inspect and revoke multiple Arena targets. Show OS/version/capabilities and connectivity per target. Each live console and queue must clearly identify its destination; choose a target before submitting a gallery replay or manual request. Assign chat/show profiles to targets explicitly. Grouped or synchronized playback is not yet specified.
