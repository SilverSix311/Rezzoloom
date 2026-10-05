# Development and current implementation

## Run the foundation preview

Install Node.js 24 or newer, then run `npm start` in the checkout (no third-party dependencies are required). Open http://127.0.0.1:4310. Windows can use `start.cmd`; macOS/Linux can use `./start.sh`. These are source launchers, not bundled standalone installers.

Set `REZZO_DATA_DIR` to change the persistent data directory (default: `.rezzoloom` inside your home folder). Set `REZZO_PORT` to change the HTTP port (default 4310). Use only one Rezzo process per data directory. Stop with Ctrl+C. Saved connections survive restart; health resets to unchecked until explicitly refreshed.

The current service binds only to loopback. It is a trusted local operator console, not the community account system: other local processes/users able to reach the port are within its trust boundary. Host/origin/Fetch Metadata checks, a same-origin session token, CSP, and escaped DOM text protect the browser boundary. Do not publish this preview via a reverse proxy. Outbound targets are operator-selected HTTP(S) origins; use only authorized endpoints. Remote TLS is validated, redirects and embedded credentials are rejected. Secure remote connector pairing is not implemented.

## What works

- Browser connection manager, add/remove named targets, atomic persistent JSON storage.
- Separate on-demand health and composition summaries for each target; failure isolation.
- Read-only GET requests to Arena `/api/v1/product` and `/api/v1/composition`.
- Version, composition name, layer/clip-slot and column counts.
- Diagnostic `.state.json` export with explicit `replayable: false`; this is not a native Arena composition download.
- Response size/time limits, bounded probe concurrency, input validation and request size limits.

No AI planning, MCP client, Arena writes, scheduler, chat bot, SSO, gallery, replay, thumbnails, training export, or installer binaries yet. Their planning documents describe intended behavior, not existing features. Node and browser standards were chosen for a dependency-free first slice; TypeScript/React remain an option rather than installed dependencies. No package versions were previously locked; package-lock.json now records the dependency-free package.

## Checks

Run `npm test` and `npm run check`. Tests use disposable data folders and mock Arena endpoints. They cover persisted profiles, duplicate validation, concurrent writes, corrupt-store preservation, per-target dispatch/failure isolation, authentication/browser boundary, size/time limits, redirects, and unsupported payloads. They never write to Arena.

Observed 2026-10-04 on Linux with Node 26.8.1: Arena.exe running under Wine; local REST reports Arena 7.28.0 revision 24303, three layers and nine columns. Browser verified adding/inspecting a real target and an unavailable target without disrupting the real one. The snapshot API was also verified against real Arena. Browser export reached its success UI, but the browser automation download event timed out, so filesystem delivery through that browser is not verified. No composition mutations were sent. macOS, Windows and Node 24 execution remain untested locally.

## References and next slice

Protocol reference: [Resolume REST OpenAPI](https://resolume.com/docs/restapi/swagger.yaml). Node built-in HTTP/fetch APIs checked against [Node 24 docs](https://nodejs.org/docs/latest-v24.x/api/http.html) via Context7; local runtime is newer. No vendor MCP binary was located by the initial targeted search; its launch path and capabilities remain to investigate.

Next implement the official MCP connection/capability adapter and a dry-run prompt planner with target-bound validated plans. Then introduce controlled mutations against a disposable composition. Keep UI/API instance identity explicit. Runtime packaging, source catalog, queue model and provider integration should be layered on this tested connection boundary.
