# Chat and API contract proposal

These are design sketches, not implemented or stable interfaces.

## Command parsing

Accept `!rezz <prompt>` only at the start of a trimmed message, with a command boundary. Match the command case-insensitively. Strip a single balanced pair of outer double quotes; keep internal punctuation. Reject empty prompts and unmatched outer quotes with a useful reason. Do not interpret URLs, code, or embedded instructions as executable actions.

| Input | Proposed result |
| --- | --- |
| `!rezz "Synthwave, Purple, Orange, Pink, Cyan, and black. Neon grids. Ghosting effects"` | Accept visual prompt |
| `!rezz neon grids` | Accept unquoted prompt |
| `!REZZ purple haze` | Accept |
| `hello !rezz blue` | Ignore |
| `!rezzify blue` | Ignore |
| `!rezz` | Reject empty prompt |
| `!rezz "blue` | Reject malformed quoting |

Tentative defaults for discussion: 500 Unicode code points per prompt, 30-second per-user cooldown, 10-second channel cooldown, 20 pending requests, and 60-second request expiry. These are tunable product choices, not platform limits. Prefer rejecting overflow over silently dropping accepted work. Final values require a live-show trial.

## Normalized chat event

Record schema version, platform, channel ID, message ID, user ID, trusted role claims, message text, platform timestamp, and received timestamp. Deduplicate by `(platform, channel_id, message_id)` with a defined retention window. Platform roles come from verified platform data; external bot credentials have explicit channel/role permissions and cannot impersonate an operator.

The intake response returns a request ID and disposition: accepted, duplicate, ignored, or rejected with a reason. Acknowledgment means queued, not applied. Public bot replies are optional and rate-limited; full diagnostics belong in the UI.

## Request lifecycle

`received → queued → planning → awaiting_review → executing → applied`

Bounded auto mode skips `awaiting_review`. Additional terminal states: rejected, expired, cancelled, failed, partially_applied. On restart or an uncertain write, reconcile observed state and require operator attention before replay. Capture timestamps and structured reason codes at each step.

## Structured plan

Include request ID, plan ID, composition identity, observed state revision, expiry, matched intent, explicit target IDs, typed actions with bounded values, transition duration, unavailable features, and a human-readable summary. Hash or otherwise bind approval to the exact validated plan; changing it requires revalidation and renewed review in review mode.

“Neon grid” must resolve to an approved catalog entry. “Ghosting” must resolve to a discovered compatible effect or an approved recipe; neither is a guaranteed native effect name. Palette changes depend on exposed parameters. Do not create fake numerical IDs or assume every clip can be recolored.

## Proposed HTTP surface

| Method and path | Purpose | Access |
| --- | --- | --- |
| `GET /api/v1/health` | Minimal service liveness | Local/minimal disclosure |
| `GET /api/v1/status` | Arena, model, adapter status | Operator |
| `POST /api/v1/chat-events` | Verified external bot event | Scoped bot |
| `POST /api/v1/requests` | Manual prompt | Operator |
| `GET /api/v1/requests/:id` | Request outcome | Authorized requester/operator |
| `POST /api/v1/plans/:id/approve` | Approve the exact plan | Operator |
| `POST /api/v1/requests/:id/cancel` | Cancel pending work | Operator |
| `POST /api/v1/control/pause` | Stop admission/execution as defined by policy | Operator |
| `POST /api/v1/control/resume` | Explicitly resume | Operator |
| `POST /api/v1/control/restore-baseline` | Request a validated recovery plan | Operator |
| `GET /api/v1/events` | Status stream; SSE or WS undecided | Operator |

Require scoped credentials, size limits, replay protection, idempotency keys for bot submissions, and consistent error bodies. Loopback binding alone is not authentication; validate browser origin and protect cookie-authenticated mutations from CSRF if cookies are used. Secrets stay out of browser bundles and logs.

## Platform order

Twitch first: evaluate EventSub chat-message events and reconnect/redelivery behavior against current official docs. Prefer a local-friendly transport if supported by the chosen authorization flow. YouTube and Kick get the same normalized contract, but their current event delivery, OAuth, verification, quotas, and app-review requirements must be researched before scheduling implementation. Do not promise equal platform capabilities.
