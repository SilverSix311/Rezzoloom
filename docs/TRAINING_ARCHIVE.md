# Downloads, remix lineage, and training archive

Requirements confirmed through 2026-10-04; schema and training pipeline are proposals, not implemented capabilities.

## Confirmed requirements

Gallery entries support downloads for reuse. Archive every entry in a training-friendly form so future work can improve the Rezzo agent, potentially with fine-tuning or LoRA where the selected model supports it. Training use is included in clearly disclosed community signup terms, with acceptance required to join. Final terms have not been drafted or reviewed.

Remixing an existing composition with a new prompt creates a separate credited entry linked to its original. Combining multiple compositions is a desired extension to explore, not a proven Arena operation.

Tags are generated automatically and editable by creators. Admins/moderators can edit any entry. Members can propose tags and give +1/-1 feedback on tag accuracy. Tag votes are distinct from composition upvotes.

## Proposed archive record

Use a versioned schema and immutable revision IDs, with explicit absent/unknown fields:

- Original prompt, normalized intent, entry/request IDs, revision and timestamps.
- Pseudonymous creator reference and parent entry/revision IDs for remix lineage.
- Model/provider version, decision questions/options, raw structured answers and confidence where supplied; do not require private model reasoning.
- Arena version, discovered capabilities, initial state, supported sources/effects, action plan, parameters, actual executed actions, outcomes and failure reasons.
- Saved composition or reconstruction manifest with truthful format metadata and dependency requirements.
- Five-second preview, hashes of artifacts, capture metadata, and availability status.
- Automatic and user-edited tags, tag provenance/votes, composition ratings, and usage outcomes.
- Applicable terms version, acceptance evidence reference, training eligibility, and any later restriction/removal state.

Keep OAuth secrets, payment records, contact details, and account-link credentials outside the archive/export. Store operational audit and identity mappings separately. Gallery downloads should contain only authorized composition assets/metadata, not the private training or identity record. Every community download/media route requires authentication like the gallery.

## Export and portability proposal

Use a manifest plus media/artifacts for each revision and a JSONL dataset export with stable IDs. Retain checksums and parent links. A native Arena file must only be labeled as such after save/load is verified. If only a Rezzo recipe can be exported, label its required importer explicitly and do not promise direct opening in Arena. Filename follows username.shortHash.actualExtension, with sanitized names and collision handling.

## Training preparation proposal

Preserving entries does not mean every record is a good training target. Separate successful examples, partial executions, rejected requests, and failures; retain outcome labels. Treat popularity and tag votes as noisy community feedback, not proof of correctness. Capture supported intent-to-action pairs and human corrections where available.

Create reproducible dataset snapshots and group train/validation/test splits by original composition/remix family to limit leakage. Compare candidate models against held-out prompts, execution validity, and operator-rated visual results. Archive data without running training workloads on the lightweight host. A future training plan must verify model licensing, fine-tuning support, hardware cost, and evaluation; LoRA is a candidate method, not a capability promised for hosted Jev.

## Decisions remaining

Choose archive/download formats, backup/export destination, disk quotas, deletion and correction propagation across datasets, final terms language, and access roles. Signup disclosure is the confirmed product approach; it does not itself establish rights to every imported asset or settle all data-retention questions. Do not upload a local install's archive to a community or training service automatically.
