import { Context, Effect as E, Layer, pipe } from 'effect';
import type { ActionHash } from '@holochain/client';
import { encodeHashToBase64 } from '@holochain/client';
import type {
  NdoDescriptor,
  NdoOutput,
  NondominiumIdentity,
  NdoInput,
  UpdateLifecycleStageInput,
  NdoTransitionHistoryEvent
} from '@nondominium/shared-types';
import { NdoNotFoundError } from '$lib/errors/ndo.errors';
import { ResourceError } from '$lib/errors/resource.errors';
import {
  ResourceServiceTag,
  ResourceServiceResolved,
  type ResourceService
} from './resource.service';

const GROUPS_KEY = 'ndo_groups_v1';

export interface NdoService {
  getLobbyNdoDescriptors: () => E.Effect<NdoDescriptor[], ResourceError>;
  getNdoDescriptorForSpecActionHash: (
    hash: ActionHash
  ) => E.Effect<NdoDescriptor, ResourceError | NdoNotFoundError>;
  createNdo: (input: NdoInput, groupId: string) => E.Effect<ActionHash, ResourceError>;
  updateLifecycleStage: (input: UpdateLifecycleStageInput) => E.Effect<ActionHash, ResourceError>;
  getNdoTransitionHistory: (ndoHash: ActionHash) => E.Effect<NdoTransitionHistoryEvent[], ResourceError>;
  getGroupNdoDescriptors: (groupId: string) => E.Effect<NdoDescriptor[], ResourceError>;
}

export class NdoServiceTag extends Context.Tag('NdoService')<NdoServiceTag, NdoService>() {}

function ndoToDescriptorFields(
  entry: NondominiumIdentity
): Omit<NdoDescriptor, 'hash' | 'name'> {
  return {
    lifecycle_stage: String(entry.lifecycle_stage),
    property_regime: String(entry.property_regime),
    resource_nature: String(entry.resource_nature),
    description: entry.description ?? null,
    initiator: encodeHashToBase64(entry.initiator),
    created_at: Number(entry.created_at),
    successor_ndo_hash: entry.successor_ndo_hash
      ? encodeHashToBase64(entry.successor_ndo_hash)
      : null,
    hibernation_origin: entry.hibernation_origin ? String(entry.hibernation_origin) : null
  };
}

const NULL_NDO_FIELDS: Omit<NdoDescriptor, 'hash' | 'name'> = {
  lifecycle_stage: null,
  property_regime: null,
  resource_nature: null,
  description: null,
  initiator: null,
  created_at: null,
  successor_ndo_hash: null,
  hibernation_origin: null
};

function mapListingToDescriptor(
  listing: { action_hash: ActionHash; specification: { name: string } },
  ndoByName: Map<string, NondominiumIdentity>
): NdoDescriptor {
  const entry = ndoByName.get(listing.specification.name);
  return {
    hash: encodeHashToBase64(listing.action_hash),
    name: listing.specification.name,
    ...(entry ? ndoToDescriptorFields(entry) : NULL_NDO_FIELDS)
  };
}

/** Descriptor when Layer 0 exists but no ResourceSpecification listing — `hash` is NDO identity. */
function ndoOutputToIdentityDescriptor(ndo: NdoOutput): NdoDescriptor {
  return {
    hash: encodeHashToBase64(ndo.action_hash),
    name: ndo.entry.name,
    ...ndoToDescriptorFields(ndo.entry)
  };
}

const lobbyDescriptors = (
  resource: ResourceService
): E.Effect<NdoDescriptor[], ResourceError> =>
  pipe(
    E.all([resource.getAllResourceSpecifications(), resource.getAllNdos()], {
      concurrency: 'unbounded'
    }),
    E.map(([listings, ndosOut]) => {
      const ndoByName = new Map<string, NondominiumIdentity>(
        ndosOut.ndos.map((n) => [n.entry.name, n.entry])
      );
      return listings.map((listing) => mapListingToDescriptor(listing, ndoByName));
    })
  );

export const NdoServiceLive: Layer.Layer<NdoServiceTag, never, ResourceServiceTag> = Layer.effect(
  NdoServiceTag,
  E.gen(function* () {
    const resource = yield* ResourceServiceTag;
    function getGroupData(groupId: string): { ndoHashes: string[] } {
      try {
        const raw = localStorage.getItem(GROUPS_KEY);
        if (!raw) return { ndoHashes: [] };
        const groups: { id: string; ndoHashes?: string[] }[] = JSON.parse(raw);
        const g = groups.find((x) => x.id === groupId);
        return { ndoHashes: g?.ndoHashes ?? [] };
      } catch {
        return { ndoHashes: [] };
      }
    }

    function getAllGroupNdoHashes(): Set<string> {
      try {
        const raw = localStorage.getItem(GROUPS_KEY);
        if (!raw) return new Set();
        const groups: { id: string; ndoHashes?: string[] }[] = JSON.parse(raw);
        const all = groups.flatMap((g) => g.ndoHashes ?? []);
        return new Set(all);
      } catch {
        return new Set();
      }
    }

    function addNdoHashToGroup(groupId: string, hashB64: string): void {
      try {
        const raw = localStorage.getItem(GROUPS_KEY);
        const groups: { id: string; ndoHashes?: string[] }[] = raw ? JSON.parse(raw) : [];
        const idx = groups.findIndex((x) => x.id === groupId);
        if (idx >= 0) {
          groups[idx].ndoHashes = [...(groups[idx].ndoHashes ?? []), hashB64];
        }
        localStorage.setItem(GROUPS_KEY, JSON.stringify(groups));
      } catch {
        // localStorage not available
      }
    }

    return {
      getLobbyNdoDescriptors: () =>
        E.gen(function* () {
          const allGroupHashes = getAllGroupNdoHashes();
          if (allGroupHashes.size === 0) return [];

          const [listings, ndosOut] = yield* E.all(
            [resource.getAllResourceSpecifications(), resource.getAllNdos()],
            { concurrency: 'unbounded' }
          );

          const ndoIdentityB64ByName = new Map(
            ndosOut.ndos.map((n: NdoOutput) => [
              n.entry.name,
              encodeHashToBase64(n.action_hash)
            ])
          );
          const ndoByActionHashB64 = new Map(
            ndosOut.ndos.map((n: NdoOutput) => [encodeHashToBase64(n.action_hash), n])
          );
          const ndoByName = new Map<string, NondominiumIdentity>(
            ndosOut.ndos.map((n: NdoOutput) => [n.entry.name, n.entry])
          );

          const fromSpecs = listings
            .filter((listing) => {
              const idB64 = ndoIdentityB64ByName.get(listing.specification.name);
              return idB64 !== undefined && allGroupHashes.has(idB64);
            })
            .map((listing) => mapListingToDescriptor(listing, ndoByName));

          const coveredNames = new Set(fromSpecs.map((d) => d.name));

          const orphans: NdoDescriptor[] = [];
          for (const hb64 of allGroupHashes) {
            const ndo = ndoByActionHashB64.get(hb64);
            if (!ndo) continue;
            if (!coveredNames.has(ndo.entry.name)) {
              orphans.push(ndoOutputToIdentityDescriptor(ndo));
              coveredNames.add(ndo.entry.name);
            }
          }

          return [...fromSpecs, ...orphans];
        }),

      getNdoDescriptorForSpecActionHash: (hash) =>
        E.gen(function* () {
          const hashB64 = encodeHashToBase64(hash);

          // getMyNdos returns GetAllNdosOutput { ndos: NdoOutput[] } — the same shape
          // getAllNdos uses, so deserialization is reliable. Check own NDOs first (fast path).
          const myNdosOut = yield* resource.getMyNdos().pipe(
            E.catchAll(() => E.succeed({ ndos: [] as NdoOutput[] }))
          );
          const myNdo = myNdosOut.ndos.find(
            (n: NdoOutput) => encodeHashToBase64(n.action_hash) === hashB64
          );
          if (myNdo) return ndoOutputToIdentityDescriptor(myNdo);

          // Fallback: fetch everything for NDOs created by other agents or old ResourceSpec flow
          const [listings, ndosOut] = yield* E.all(
            [resource.getAllResourceSpecifications(), resource.getAllNdos()],
            { concurrency: 'unbounded' }
          );
          const ndoByName = new Map<string, NondominiumIdentity>(
            ndosOut.ndos.map((n: NdoOutput) => [n.entry.name, n.entry])
          );

          // Match by ResourceSpec action hash (old ResourceSpec-backed flow)
          const foundSpec = listings.find(
            (l) => encodeHashToBase64(l.action_hash) === hashB64
          );
          if (foundSpec) return mapListingToDescriptor(foundSpec, ndoByName);

          // Match by Layer-0 action hash (new flow, any agent's NDO)
          const foundNdo = ndosOut.ndos.find(
            (n: NdoOutput) => encodeHashToBase64(n.action_hash) === hashB64
          );
          if (foundNdo) return ndoOutputToIdentityDescriptor(foundNdo);

          return yield* E.fail(new NdoNotFoundError({ hash: hashB64 }));
        }),

      createNdo: (input, groupId) =>
        resource.createNdo(input).pipe(
          E.tap((ndoOut) =>
            E.sync(() => addNdoHashToGroup(groupId, encodeHashToBase64(ndoOut.action_hash)))
          ),
          E.map((ndoOut) => ndoOut.action_hash)
        ),

      updateLifecycleStage: (input) => resource.updateLifecycleStage(input),

      getNdoTransitionHistory: (ndoHash) => resource.getNdoTransitionHistory(ndoHash),

      getGroupNdoDescriptors: (groupId) =>
        E.gen(function* () {
          const { ndoHashes } = getGroupData(groupId);
          if (ndoHashes.length === 0) return [];
          const groupSet = new Set(ndoHashes);

          const [listings, ndosOut] = yield* E.all(
            [resource.getAllResourceSpecifications(), resource.getAllNdos()],
            { concurrency: 'unbounded' }
          );

          const ndoIdentityB64ByName = new Map(
            ndosOut.ndos.map((n: NdoOutput) => [
              n.entry.name,
              encodeHashToBase64(n.action_hash)
            ])
          );
          const ndoByActionHashB64 = new Map(
            ndosOut.ndos.map((n: NdoOutput) => [encodeHashToBase64(n.action_hash), n])
          );
          const ndoByName = new Map<string, NondominiumIdentity>(
            ndosOut.ndos.map((n: NdoOutput) => [n.entry.name, n.entry])
          );

          const fromSpecs = listings
            .filter((listing) => {
              const idB64 = ndoIdentityB64ByName.get(listing.specification.name);
              return idB64 !== undefined && groupSet.has(idB64);
            })
            .map((listing) => mapListingToDescriptor(listing, ndoByName));

          const coveredNames = new Set(fromSpecs.map((d) => d.name));

          const orphans: NdoDescriptor[] = [];
          for (const hb64 of groupSet) {
            const ndo = ndoByActionHashB64.get(hb64);
            if (!ndo) continue;
            if (!coveredNames.has(ndo.entry.name)) {
              orphans.push(ndoOutputToIdentityDescriptor(ndo));
              coveredNames.add(ndo.entry.name);
            }
          }

          return [...fromSpecs, ...orphans];
        })
    } satisfies NdoService;
  })
);

export const NdoServiceResolved: Layer.Layer<NdoServiceTag> = NdoServiceLive.pipe(
  Layer.provide(ResourceServiceResolved)
);
