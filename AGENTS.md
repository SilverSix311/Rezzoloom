# Rezzoloom contributor guidance

This repository has a local connection manager, reviewed clip builder and recipe archive. Read README.md, docs/DEVELOPMENT.md and docs/DECISIONS.md first. The user authorized product implementation on 2026-10-04. Distinguish implemented behavior from the broader planning documents. Use TODO.md as the active implementation checklist and update its current handoff at meaningful milestones. Keep docs/ROADMAP.md focused on milestone outcomes rather than duplicating checkboxes. Run npm test and npm run check for runtime changes.

Separate confirmed requirements from proposals and verified vendor behavior. Cite official sources for external capabilities and record the version/date checked. Do not invent Resolume effect names, resource IDs, model providers, or unsupported API operations.

Keep all proposed control paths behind the same validation and operator-policy boundary. Never test changes against a live show without explicit authorization for that environment. Do not commit tokens, local show media, private chat logs, or machine-specific credentials.

For documentation changes, check relative links, consistency, and git diff whitespace. Add executable tests once there is behavior worth testing; do not scaffold a runtime or CI simply to make a planning repository look implemented.
