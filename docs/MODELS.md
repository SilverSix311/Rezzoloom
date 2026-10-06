# Visual decision providers

Implemented, offline-tested preview as of 2026-10-05. Rezzo can request typed catalog recommendations from an existing Laya server or hosted Jev. No live model call, quality evaluation, paid account access or local checkpoint installation was performed in this milestone.

## Operator flow

1. Open Configuration → Visual decision model. Select Laya or Jev, set the endpoint/model and request limits, then save.
2. Laya needs an existing `laya-serve` service. HTTP is allowed only on loopback; remote origins require HTTPS. Enter its optional bearer key if that server requires one. Rezzo never installs or starts checkpoints.
3. Jev requires a TypeSafe API key entered in Configuration and explicit cloud-sharing consent. The destination is fixed to `https://api.typesafe.ai/v1/systemone`. Keys stay in memory; restart requires re-entry. Switching provider or Laya origin clears the old key. Blank key input otherwise preserves the session key; Forget session key removes it.
4. In Prompt studio, load an Arena catalog, enter a prompt, and select **Ask model**. The selected provider receives the prompt plus source/effect names and bounded descriptions, not connection addresses, composition snapshots, clip slots or account identifiers. This happens only on the operator's request, not automatically on chat arrival.
5. Review the proposed source and optional effect, their reported confidence, and limitations. **Use suggestion** fills the form; it does not write to Arena. Choose an empty slot and review the recipe. Building still requires the existing explicit approval and fresh catalog/composition checks.

Manual selections and the separate keyword matcher remain available. No provider fallback occurs automatically. Editing prompt/mode/source/effects returns the form to manual provenance; changing the empty slot preserves the selected decision. Recommendations expire after ten minutes or service restart. Changed catalog/composition state requires a fresh recommendation.

## Scope and boundaries

Both adapters use a single POST `/v1/systemone` with `state`, `model` and two `choice` questions. Options come from the actual catalog, plus `none`. Returned labels, probability distributions and confidence values are validated before mapping to catalog IDs. Unknown/malformed choices reject the response; `none`, low confidence and provider abstention yield no selection. Reported confidence is not a measured probability of matching the rendered look.

This slice suggests **one source and at most one effect**, even in Full mode. Operators can add more manually, with manual provenance. It does not generate free-form tool calls, arbitrary URLs, parameter writes, palettes, motion programs or whole compositions. It does not infer complete prompt satisfaction. Colors and motion still use Arena defaults; runtime parameter discovery/validation is the next control layer.

Laya requests use `max_len:4096` and `head_max_len:4096`. Reported truncation or collapsed options rejects the result. These checks require Laya's full response diagnostics; strict Jev-compatible response mode can omit those fields. Actual context capacity and performance must be evaluated on the operator's checkpoint/hardware. Catalogs above 254 entries per question, invalid/duplicate entries or request bodies above 64 KiB are rejected instead of silently dropping candidates. Descriptions are bounded to 160 characters per entry; this is a matching aid, not a full effect specification.

## Limits, storage and provenance

- Disabled by default. Default reported-confidence threshold 0.6, twenty attempts per UTC day, thirty-second timeout; these are configurable preview policies, not accuracy or cost guarantees.
- One in-flight model operation across the local service. Catalog discovery releases the Arena operation lock before inference, so a slow model cannot block timed playback stops. No retries. Daily attempts are reserved on disk before network I/O and survive restart; errors/interrupted calls still count. The shared request cap is not a dollar budget, and completed requests may incur provider charges even after a local timeout.
- No new runtime dependency; built-in Node fetch. Redirects are refused, response bodies capped at 256 KiB and upstream error bodies are not reflected into the UI.
- `models.json` contains public configuration and counters only. API keys never enter status payloads or records. The existing local bearer/same-origin boundary protects GET/POST `/api/models` and POST `/api/instances/:id/recommend`.
- `decisions/<UUID>.json` stores prompts, question options/mappings, provider/model, threshold, timestamps, sanitized results/token counts and latency, or a failure state. A pending record after a crash means no verified completion. These local records are not a finished training dataset; retention/export/consent features remain future work.
- A recipe created from an unchanged recommendation stores server-resolved decision provenance. The HTTP caller cannot supply its own provider identity or confidence. Existing gallery entries remain valid. Reused recipes require fresh review and become manual unless a new model recommendation is requested.

## Validation and open work

Forty-eight automated tests pass across the project. New tests cover endpoint restrictions/cloud opt-in, key isolation, one-call mapping/provenance, stale catalog/target/expiry, malformed answers, abstention, truncation, persistent budgets, concurrency, sanitized HTTP failures the unchanged build-approval boundary and releasing the Arena lock during inference. An existing Twitch test's fixed 15ms persistence wait was replaced by a bounded condition wait after it flaked under parallel test load.

Browser verification is pending: the browser tool rejected local page access under its URL protocol security policy; no alternate browser path was attempted. UI syntax and static review do not establish visual or interaction correctness. Live Laya/Jev availability, latency, quality, token pricing and cross-platform behavior remain unverified. No Arena writes were performed for this milestone.

Next: live provider smoke tests and prompt-evaluation fixtures; discovered color/motion controls; richer bounded effect plans; model-specific confidence calibration and monetary budgets; parameter provenance in replay/export.

## Contract evidence

Checked 2026-10-05. No Laya/Jev SDK package is installed or locked in Rezzo; these adapters use documented HTTP contracts directly.

- [TypeSafe Choice contract](https://docs.typesafe.ai/primitives/choice): criteria mappings, result labels/probabilities/confidence and 255-option ceiling.
- [TypeSafe HTTP API](https://docs.typesafe.ai/api): authenticated System One requests.
- [TypeSafe quickstart](https://docs.typesafe.ai/introduction/quickstart): `jev-latest` and current response structure. The configured alias may change; actual returned model identity is archived.
- [Laya HTTP adapter at a4a8921](https://github.com/NandhaKishorM/laya/blob/a4a8921afebfd852bba0000475cfb6ab737a124c/laya/serve.py): shared route, checkpoint selectors, bearer auth and response diagnostics.
- [Laya usage diagnostics at the same revision](https://github.com/NandhaKishorM/laya/blob/a4a8921afebfd852bba0000475cfb6ab737a124c/laya/agent.py): truncation and collapsed-option reporting.

Context7 located the official TypeSafe docs; the linked upstream sources were checked directly for the implemented protocol. Vendor documentation is contract evidence, not evidence of model quality in Rezzo.
