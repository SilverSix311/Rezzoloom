# Live control and reliability proposal

The audience supplies creative intent. The operator defines authority. Model instructions are not the security boundary; the service validates every action regardless of entry point.

## Defaults to validate

- Begin in review mode; automatically execute only inside an explicit show profile.
- Allow only selected targets and typed operations. Protect master/output settings, unrelated layers, filesystem paths, and application settings.
- Permit approved local assets only; chat cannot load arbitrary files or URLs.
- Bound effect intensity, transition speed, action count, and execution time. Exclude rapid flashing/strobe recipes by default; parameter limits do not certify rendered imagery as safe.
- Apply moderation, role policy, cooldowns, queue capacity, and model-cost limits before expensive planning.
- Treat chat text, asset names, and model responses as untrusted data. Ignore attempts to change policy, reveal credentials, or invoke arbitrary tools.

## Stop and recovery semantics

Pause stops new planning/execution and checks a cancellation signal before each remaining write. It cannot undo a command Arena has already received. Cancel pending work explicitly; never replay old chat on resume without a fresh policy/state check.

Manual takeover pauses automation. Detect relevant external changes and invalidate stale plans. Baseline restoration is a separately validated, operator-triggered action that restores only supported values on approved targets. It is best effort; missing targets or a changed deck may prevent restoration. An Arena-side manual fallback remains necessary if the connection is lost.

## Failure cases and expected behavior

| Failure | Expected behavior |
| --- | --- |
| Duplicate chat delivery | Return previous disposition; do not execute twice |
| Model timeout or invalid plan | Fail request; no writes |
| Unsupported intent | Explain limitation; no invented action |
| Arena disconnect before execution | Stop and expire/review queued plans |
| Disconnect during writes | Mark uncertain/partial outcome and reconcile |
| Human changes target while planning | Invalidate or replan against new state |
| Queue overload | Reject with reason and cooldown feedback |
| App restart | Load history; reconcile unfinished work; no automatic replay |
| Credentials revoked | Disable affected adapter and show reconnect guidance |

## Data and exposure

Keep tokens and keys out of Git and chat output. Record action metadata and redacted diagnostics; choose prompt retention and deletion settings before release. Explain which prompt/catalog data reaches a hosted model. Do not expose Arena's webserver directly to the public Internet. Remote operator access needs a deliberate authentication and transport design.
