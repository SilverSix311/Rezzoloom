# Local Twitch setup

Implemented preview, checked against official documentation on 2026-10-05. Live Twitch consent/chat verification remains pending; automated tests use injected provider responses and sockets.

## Connect

1. Register a **Public** application in the [Twitch Developer Console](https://dev.twitch.tv/console/apps). The installed-client Device Code Flow does not need a client secret or a callback listener.
2. Open **Configuration** in Rezzo. Enter the public Client ID, lowercase channel login and an existing Arena target; save settings.
3. Select **Authorize Twitch**, follow the Twitch link and complete consent there. Keep Configuration open to check for completion. Rezzo requests only `user:read:chat`; it does not post replies.
4. Select **Start listening**. Viewers can submit `!rezz "Purple neon grids"`. Open Queue to review arrivals.
5. Build a recipe, attach it to the request and approve it. Start approved playback separately. Receiving chat never writes to Arena by itself.

The saved route is shown alongside listener status. Saving settings disconnects the listener and forgets authorization. Stop listening preserves in-memory authorization; Disconnect account forgets it. Provider-side grants can be removed in Twitch account settings. Restarting Rezzo requires authorization again. Expired/revoked or unvalidated access also requires reauthorization; automatic token refresh is not implemented.

## Implemented boundary

- One channel and one Arena target per local installation. Rezzo itself still supports multiple saved Arena connections.
- Public configuration only in `twitch.json`, written atomically with restricted file permissions. Device and access tokens never enter queue records, browser status or logs. Refresh tokens returned by Twitch are discarded.
- Identity comes from `channel.chat.message` on the authenticated, pinned Twitch WebSocket endpoint. Subscription type/version/ID/conditions and channel must match; shared-chat messages originating in another channel are excluded. Messages older than ten minutes or over ten minutes in the future are ignored.
- Sender identity is `twitch:<user ID>`, with a login label. This is local attribution, not a community SSO account. Every chat request starts as standard priority, unprotected and unapproved; badges and prompt text cannot grant privileges.
- Persistent receipts deduplicate channel/message/sender IDs, including after restart and after retargeting. Ordinary chat is ignored without storage. Accepted prompts and rate-limited command receipts are retained locally; retention controls remain future work.
- Initial intake limits: five pending/playing requests per viewer and target, ten-second accepted-command cooldown per viewer/channel, sixty accepted requests per channel/minute, five hundred pending/playing requests per target. The existing ten-thousand event archive bound remains. These are preview defaults, not yet dashboard-configurable.
- Access is validated after consent, before listening and at least hourly while listening. Server-directed reconnects transfer the subscription; unexpected disconnects/timeouts stop intake and require **Start listening**. Twitch does not replay messages missed while disconnected.
- No public chat-event injection endpoint. Configuration routes use the existing local bearer and same-origin boundary. No new runtime dependency.

## Verification and remaining work

Offline tests cover held intake, forged fields, cooldown/bulk limits, duplicate delivery across restart/retarget, shared-channel exclusion, token/scope rejection, device expiry, revocation, safe reconnect handoff, unexpected close, hostile reconnect URL, bounded responses, split UTF-8 and HTTP authorization. Browser checks cover responsive configuration, required fields and disabled controls. Test timing is simulated for device flow; hourly validation and real Twitch handoff still need live observation.

Next: operator-configured live smoke test, automatic reconnect/backoff and rotating refresh-token handling, configurable abuse limits, community identity links and verified subscriber tiers. A real Twitch-to-approved-Arena playback remains the milestone exit test.

## Authoritative references

- [Twitch OAuth Device Code Flow](https://dev.twitch.tv/docs/authentication/getting-tokens-oauth/)
- [Installed chat application authentication](https://dev.twitch.tv/docs/chat/authenticating/)
- [Token validation requirements](https://dev.twitch.tv/docs/authentication/validate-tokens/)
- [EventSub WebSocket lifecycle](https://dev.twitch.tv/docs/eventsub/handling-websocket-events/)
- [Chat message schema and subscription](https://dev.twitch.tv/docs/chat/send-receive-messages/)

These sources establish vendor contracts, not evidence of a live Rezzo session.
