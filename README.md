# Rezzoloom

Rezzoloom (**Rezzo** for short). Turn audience prompts into controlled changes to a live Resolume Arena composition.

**Status: planning only.** No application, bot, API, or MCP integration is implemented yet.

Rezzoloom will connect an AI model, an MCP control interface, a browser-based operator console, and chat adapters. Twitch is the first target; YouTube, Kick, and other bots should be able to use a shared API later.

```text
!rezz "Synthwave, Purple, Orange, Pink, Cyan, and black. Neon grids. Ghosting effects"
```

The intended flow is: receive a request, interpret its visual intent, match it to available content and effects, validate a bounded plan, then apply it to Arena. The operator retains control of what chat can change.

## Portable deployment — confirmed

Rezzo must be portable/installable on **Windows, macOS, and Linux**, with support for **multiple existing Arena instances** across local, LAN, and remote connections. Both install profiles share this requirement. See [portability plan](docs/PORTABILITY.md) for packaging, target isolation, and compatibility validation.

## Requirements

- A working, separately installed Resolume Arena installation with its built-in sources and effects.
- A supported connection from Rezzoloom to the Arena machine; local, LAN, and remote connections are required; minimum Arena version remains undecided.
- Chat-platform authorization and a model connection, to be defined before implementation.

Rezzoloom will control Arena; it will not replace its renderer or bundle Arena. The creative focus is composing and animating Arena’s built-in elements from chat prompts. External AI image/video generation is outside the initial scope. The MVP will support both [Laya](https://github.com/NandhaKishorM/laya) for local decisions and [Jev by TypeSafe AI](https://typesafe.ai/blog/introducing-system-one-models-and-jev) for hosted decisions. Integration compatibility remains to be tested.

## Planning map

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

All architecture, endpoint names, limits, and stack suggestions are proposals unless explicitly marked confirmed. Start the next discussion with the open decisions; implementation should follow an agreed MVP.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). For now, contribute scope clarifications, architecture proposals, and reproducible integration research. Licensing has not been selected; this repository does not yet grant an open-source license.

## Current test environment

The user reports a working local Arena instance on Linux (2026-10-04), available for functional checks despite low performance. Its version/runtime and integration behavior have not yet been verified. Windows/macOS remain target Arena environments; no performance or official Linux-support claim is implied. See the [roadmap](docs/ROADMAP.md) for the next capability checks.
