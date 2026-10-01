# Integration research

Checked 2026-10-01. These are upstream documentation findings, not tested Rezzoloom capabilities. Recheck against the user's installed release before implementation.

## Resolume

- [Official MCP servers](https://www.resolume.com/support/en/mcp-servers): documentation requires Arena 7.26.0+ for the bundled server and positions it mainly for composition editing. It has REST-related limits, including native presets, advanced output, and current-deck access. Evaluate before using it for live execution.
- [REST API and webserver](https://www.resolume.com/support/en/restapi): enables external control, composition/effect discovery, and clip thumbnails after enabling the webserver.
- [REST reference](https://resolume.com/docs/restapi/): inspect the installed version's actual operations and identifier behavior; prefer supported stable IDs over positions.
- [WebSocket API](https://www.resolume.com/support/en/websocket-api): supports state updates and subscriptions; investigate reconnect and reconciliation behavior.
- [OSC](https://www.resolume.com/support/en/osc): potential supplementary transport, not an assumed requirement.

Do not equate a Rezzoloom “show profile” or “recipe” with a native Arena preset. A recipe can describe supported explicit parameter writes without promising native preset management. Neither thumbnails nor composition state prove that a rendered look matches a prompt; visual evaluation remains a separate concern.

## Twitch

- [Sending and receiving chat messages](https://dev.twitch.tv/docs/chat/send-receive-messages): evaluate EventSub chat intake and required account authorization.
- [EventSub](https://dev.twitch.tv/docs/eventsub/): design for redelivery using message identifiers.

Confirm exact scopes, transport, reconnect behavior, rate limits, and bot identity during the integration spike. Platform rules are external constraints, distinct from Rezzoloom's own request cooldowns.

## Unresearched / unproven

YouTube and Kick delivery/auth details, supported model/provider, official MCP live latency, reliable recovery coverage, program-output preview, packaging, and the minimum supported Arena version for the chosen transport. These must not be advertised as completed integrations.
