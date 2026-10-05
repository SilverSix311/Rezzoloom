# Gallery and installation profiles

Planning only. Requirements confirmed in the user discussion through 2026-10-04; mechanisms below are proposals unless marked confirmed.

## Confirmed requirements

- Rezzoloom may be called Rezzo.
- Everything created or used enters the gallery automatically; no separate publication approval.
- Community service and gallery require sign-in; anyone may join without invitation or membership approval.
- Sign up with any one of Google, Discord, or Twitch; optionally link the others in account settings to one Rezzo account.
- Patreon is an additional optional linked account in settings for membership/tier verification and queue priority. Patreon as an initial sign-in provider has not been requested.
- Upvotes affect gallery ranking, not the priority of submitted playback requests. Autoshuffle separately favors higher-ranked entries.
- Both lightweight local and community installations have a web gallery of everything created or used, with saved prompts and reusable composition references.
- Community installs include SSO, accounts, and server features for larger communities, including Twitch streams and Discord video groups. A Discord bot or video integration has not yet been scoped.
- Each saved composition is named for its user plus a short hash: `Gimmesamoa.SampleHash.extension`.
- Gallery entries have a five-second animated screen-capture loop in GIF or WebM form. Downloads, training archives, creator-editable tags, community tag voting, and credited remixes are confirmed; see [archive plan](TRAINING_ARCHIVE.md).
- Filter by user and tags (for example, acid trip or fractal); allow user upvotes and sorting by rating and newest/oldest.
- Full mode may replace the entire composition when needed. Light mode restricts creative scope/intensity. These modes are independent of request approval.

## Two installs, shared core — proposal

| Capability | Local | Community |
| --- | --- | --- |
| Arena connection | Same machine, LAN, or remote | Same machine, LAN, or remote |
| Models | Local Laya or hosted Jev | Local Laya or hosted Jev |
| Gallery | Local files and lightweight metadata storage | Shared metadata and media storage |
| Accounts | Local operator; community account stack unnecessary | SSO identities, member roles, sessions, moderation |
| Ratings | Shared schema; operator rating/favorites proposed | Authenticated member upvotes |
| Background work | Small, on-demand capture queue | Bounded workers with quotas |

Installation profile and Arena location are separate choices: a lightweight local install can connect to a remote Arena. Do not require Redis, a distributed queue, or community identity services for the local profile. Final host OS matrix, database, identity integration libraries, capture software, and packaging remain open. Aim for Windows/macOS Arena connectivity; Windows remains a target test machine; on 2026-10-04 the user reported Arena working locally on Linux for low-performance functional tests. This has not yet been inspected and does not establish vendor Linux support. Rezzo service hosting should be portable, with each promised platform tested.

## Gallery record and naming — proposal

Store a stable entry ID, creator platform ID or linked account ID, display name, original prompt, timestamps, tags, approval/control modes, provider/model version, Arena version and capability requirements, reproduction recipe, artifact references, capture state, and usage history. A reused composition should retain its creator and record who reused it separately. Failed/rejected requests remain visible in request history without posing as successful gallery compositions.

Use a sanitized username in filenames while retaining the original display name in metadata. Generate a short hash from the saved revision, verify uniqueness, and lengthen it on collision. Never use a display name as authentication or let it supply filesystem paths. Edits create revisions rather than silently overwriting another result.

The extension must match the actual artifact. A Rezzo recipe/manifest is not a native Arena composition file. Investigate native save/export and reliable reopening before selecting an extension or promising portable native files. Keep sufficient source/effect/parameter state to evaluate reconstruction; a prompt alone is not reproducible. Missing dependencies and unsupported operations must be shown before reuse. Exact fidelity, timing, and random-source state need testing.

## Animated preview — proposal

Capture the rendered Arena output after a successful change has settled, not the operator's whole desktop. Prefer a short muted WebM loop with a still poster; offer GIF if needed. Default duration is confirmed at five seconds; dimensions, frame rate, codec, and size cap need agreement and hardware measurement. Queue one bounded capture at a time on a lightweight host; avoid continuous recording.

A proposed connector on the Arena machine would provide capture and access to the local vendor MCP server, forwarding through authenticated encrypted connections. Do not assume the vendor MCP can record video or expose a remote network endpoint. Prove the capture path on Windows and macOS; remote Rezzo servers cannot directly screen-capture another machine.

Track pending, ready, failed, and unsupported previews. Capture failures should allow retry without losing the prompt/recipe. Resource limits should protect Arena rendering. Native capture, encoding, output selection, and upload are untested integration work.

## Browsing and reuse — proposal

Search prompts and names; combine user/tag filters with date, score, and compatibility filters. In addition to requested newest/oldest and rating sorts, consider most-used and recently-used. Show animated previews on interaction and respect reduced-motion preferences. Detail views show the original prompt, author, tags, compatible versions, preview, and revision.

A “use this composition” action submits a normal request through current approval and Full/Light policy; gallery popularity never grants execution authority. Missing capabilities should be reported before changes. Downloads and credited remixes are confirmed; gallery-to-gallery import/export remains open. Community gallery access requires sign-in.

## Community identity and access — design requirements to validate

Use an established SSO protocol/library; OIDC is a candidate, not yet selected. Scope identity by provider and immutable subject, and require verified linking for chat identities. A matching username must never confer trusted status. Separate admin, moderator, trusted member, and member permissions; enforce authorization on the server and on each community's resources.

Propose one upvote per authenticated account per entry, with removal supported; anonymous browsing is disallowed. Protect sessions, provider callbacks, credentials, rate limits, and community boundaries; use established authentication components rather than inventing password or token cryptography. Specific controls must be reviewed against selected libraries before implementation. Local mode still requires protection appropriate to any network exposure.

Creators can edit their tags; admins/mods can edit any entry; members can suggest tags and vote +1/-1 on their accuracy. Define reporting/hiding entries, account removal, retention, storage quotas, backups, and deletion of previews/artifacts. The goal of retaining everything needs explicit disk-budget and deletion behavior. Do not silently publish a local gallery to a community instance.

## Playback and queue — confirmed

Default duration is 60 seconds, configurable by admins. Requests wait for current playback to finish. The [score-based queue](QUEUE_POLICY.md) is authoritative and supersedes the earlier strict tier ordering: admin 1000, non-admin -100..100, configurable tier bases, waiting-time growth, dynamic bulk penalties, and extensible activity/Bits/donation triggers. Qualifying direct donations boost and protect their linked request. Users cannot cancel; admins/mods can remove.

Shuffle favors higher-ranked entries, without repeats until the eligible set has played. Gallery votes never directly reorder viewer requests.

## Identity and scheduling details still to validate

Implement linked accounts using the providers' supported authorization flows, with exact protocols/scopes verified before code. Do not assume every provider implements OIDC. Store provider/subject mappings; require an authenticated account and proof of control to link another identity. Define collisions, unlinking, and recovery before implementation.

Verify Patreon entitlement and Twitch subscriber status server-side; neither user-entered tier names nor matching display names establish priority. Campaign/channel mapping, exact tier-to-score mappings, refresh/revocation policy, multiple linked memberships, and temporary verification outages remain unresolved. Patreon linking does not automatically grant trusted-member approval status.

Persist a shuffle cycle's eligible set and played IDs as a proposed implementation. Confirm whether manually requested plays consume a shuffle slot, what happens when entries become ineligible or are added mid-cycle, and whether consecutive cycle boundaries may repeat a composition. Exact ranking weights remain undecided.

Queue waiting time and plan freshness are separate; revalidate a plan at its turn without silently discarding an accepted request. Unpaid requests may be delayed indefinitely by negative triggers. See [queue policy](QUEUE_POLICY.md) for donation protection and configuration.

## Current planning status

Confirmed requirements are consolidated. Remaining technical investigations are tracked in [roadmap](ROADMAP.md), with training/download details in [archive plan](TRAINING_ARCHIVE.md).
