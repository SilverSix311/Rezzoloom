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

Next: Laya/Jev provider integration and semantic plans, color/motion parameter validation, controlled playback/stop, Twitch intake and queue, animated gallery captures, richer archive metadata, community SSO and packaging. The current preview does not implement the complete product.

References checked 2026-10-04: [Resolume OpenAPI](https://resolume.com/docs/restapi/swagger.yaml), [official MCP documentation](https://resolume.com/support/en/mcp-servers), installed vendor 7.28 manifest/tool schemas. SDK Context7 results mixed v1/main examples; APIs were verified against installed 1.32.0 declarations and the real discovery run, with [upstream v1 client docs](https://github.com/modelcontextprotocol/typescript-sdk/blob/v1.x/docs/client.md) as the matching branch reference.

## Chat and queue policy core

`src/chat.mjs` now parses bounded `!rezz` commands and returns accepted/ignored/rejected text results. `src/queue.mjs` computes target-specific scores and breakdowns, validates decimal inputs, filters approvals, applies the protection rule to pre-verified adjustments and prevents selecting a new request while one is playing. These pure modules do not run timers, persist queues, validate external identities/payments, send messages or control Arena. They are not exposed as HTTP chat endpoints yet.

Nineteen automated tests pass after this increment, including eight parser/policy cases. No browser or Arena flow changed, so no additional live mutations were needed. Implementation choices and examples are in [queue policy](QUEUE_POLICY.md); remaining work and the active handoff are in [TODO.md](../TODO.md).
