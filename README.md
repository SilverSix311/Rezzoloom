# Rezzoloom

Rezzoloom (**Rezzo** for short). Turn audience prompts into controlled changes to a live Resolume Arena composition.

**Status: studio preview (0.2.0).** The local console discovers Arena sources/effects, builds operator-reviewed clips in empty slots, and archives prompts/recipes/results in a searchable local gallery. The local queue can schedule approved built clips with duration, pause/stop and restart recovery. Configuration now supports public-client Twitch authorization and reviewed `!rezz` intake; live Twitch verification is pending. Configurable Laya/Jev catalog recommendations are implemented and offline-tested; live model validation is pending. Color/motion planning, community accounts, animated previews and bundled installers remain in development.

Rezzoloom will connect an AI model, an MCP control interface, a browser-based operator console, and chat adapters. Twitch is the first target; YouTube, Kick, and other bots should be able to use a shared API later.

```text
!rezz "Synthwave, Purple, Orange, Pink, Cyan, and black. Neon grids. Ghosting effects"
```

The intended flow is: receive a request, interpret its visual intent, match it to available content and effects, validate a bounded plan, then apply it to Arena. The operator retains control of what chat can change.

## Portable deployment — confirmed

Rezzo must be portable/installable on **Windows, macOS, and Linux**, with support for **multiple existing Arena instances** across local, LAN, and remote connections. Both install profiles share this requirement. See [portability plan](docs/PORTABILITY.md) for packaging, target isolation, and compatibility validation.

## Run locally

With Node.js 24+ installed, run `npm ci`, then `npm start` and open http://127.0.0.1:4310. The official MCP discovery CLI uses the pinned MCP SDK. See [development guide](docs/DEVELOPMENT.md) for data storage, validation, and current limitations.

## Requirements

- A working, separately installed Resolume Arena installation with its built-in sources and effects.
- A supported connection from Rezzoloom to the Arena machine; local, LAN, and remote connections are required; minimum Arena version remains undecided.
- Chat-platform authorization and a model connection, to be defined before implementation.

Rezzoloom will control Arena; it will not replace its renderer or bundle Arena. The creative focus is composing and animating Arena’s built-in elements from chat prompts. External AI image/video generation is outside the initial scope. The MVP will support both [Laya](https://github.com/NandhaKishorM/laya) for local decisions and [Jev by TypeSafe AI](https://typesafe.ai/blog/introducing-system-one-models-and-jev) for hosted decisions. HTTP adapters and operator settings are implemented; live integration quality remains to be tested. See [model setup](docs/MODELS.md).

## Planning map

Use [TODO.md](TODO.md) for the active implementation checklist and current handoff, and [DESIGN.md](DESIGN.md) for the frontend design system.

| Document | Purpose |
| --- | --- |
| [Portability](docs/PORTABILITY.md) | Windows/macOS/Linux packaging and multiple Arena targets |
| [Queue policy](docs/QUEUE_POLICY.md) | Priority scores, aging, triggers, and donation protection |
| [Training archive](docs/TRAINING_ARCHIVE.md) | Downloads, remix lineage, tags, and future training data |
| [Gallery and installs](docs/GALLERY_AND_INSTALLS.md) | Shared/local galleries, animated previews, accounts, and SSO |
| [Product brief](docs/PRODUCT.md) | Audience, scope, first working experience |
| [Architecture](docs/ARCHITECTURE.md) | Components, deployment, MCP and Resolume boundary |
| [Chat and API contracts](docs/CHAT_AND_API.md) | Parsing, requests, queue, proposed endpoints |
| [Operator web UI](docs/WEB_UI.md) | Setup, live operation, recovery |
| [Live control policy](docs/LIVE_CONTROL.md) | Limits, manual takeover, failure behavior |
| [Roadmap](docs/ROADMAP.md) | Research gates and implementation milestones |
| [Open decisions](docs/DECISIONS.md) | Questions to resolve together |
| [Research](docs/RESEARCH.md) | Official sources and compatibility caveats |

All architecture, endpoint names, limits, and stack suggestions are proposals unless explicitly marked confirmed. Implementation status is tracked separately in the development guide.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Run the documented checks for code changes and keep implementation claims precise. Licensing has not been selected; this repository does not yet grant an open-source license.

## Current test environment

Functional checks on 2026-10-04 verified Arena 7.28.0 running under Wine on Linux, exposing product and composition REST endpoints. The browser console built a reviewed Lines + Blur clip in an empty slot and archived the result. Official MCP discovery returned 22 tools. Windows/macOS remain target Arena environments; no performance or official Linux-support claim is implied. See the [roadmap](docs/ROADMAP.md) for the next capability checks.
