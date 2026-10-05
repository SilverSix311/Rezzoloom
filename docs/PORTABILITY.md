# Portable installation and multiple Arena instances

Confirmed 2026-10-04: Rezzo must be portable/installable on Windows, macOS, and Linux, and interface with one or more existing Arena instances locally, on a LAN, or remotely. Both local and community installation profiles retain this requirement. Packaging formats and implementation mechanisms below are proposals; no binaries exist yet.

## Host support and distribution

Rezzo's host OS is independent of Arena's host OS. A Linux Rezzo service must be able to manage a reachable Arena installation on another machine, just as Windows/macOS Rezzo can. The user's local Linux Arena instance is an available functional test environment, not evidence of official vendor Linux support or broad version compatibility.

Propose a shared application core, browser UI, and OS-specific packages for installers and portable use. End users should not need a source checkout or development toolchain. Exact minimum OS versions, CPU architectures, signing/notarization, installers, and update tooling require selection and verification before release. Docker may be an optional community deployment method, not a mandatory dependency for a lightweight local install.

Portable means movable installation/data with documented migration, not one executable that runs on every OS. Keep configuration, gallery, archives, and optional model storage in a configurable data directory. Store paths relative to that directory where appropriate; do not embed developer home paths. Revalidate references and re-pair/re-authenticate when moving machines rather than assuming OS credential stores are transferable. Credentials must not enter ordinary gallery or training exports.

Propose clean install, portable launch, versioned data migrations, backup/restore, and an uninstall choice that preserves user data. Local Laya weights/runtime can be an optional component so hosted-Jev users do not incur a mandatory model download. Specify behavior without network access; cloud identities/chat/Jev still need their services.

## Connection manager

Each Arena target needs its own stable instance ID, display name, endpoint/connector identity, authorization, detected version/capabilities, health, composition state, and reconnect status. Discover capabilities during connection; report missing functions explicitly. The goal is any authorized, reachable, compatible Arena instance, not an untested promise that every historical version supports every feature.

Proposed Arena-side connector handles vendor-local MCP access and platform-specific output capture when necessary. Keep it separately installable from the full community service. Reuse official MCP where supported; investigate other documented transports for missing capabilities. Do not assume a local MCP executable is itself a remotely accessible server.

## Routing and isolation

Every mutating request and approved plan must identify its destination instance. Never infer a destination from whichever Arena happens to be reachable. Bind chat channels/show profiles to explicit instances; show the target prominently in the web UI. Revalidate resource IDs and effects against that instance's capabilities before applying a gallery item.

Maintain separate execution locks, queues, shuffle progress, approval/mode policy, health and state revisions per instance. One instance disconnecting must not stop another's queue or send its commands elsewhere. Namespace resource IDs by instance and composition. Prevent multiple controllers from writing concurrently through a proposed lease/ownership mechanism; reconnection must not replay stale work blindly.

Shared galleries can feed several targets with compatibility checks and per-target capture attribution. Simultaneous synchronized playback, mirrored control, grouping, and automatic failover are separate unresolved product choices; multiple-instance support does not imply any of them.

## Remote access proposal

Pair a connector to an authorized Rezzo controller using authenticated encrypted transport and revocable per-instance credentials. An outbound connector is a candidate for avoiding direct public exposure of Arena. Choose transport, discovery, NAT handling, and certificate lifecycle after capability investigation. Local and community modes both enforce target authorization; community accounts do not automatically gain access to every registered Arena.

## Release validation

- Test install/portable launch on Windows, macOS, and Linux; document the actual CPU/OS matrix.
- Connect across host OS combinations and validate version-dependent feature reporting.
- Operate two independent simulated targets; prove correct routing, isolated queue/state, reconnect and failure handling.
- Repeat essential tests against available real Arena hosts, including the user's Linux runtime with its exact version/runtime recorded.
- Test moving data directories, restart/migration, authentication renewal, archive integrity and removal without user-data loss.
- Measure model/capture overhead independently of functional correctness; don't treat low-FPS success as a performance guarantee.
