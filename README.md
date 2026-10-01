# Rezzoloom

Turn audience prompts into controlled changes to a live Resolume Arena composition.

**Status: planning only.** No application, bot, API, or MCP integration is implemented yet.

Rezzoloom will connect an AI model, an MCP control interface, a browser-based operator console, and chat adapters. Twitch is the first target; YouTube, Kick, and other bots should be able to use a shared API later.

```text
!rezz "Synthwave, Purple, Orange, Pink, Cyan, and black. Neon grids. Ghosting effects"
```

The intended flow is: receive a request, interpret its visual intent, match it to available content and effects, validate a bounded plan, then apply it to Arena. The operator retains control of what chat can change.

## Requirements

- A working, separately installed Resolume Arena installation and user-provided visual content.
- A supported connection from Rezzoloom to the Arena machine; minimum Arena version and deployment topology are still to be decided.
- Chat-platform authorization and a model connection, to be defined before implementation.

Rezzoloom will control Arena; it will not replace its renderer or bundle Arena. The first version proposes using prepared clips, sources, and effects rather than generating new video for every request. Model candidates named by the founder are “Laya” for local use or “TypeScript’s Jev model.” Exact project identities, links, and compatibility remain to be verified.

## Planning map

| Document | Purpose |
| --- | --- |
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
