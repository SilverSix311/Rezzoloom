# Decisions to discuss

Confirmed requirements live in [PRODUCT.md](PRODUCT.md). The questions in the table remain open; proposed defaults do not represent user approval.

| Priority | Question | Proposed starting point |
| --- | --- | --- |
| First | Which Arena version will be used? | User-reported Linux functional instance now available; Windows rig remains planned; support all Arena OSes, with local/LAN/remote connections |
| Next | What should missing intent do? | Show limitation and use only supported matches |
| Next | How fast, how often, and at what model cost? | Measure first; set request and spending budgets |
| Next | Should the UI show a live video preview? | State and thumbnails first; research capture separately |
| Next | Which license? | No license selected yet |
| Later | How long should chat prompts and logs be kept? | Minimal retention with configurable deletion |

## Confirmed: model support — 2026-10-01

Support both local [Laya](https://github.com/NandhaKishorM/laya) and hosted [Jev by TypeSafe AI](https://typesafe.ai/blog/introducing-system-one-models-and-jev) in the MVP. The user selected both rather than prioritizing one. Correct the earlier company-name transcription: TypeSafe, not TypeScript. This adds two integrations to validate; a shared decision interface is proposed. Default selection, automatic fallback, and feature parity remain undecided.

## Confirmed: deployment, creative scope, and community — through 2026-10-03

User selected Rezzo as the short name, local or remote connection to existing Arena installs, all supported Arena OSes, and reuse of official MCP where possible. Built-in sources/effects are the creative medium; no external AI media generation initially. Approval and creative scope are independent: admin-toggled automatic approval plus trusted-member auto approval; Full versus Light modes, with entire-composition replacement permitted in Full.

Both lightweight local and community installs need a web gallery retaining prompts and created/used compositions, user-plus-short-hash filenames, animated GIF/WebM previews, user/tag filters, upvotes, and date/rating sorting. Community adds SSO and account/server functionality. See [gallery design](GALLERY_AND_INSTALLS.md) for confirmed requirements and proposed mechanisms. These requirements supersede earlier single-host/prepared-assets-only proposals.

## Confirmed: accounts, gallery access, and playback — 2026-10-03

Everything created/used goes into the gallery automatically. Sign-in is required to view the community gallery or use the service, but anyone can join. Any one Google/Discord/Twitch identity is enough; additional identities can be linked in account settings. Patreon also links in settings to verify membership/tier. Upvotes affect gallery ranking, not viewer-request priority.

Composition duration defaults to 60 seconds, admin-configurable. Approved requests wait for the current playback to finish. The original strict subscriber-tier ordering was superseded on 2026-10-04 by [score-based priority](QUEUE_POLICY.md). Admins remain first and shuffle remains the fallback. Equal scores use arrival order. Shuffle favors higher-ranked entries without repeating within a cycle; a new cycle starts once all eligible entries have played.

## Confirmed: scoring, archives, and test host — 2026-10-04

Multiple pending requests per user; no user cancellation, admins/mods can remove. Admin score 1000; non-admin -100..100 with decimal support. Standard base 0, configurable Patreon/Twitch tier bases (25/50/75), dynamic -10 bulk steps that shrink as requests finish or are removed. All pending requests age at default +1/minute, amount and interval configurable. Activity/Bits earning targets only the user's next request. Extensible positive/negative triggers include sabotage; unpaid requests may be delayed indefinitely.

Qualifying direct-money donations boost and protect their linked request: configurable minimum and fixed/scaled bonuses; immunity to negative effects, no bulk penalty, and exclusion from others' bulk counts. Bits/subscription status alone is not protection. Provider integrations remain unverified.

Five-second animated previews, downloads, training-friendly archives with use clearly disclosed in signup terms, automatic/editable tags, community tag +1/-1 voting, and credited remixes are confirmed. Multiple-composition mixing is an extension to explore. See [gallery](GALLERY_AND_INSTALLS.md), [queue](QUEUE_POLICY.md), and [archive](TRAINING_ARCHIVE.md) specifications.

User reports a working low-performance Arena installation on this Linux machine, available for functional testing. Version, runtime, API/MCP access, capture, and persistence are not yet verified; Windows/macOS portability remains to test. The documentation consolidation initially preceded implementation; the user subsequently authorized building the product on 2026-10-04.

## Confirmed: portable and multiple-instance operation — 2026-10-04

Rezzo itself must run on Windows, macOS, and Linux as a portable/installable system. It must connect to multiple existing Arena instances regardless of whether they are local or remote. This settles host OS families and makes instance isolation/routing an architectural requirement. Exact platform versions, CPU architectures, formats and synchronization behavior remain open; see [portability plan](PORTABILITY.md).

## Remaining decisions

Focus next on capability discovery and broad product questions, not another exhaustive queue walkthrough. Unresolved: Arena version/runtime, native export/replay/capture, remote connector, implementation stack, model budgets, concrete Full/Light boundaries, licensing, provider integration contracts, archive retention/deletion/backup, dataset format and supported training method, release phasing. Queue precision/clamping history, event-target ordering, membership changes, refund handling and shuffle eligibility need documented implementation choices later.

## Decision record template

For each settled choice, record: date, status, decision, reason, alternatives, consequences, and evidence. Link to any compatibility experiment. Revisit proposals when real Arena behavior contradicts assumptions.

## Implementation started — 2026-10-04

First slice uses dependency-free Node >=24 ES modules and browser JavaScript, with atomic local JSON profile persistence. Read-only Arena 7.28.0 REST inspection verified under Wine on Linux. This selects a lightweight initial stack without committing future UI/provider integrations to React or TypeScript. See [development status](DEVELOPMENT.md).
