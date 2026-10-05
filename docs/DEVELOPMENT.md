# Development and current implementation

## Run the studio preview (0.2.0)

Use Node.js 24 or newer. Run `npm ci`, then `npm start`, and open http://127.0.0.1:4310. Windows can use `start.cmd`; macOS/Linux can use `./start.sh`. These are source launchers, not bundled installers. The HTTP service itself still uses Node built-ins; the official MCP diagnostic uses the pinned `@modelcontextprotocol/sdk` 1.32.0 dependency.

Set `REZZO_DATA_DIR` to change persistent storage (default: `.rezzoloom` in your home folder), and `REZZO_PORT` to change port 4310. Run one process per data directory. Stop with Ctrl+C. Saved connections and gallery recipes survive restart. Arena health is checked on demand.

The service binds only to loopback. It is a trusted local operator console, not the community account system: other local processes/users able to reach this port are inside its trust boundary. Host/origin/Fetch Metadata checks, a same-origin session token, CSP, and escaped DOM text protect the browser boundary. Do not expose this preview through a reverse proxy. Targets are operator-selected HTTP(S) origins; TLS is validated, redirects and embedded credentials rejected. Remote connector pairing remains unimplemented.

## Working flow

1. Save an Arena connection with its Webserver & REST API enabled.
2. Open **Prompt studio** on that connection. Rezzo reads product/composition, video sources and effects from that target. Capture devices are excluded from the source selector.
3. Enter a prompt. **Find catalog matches** uses literal keyword ranking over live names/descriptions. It is not Laya/Jev or semantic AI and does not set colors or animation parameters.
4. Choose a source, an empty clip slot and effects. Light permits one effect; Full permits four. Both currently create one clip with Arena defaults. These counts are preliminary limits, not the complete planned Light/Full policies or a photosensitivity guarantee.
5. Preview the recipe, then explicitly approve its build. The server binds the plan to its target, composition structure/deck and empty clip ID. Plans expire after ten minutes. It rechecks live state before writing and serializes requests per instance.
6. The build loads the source and adds effects via verified REST operations. Readback checks source description and effect names. The clip remains stopped; trigger it in Arena yourself. No playback, global mix or existing content is deliberately changed.
7. Local gallery archives planned, applied and failed/uncertain attempts. Search prompt/source/effect/status, sort by date, reuse a recipe through a fresh review, or download its `.rezzo.json` record.

Writes are not transactional. Arena has no compare-and-swap in this adapter, so avoid editing the target slot while a recipe executes. A timeout or mismatched readback is archived as `uncertain`; never automatically retry. A restart changes persisted `executing` entries to `interrupted`. Inspect Arena and create a fresh plan if needed. Completed operations are not automatically rolled back.

Gallery files are private local JSON records in `gallery/`. They retain prompt, actual selected catalog entries, target, mode, timestamps, command acknowledgements and before/after state. Downloads use `Operator.<short-id>.rezzo.json`. They are not native Arena compositions, portable replay files, or a finished training dataset. State can include local asset paths; review records before sharing them. Import, automated capture of changes made outside Rezzo, animated previews, ratings, tag edits, community accounts and consent provenance are pending. JSON storage is an early local implementation, without quotas or large-community pagination yet.

## HTTP surface

All endpoints except `/api/session` require the local bearer session and browser-origin checks.

| Method / path | Behavior |
| --- | --- |
| GET/POST `/api/instances` | List/add saved target |
| DELETE `/api/instances/:id` | Remove saved target |
| POST `/api/instances/:id/inspect` or `/snapshot` | Read summary or diagnostic state |
| POST `/api/instances/:id/catalog` | Read current sources/effects/empty slots |
| POST `/api/instances/:id/suggest` | Keyword matches for `{prompt}` |
| POST `/api/instances/:id/plan` | Persist `{prompt,mode,sourceId,clipId,effectIds}` as reviewed candidate |
| POST `/api/instances/:id/execute` | Execute `{planId,approved:true}` once after revalidation |
| GET `/api/gallery` or `/api/gallery/:id` | List recipe metadata or read full record |

These endpoints are local operator capabilities, not an authenticated audience/bot API. A caller cannot supply arbitrary outbound paths, native file paths or vendor MCP calls through the executor.

## Official MCP discovery

Run `npm run mcp:discover -- /path/to/resolume_arena_mcp_server [arguments...]`. It initializes an SDK stdio client, reads the paginated tool catalog, prints JSON and shuts down. It calls no mutation tools. The executable is supplied by the operator; Rezzo does not redistribute proprietary vendor binaries or expose process launch over HTTP.

On Windows, the observed default executable is `C:\Program Files\Resolume Arena\mcp\resolume_arena_mcp_server.exe`. On macOS locate the executable within your Arena installation. Linux testing used the existing Wine runner and vendor Windows binary, with `WINEPREFIX`/`WINEDEBUG` passed explicitly. Paths are machine-specific and are not hardcoded. The installed 7.28 MCP bundle declares Windows/macOS compatibility. Native Linux support is not implied.

Verified 22 tool schemas from vendor server `7.28.0-rev24303`. The CLI has no Arena endpoint flag. Multi-target MCP routing is not yet validated; target-specific REST writes remain the current executor. A future connector must prove target identity before enabling vendor mutation tools.

## Validation and remaining work

Run `npm test` and `npm run check`. Tests cover connections and browser boundary, persistence/corrupt data, catalog matching, expiry, resource validation, target isolation, stale plans, duplicate/concurrent execution, uncertain writes and restart recovery. Tests use disposable data and mock adapters; ordinary tests do not touch Arena.

Observed 2026-10-04 on Linux, Node 26.8.1: reopened official Arena 7.28.0 revision 24303 under the existing Wine runner. Browser flow discovered 21 video sources and 113 effects, reviewed and built **Lines + Blur** in **Rezzoloom Development**, layer 1 slot 6 (previously empty). Independent readback confirmed Lines, Transform + Blur and Disconnected state. No existing clips were removed and playback was not triggered. Browser gallery displayed the applied recipe. Browser download filesystem delivery remains unverified. Windows/macOS and Node 24 execution remain untested here.

Next: Laya/Jev provider integration and semantic plans, color/motion parameter validation, broader playback compatibility, live Twitch validation, animated gallery captures, richer archive metadata, community SSO and packaging. The current preview does not implement the complete product.

References checked 2026-10-04: [Resolume OpenAPI](https://resolume.com/docs/restapi/swagger.yaml), [official MCP documentation](https://resolume.com/support/en/mcp-servers), installed vendor 7.28 manifest/tool schemas. SDK Context7 results mixed v1/main examples; APIs were verified against installed 1.32.0 declarations and the real discovery run, with [upstream v1 client docs](https://github.com/modelcontextprotocol/typescript-sdk/blob/v1.x/docs/client.md) as the matching branch reference.

## Chat and queue policy core

`src/chat.mjs` now parses bounded `!rezz` commands and returns accepted/ignored/rejected text results. `src/queue.mjs` computes target-specific scores and breakdowns, validates decimal inputs, filters approvals, applies the protection rule to pre-verified adjustments and prevents selecting a new request while one is playing. These pure modules do not run timers, persist queues, validate external identities/payments, send messages or control Arena. They are not exposed as HTTP chat endpoints yet.

Nineteen automated tests pass after this increment, including eight parser/policy cases. No browser or Arena flow changed, so no additional live mutations were needed. Implementation choices and examples are in [queue policy](QUEUE_POLICY.md); remaining work and the active handoff are in [TODO.md](../TODO.md).

## Interface refinement — 2026-10-04

Gallery, Prompt studio and Connections now have separate hash-routed views with selected navigation state. Gallery adds Built/Planned/Needs-attention filters and filters cached metadata locally as you type. Reuse, downloads, connection management and explicit approval remain available. The studio shows target/catalog context and a dedicated build-review column; stale pending form responses are discarded when the form or target changes. Manrope fonts are served locally under the existing CSP; their OFL is retained.

The design uses no new frontend framework, animation runtime or external font service. Reduced motion is respected. [DESIGN.md](../DESIGN.md) records tokens and responsive behavior. Impeccable was installed user-wide from `pbakaus/impeccable` revision `ece38d9904b8a619b3f77cab476eacad09c4fb11` using the skill installer. Its context launcher initially lacked execution permission; the permission was repaired, and this pass used project files directly rather than rerunning setup. No detector hooks or paid design services were enabled.

Validation: all 19 tests, `npm run check` and `git diff --check` passed. Browser checks covered desktop (1440 px) and mobile (390 px) gallery/studio layouts, search and status empty states, recipe reuse and review, connection dialog, and navigation focus. Programmatic studio entry focuses its heading; the mobile document had no horizontal overflow. The temporary viewport override was reset. The design review's focus finding was fixed and rechecked. Arena was reopened only to read its development catalog; one planned gallery entry was saved, with no Arena writes during this UI pass. Animated previews and download delivery remain outside this validation.


## Persistent operator queue — 2026-10-05

Queue and Queue Configuration pages now operate on each saved Arena target. The authenticated loopback session is always `local:operator`; request bodies cannot assert a user ID, approval, protection, or payment verification. Operators can explicitly assign standard/tier/admin priority, enqueue a prompt for review, approve/remove a pending request, and adjust their earliest pending request. Tier selection is a manual assignment, not a verified subscription. Queue approval is separate from studio build approval and does not write to Arena.

`queue.json` schema 1 atomically saves requests, configuration and event receipts in one serialized commit. One process must own the data directory (as with the other local stores). Each command requires an event ID, scoped to the actor; identical retries return their original result before resolving a request, and conflicting reuse returns 409. No-target and fixed-admin adjustment results are retained too. The browser retains the last failed command ID for same-payload retries within the current page; reload loses that client retry state, so after an uncertain submission refresh and inspect before resubmitting. External adapters must retain their event IDs durably. Corrupt stores are preserved and stop startup. Limits: 500 pending requests per target, 10,000 retained command receipts globally; no automatic deletion or compaction. Back up the whole data directory with the service stopped.

Queue snapshots show sampled scores, base/aging/adjustment/bulk components, approval state, and the latest 50 events. Queue refreshes while visible and idle, including when playback is paused; manual refresh remains available. Pending requests age across downtime. Configuration is per target and version-checked against the global store revision; a conflict requires Reload settings. Aging/bulk changes recalculate existing requests; tier bases are snapshotted on enqueue. Standard starts at zero, admin stays at 1000, tier defaults are 25/50/75. Six decimal places are supported. No subscription, donation, external chat, playback, duration timers, or auto-approval claims are made by this increment.

Validation: 23 automated tests cover persistence/reopen, concurrent commits, approvals, base snapshots, decimal scoring, stale configuration, corruption, idempotent next-request targeting, identity rejection and HTTP target isolation. Browser checks at desktop1440/mobile390 covered enqueue, approval, +2.5 adjustment, settings save, actual service restart persistence and removal. Defaults were restored and the development request removed from pending; its audit record remains. No Arena API calls were needed. Mobile navigation and settings retry issues found in review were fixed. Download/Windows/macOS execution remain outside this check.


## Built-clip playback — 2026-10-05

Queue requests can now attach an **applied** gallery recipe from the same target with a duration of 1–3600 seconds (default 60; millisecond precision). Attachment changes clear approval. The API also requires a valid applied attachment before approval; older approved prompt-only rows must attach and reapprove. Start approved queue explicitly enables per-target automatic advancement; it does not build recipes. A missing/stale top recipe blocks the queue instead of silently skipping it. Pause after current prevents advancement while allowing the active duration to finish. Stop owned clip pauses scheduling and disconnects the verified owned layer. UI scores/status refresh every two seconds while scheduling is active, except while editing a form/attachment; Refresh queue remains available.

The controller shares the server's per-target operation lock. Before activation it verifies saved endpoint, composition identity, clip source/effect identity and an unoccupied target layer. Initial supported Arena routing: Own Layer, Normal trigger, no beat snap, zero transition duration, fader start off, layer autopilot off; inherited settings are resolved explicitly. Configure incompatible routing in Arena; Rezzo does not silently change it. It persists starting/stopping intent before sending a command, then verifies readback. The real Arena test showed activation state can lag acknowledgement: readback now has a bounded 2.5-second budget, with **no write retries**. Duration begins after confirmed activation, with a 500ms scheduler tick (not a frame-accurate clock).

Queue JSON also stores controller state, active request, recipe, endpoint, duration/deadline and outcomes. On startup every known target is paused and any active attempt becomes uncertain; no Arena commands are sent on startup. Reconcile Arena is read-only: if the owned clip remains connected, use explicit Stop owned clip. If disconnected or detectably replaced, reconciliation closes the old request and leaves scheduling paused. Read/write failures pause; after inspection/recovery an operator must resume. Unknown outcomes never reconnect a clip automatically. Shutdown/crash does **not** stop Arena: the renderer is a separate process and its clip may continue until operator recovery.

This is best-effort ownership checking against REST snapshots, not transactional compare-and-disconnect. Manual changes between the final read and write, or a manual retrigger of the same unchanged clip, cannot be distinguished atomically. Stop uses layer clear only after confirming the expected clip/layer and absence of another connected clip. Visible manual takeover pauses scheduling without a write. Do not treat these controls as a guaranteed emergency blackout or a full-show safety system. Clip parameters are not restored from the archive; current source/effect IDs/names are checked, but existing parameter values remain under Arena control. Removed/completed requests and their recipe links remain in queue history; training exports remain unfinished.

Verification on Arena 7.28.0/Linux Wine: built Lines + Blur in an empty layer 2 slot 5 of **Rezzoloom Development**, then used browser attachment/approval/start. Two five-second requests activated, completed and advanced in order. A separate 60-second request was interrupted by restarting Rezzo: the browser showed paused/uncertain; read-only reconciliation identified the active owned clip; explicit stop disconnected it. Independent REST readback confirmed the pre-existing layer 1 clip stayed connected and layer 2 ended disconnected. Test clips and archive/event records were retained; scheduler left paused, no pending test requests. Thirty-three automated tests include shared lock/occupied-layer checks, no interruption, advancement, delayed acknowledgement, lost acknowledgement, manual takeover, offline/reconnect, restart, attachment approval and decimal duration regressions. Desktop/mobile UI checks and bounded design review passed. Windows/macOS and non-default routing remain unverified.

Official reference checked 2026-10-05: [Resolume REST OpenAPI](https://resolume.com/docs/restapi/swagger.yaml), `POST /composition/clips/by-id/{clip-id}/connect` (omitted body simulates a short click) and `POST /composition/layers/by-id/{layer-id}/clear` (disconnect, not clearclips/delete). No new external library or runtime dependency was added.

## Twitch configuration — 2026-10-05

See [Twitch setup and limits](TWITCH.md). Public configuration is saved to `twitch.json`; device/access tokens remain only in process memory. No Twitch credentials were supplied for this milestone. Forty automated tests pass, including OAuth rejection/polling, transport handoff/revocation, identity binding, restart deduplication, intake limits and authenticated HTTP configuration. Browser checks covered desktop/mobile Configuration, disabled controls and required fields; no real consent or chat delivery is claimed. Existing development Arena clips were not changed by this milestone. Queue refresh now continues while paused so incoming prompts appear for operator review.
