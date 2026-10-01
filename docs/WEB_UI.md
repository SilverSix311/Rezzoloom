# Operator web UI proposal

## Setup

A guided connection screen for Arena address, connection test, detected version, composition, and available capabilities; clear diagnostics for offline/unsupported states. Follow with model configuration, Twitch connection, approved targets, visual catalog tagging, baseline selection, and a dry-run prompt. Model/provider remains undecided.

## Live console

- Persistent connection status, execution mode, and conspicuous pause control.
- Request queue with source, viewer, prompt, age, and disposition.
- Proposed changes with target names, parameters, transition, and missing capabilities.
- Approve, reject, cancel, and manual prompt controls.
- Current observed state with a freshness indicator; clip thumbnails if supported.
- Execution results and partial-failure diagnostics with a baseline recovery action.

Use explicit modes: **Paused**, **Review**, and **Auto within limits**. Show the active limits beside auto mode. A disconnected/stale state must never appear healthy. Manual takeover pauses automation until the operator resumes it.

## Show configuration

Choose controllable layers/effects, lock protected targets, tag assets, define allowed recipes and parameter ranges, set cooldowns and queue limits, and cap model spending. Profiles refer to stable IDs and must be revalidated when loaded into a different composition.

## UI boundaries

The MVP needs an understandable change summary more than a full Arena clone. Do not imply that thumbnails show the live rendered output. Live video preview is a later design decision. Use keyboard-accessible controls, non-color-only status indicators, and readable layouts during a live performance.
