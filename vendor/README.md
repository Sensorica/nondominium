# Vendored packages

`vendor/hrea` is the hREA git submodule the hApp builds its `hrea` DNA from; nothing in this README concerns it. The files beside it are npm packages the UI installs from disk.

## `@valueflows/vf-graphql-holochain` 0.700.0-rc.0

The hREA GraphQL adapter that pairs with hREA `happ-0.5.0-beta.1` (Holochain 0.7, `@holochain/client` ^0.21). npm still serves `0.600.0-rc.0`, the 0.6 line, so the UI installs this tarball through a `file:` dependency in `ui/package.json` instead (#153, upstream h-REA/hREA#412). It is the same file, byte for byte, that hAppenings Requests and Offers vendors.

| | |
|---|---|
| File | `valueflows-vf-graphql-holochain-0.700.0-rc.0.tgz` |
| sha256 | `e64163912e87ca2271660806c263e95c8208dfd99a660042bfee5764fba3d2fe` (also in the `.sha256` file beside it) |
| tar stream sha256 | `fac8a221f0a4c07d643ff43068cf48e8391cad09285c36ea4eb843d1f1d0f00d` (`gzip -dc <tgz> \| sha256sum`, the value a rebuild reproduces) |
| Source | h-REA/hREA tag `happ-0.5.0-beta.1`, commit `79c8d4fb98c4f7f9a8cf3f7dd69690d6d1334d85`, `modules/vf-graphql-holochain` |
| Built with | node 24.13.0, npm 11.6.2, TypeScript as resolved by the module's `^5.3.3`; hREA's `scripts/verify-purpose-schema.mjs` passed against the build |

Check it:

```bash
cd vendor && sha256sum -c valueflows-vf-graphql-holochain-0.700.0-rc.0.tgz.sha256
```

Rebuild it from source. Extract the module from the tag rather than building it inside a full hREA checkout: there npm 11 resolves the yarn workspace and stops with `EUNSUPPORTEDPROTOCOL`, because `clients/acceptance` declares a `link:` dependency.

```bash
git clone https://github.com/h-REA/hREA
mkdir adapter
git -C hREA archive happ-0.5.0-beta.1 modules/vf-graphql-holochain | tar -x -C adapter
cd adapter/modules/vf-graphql-holochain
npm install --ignore-scripts
npm run build
cd build && npm pack
gzip -dc valueflows-vf-graphql-holochain-0.700.0-rc.0.tgz | sha256sum
```

Compare the last line with the tar stream sha256 in the table, not the tarball sha256 with the one in the `.sha256` file. The tar stream is what a rebuild reproduces; the gzip layer around it depends on the node and npm that pack it, so identical contents can give a different tarball hash. The tarball hash matched only on a rebuild with node 24.13.0 and npm 11.6.2, the toolchain it was packed with; do not expect it to match elsewhere.

hREA does not ship a pack script at `happ-0.5.0-beta.1`. One is proposed upstream in h-REA/hREA#421 (a draft, not merged): `scripts/pack-adapter.sh` type-checks the module, builds it, runs the schema check and writes the tarball with its `.sha256`, and the release workflow attaches the result to every `happ-*` release. Its `HREA_ROOT` form packs an older checkout with the newer script, `HREA_ROOT=<checkout of happ-0.5.0-beta.1> scripts/pack-adapter.sh <out-dir>`, and expects that checkout's workspace dependencies installed (`yarn install`). Until it lands, the commands above are the rebuild.

Once hREA attaches the tarball to its release, its asset can be fetched from `https://github.com/h-REA/hREA/releases/download/happ-0.5.0-beta.1/valueflows-vf-graphql-holochain-0.700.0-rc.0.tgz`; compare its tar stream sha256 with the one in the table before replacing this copy, since a tarball packed on another node or npm can carry a different gzip hash over the same contents.

**Client coupling.** The adapter depends on `@holochain/client` ^0.21.0, which speaks to a Holochain 0.7 conductor only, while the UI itself still pins ^0.20.0 for the 0.6 conductor. bun therefore installs a second client nested under the adapter. Both line up again when the UI moves to Holochain 0.7 (#134); until then the adapter typechecks and installs but cannot talk to a running 0.6 conductor.

**Dropping it.** When `npm view @valueflows/vf-graphql-holochain versions` lists a 0.700 release, set the dependency in `ui/package.json` back to that version range, run `bun install`, commit `bun.lock`, and delete the tarball, its `.sha256` and this section.
