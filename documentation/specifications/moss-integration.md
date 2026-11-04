# Moss Integration

**Status:** v0.1.0 pilot, in progress. The tool scaffold and dev config (#163) and the Moss group context (#164) are implemented. NDOs as assets (#165) follows. Supersedes the "Moss Integration Contract" in [lobby-architecture.md](lobby-architecture.md) §9 where they differ.

Moss is the Weave host (lightningrodlabs/moss). In the v0.1.0 pilot Nondominium runs as a **tool** inside Moss, started with the `weave` CLI in dev mode. The standalone build (Lobby DNA, Group DNA, invite codes) keeps compiling and running unchanged; the pilot ships Moss only.

## Decisions

- The pilot runs `@theweave/cli` in dev mode with a shared dev config and our own bootstrap and relay. Not the Moss app, not a curation list.
- Inside Moss the Moss group is the federation layer. There is one Nondominium group per Moss group: the tool instance's `group` cell.
- Each NDO is a clone cell of the `ndo` role. Profiles come from Moss, roles from `myAccountabilitiesPerGroup()`, NDOs are exposed as Moss assets.
- v0.1.0 ships no work context.

## Running the tool in dev mode

Moss is built on Holochain 0.7.1 only in its `0.16` release candidates. The pilot uses `@theweave/cli` `0.16.0-rc.5`, which downloads a patched Holochain `0.7.1-mdns.8` that cannot see stock Holochain peers.

```bash
bun run build:happ          # inside nix develop, produces workdir/nondominium.happ
bun run moss:install        # installs weave/ (Electron and the weave CLI), once
bun run tool-dev            # Vite on :8888 plus two Moss windows, Alice and Bob
bun run tool-dev-1          # the same with Alice only
```

`weave/` is a separate package outside the root workspaces so that CI and the standalone build never install Electron. `weave/weave.dev.config.ts` defines one group, `Nondominium Pilot`, created by agent 1 and joined by agent 2, with the tool served from `localhost:8888` and the `.happ` from `workdir/`.

Click the group in the Moss sidebar, then the Nondominium tool.

**Two machines.** Every `weave` call must pass the same `--bootstrap-url` and `--relay-url` of a server both machines reach (`kitsune2-bootstrap-srv` serves the relay on `/relay`), and the same CLI version. The group `networkSeed` in the shared config is what puts both agents in the same group.

### Gotchas

- `weave` loads the config through `ts-node` inside Electron. It needs TypeScript 5.x (TypeScript 7 has no JS API and the CLI crashes), `tslib` (not declared by the CLI) and a tsconfig with `"module": "commonjs"`. `weave/package.json` and `weave/tsconfig.json` carry all three.
- A tool served from localhost must call `initializeHotReload()` before `WeaveClient.connect()`, or `connect()` waits forever. `ui/src/lib/moss/connect.ts` does it when `detectHost` sees the dev-mode iframe.
- The group icon is limited to about 200 KB. `ui/static/icon.png` is a 128 px version of the logo.
- `weave` opens an Electron window per agent. On a shared desktop, a nested X server keeps them contained: `Xephyr :99 -screen 1500x950 &` then `DISPLAY=:99 bun run tool-dev`.

## What the Moss manifest does to our roles

Verified in the #162 spike (see [issue #162](https://github.com/Sensorica/nondominium/issues/162)). Moss installs `workdir/happ.yaml` unchanged, deferred roles included, but it installs `group` and `ndo` as **provisioned** cells next to `lobby`, `nondominium` and `hrea`. So every tool instance already has its own `group` cell, which is the instance's group DHT and the one Nondominium group of that Moss group, and an unused `ndo` cell. NDO clones come on top. Clone limits of 64 and 512 were not refused.

## The UI seam

```
hc-connect.ts  connectHolochainClient()
   detectCurrentHost()   moss/host.ts         standalone, or Moss (with or without hot reload)
   connectMoss()         moss/connect.ts      WeaveClient.connect + applet client
   standalone modes      launcher, manifest, env   (unchanged)
```

- `moss/host.ts` decides from the page itself: the `applet://` protocol or an injected `__WEAVE_API__` is a packaged tool; a dev-build iframe carrying Moss's iframe-kind hash is a tool in dev mode; anything else is standalone. The standalone path is not touched when the host is not Moss.
- `moss/connect.ts` runs hot reload when needed, connects the `WeaveClient` with our `AppletServices`, and returns the applet client Moss hands the tool, the group hash and the applet hash. Inside Moss the client signs through Moss, so none of the standalone signing-credential code runs.
- `moss/applet-services.ts` is the `AppletServices` object. In #163 it declares no creatables and no assets; #165 fills `search` and `getAssetInfo`.
- The connection result carries `moss` so later slices reach the `WeaveClient` through the client service (`holochainClient.moss`).

Moss mode is a connection mode (`HolochainConnectionMode` gains `'moss'`). The cross-group view is not implemented: a cross-group render throws.

## The Moss group context (#164)

Inside Moss the standalone Lobby model is replaced behind one seam, `LobbyServiceResolved` in `lobby.service.ts`: it is `MossLobbyServiceLive` when the page is hosted by Moss and `LobbyServiceLive` otherwise. Stores, `NdoService` and components see the same `LobbyService` interface in both.

| Concern | Standalone | Inside Moss |
|---|---|---|
| Groups | Lobby DNA announces clones of the Group DNA | One group: the tool instance's provisioned `group` cell (`MOSS_GROUP_ID = 'moss'`) |
| Joining | Invite code or link | Automatic: the tool installer (`toolInstaller`) creates the `GroupProfile`, named after the Moss group; every other member waits for it to gossip, then calls `join_group` |
| Profile | `LobbyUserProfile` form, localStorage | `profilesClient`, mapped to the same `LobbyUserProfile` shape |
| Role | none | `myAccountabilitiesPerGroup()`, strongest of Member, Steward, Progenitor, shown in the sidebar |
| NDO clone | `AppWebsocket.createCloneCell` | `WeaveClient.createCloneCell(req, PUBLIC_NDO_CLONES)` |
| Discovery of NDOs | `NdoAnchor` in the group cell | same |

Create group, join group and invite links are hidden in Moss (`mossStore.isMoss`), and the service refuses them with `Groups are managed by Moss`. The Lobby DHT calls answer with nothing: every tool instance is its own network, so there is no shared lobby to announce to.

Code: `ui/src/lib/moss/` (`group-cell.ts`, `profile.ts`, `ndo-clone.ts`), `ui/src/lib/services/zomes/moss-lobby.ts` (the service, with injected dependencies so it runs in a unit test against a mocked WeaveClient) and `ui/src/lib/stores/moss.store.svelte.ts`.

**NDO clones are not public to the Moss group (`PUBLIC_NDO_CLONES = false`).** `createCloneCell(req, true)` registers the clone in the Moss group DNA so other members and always-online nodes can install it. Moss `0.16.0-rc.5` cannot register a clone that carries DNA properties: `join_cloned_cell` declares `properties: Option<SerializedBytes>` and the renderer forwards the properties object untouched, so the call fails with a Deserialize error and leaves an orphan cell. NDO clones need their properties (ADR-013). Discovery does not depend on the registration, since peers re-derive the clone from the `NdoAnchor` in the group cell, but an always-online node (wdocker) will not host the NDO cells until this flips. Flip `PUBLIC_NDO_CLONES` once Moss accepts properties.

## Open items

- `weaveClient.createCloneCell(req, true)` fails whenever `req.modifiers.properties` is set, which NDO clones need (see above and the #162 result).
- `AppletServices` in `@theweave/api` `0.7.0-rc.3` has `getAssetInfo`, `search` and `creatables`. Opening an asset is not a method on it: Moss renders the tool with an `asset` view (`renderInfo.view.type === 'asset'`), and the tool calls `weaveClient.openAsset` to open other assets.
