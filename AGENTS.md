# Rezzoloom contributor guidance

This repository is in planning. Read README.md and docs/DECISIONS.md first. Do not begin application implementation unless the current user request authorizes it.

Separate confirmed requirements from proposals and verified vendor behavior. Cite official sources for external capabilities and record the version/date checked. Do not invent Resolume effect names, resource IDs, model providers, or unsupported API operations.

Keep all proposed control paths behind the same validation and operator-policy boundary. Never test changes against a live show without explicit authorization for that environment. Do not commit tokens, local show media, private chat logs, or machine-specific credentials.

For documentation changes, check relative links, consistency, and git diff whitespace. Add executable tests once there is behavior worth testing; do not scaffold a runtime or CI simply to make a planning repository look implemented.
