# Decisions to discuss

Confirmed requirements live in [PRODUCT.md](PRODUCT.md). Everything below remains open; proposed defaults do not represent user approval.

| Priority | Question | Proposed starting point |
| --- | --- | --- |
| First | What are the exact project links for “Laya” and “TypeScript’s Jev model”? | Evaluate both named candidates once identified; keep provider pluggable |
| First | Which machine/OS and Arena version will run the show? | Service beside Arena; Linux can remain a development host |
| First | Reuse official MCP or implement a constrained server? | Test vendor server first; require one policy gate either way |
| First | Prepared assets or fresh generated visuals? | Tagged prepared content for MVP |
| First | Does every prompt need review? | Review initially, bounded auto as an explicit mode |
| First | What is chat allowed to control? | Selected layers, clips, and effect parameters |
| Next | What should missing intent do? | Show limitation and use only supported matches |
| Next | How fast, how often, and at what model cost? | Measure first; set request and spending budgets |
| Next | FIFO, votes, moderators, or paid priority? | FIFO plus moderator controls; no monetization initially |
| Next | Stay on new look, restore later, or override with next request? | Persist until next approved change; decide before auto mode |
| Next | Should the UI show a live video preview? | State and thumbnails first; research capture separately |
| Next | Which license? | No license selected yet |
| Later | Remote access, multiple channels, or shared hosting? | Single operator/local service first |
| Later | How long should chat prompts and logs be kept? | Minimal retention with configurable deletion |

## Decision record template

For each settled choice, record: date, status, decision, reason, alternatives, consequences, and evidence. Link to any compatibility experiment. Revisit proposals when real Arena behavior contradicts assumptions.
